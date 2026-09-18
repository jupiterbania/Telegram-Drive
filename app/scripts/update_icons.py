import os
import shutil
import base64
from PIL import Image, ImageDraw

app_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
public_dir = os.path.join(app_dir, 'public')
icons_dir = os.path.join(app_dir, 'src-tauri', 'icons')
app_icon_path = os.path.join(public_dir, 'App_icon.png')
inapp_logo_path = os.path.join(public_dir, 'inapp_logo.png')

# 1. Update logo.png and logo.ico in src-tauri/icons
shutil.copyfile(os.path.join(icons_dir, 'icon.ico'), os.path.join(icons_dir, 'logo.ico'))
shutil.copyfile(os.path.join(icons_dir, '64x64.png'), os.path.join(icons_dir, 'logo.png'))

# 2. Generate and sync all Android icons from App_icon.png
if os.path.exists(app_icon_path):
    src_img = Image.open(app_icon_path).convert('RGBA')

    densities = {
        'mdpi': (48, 108),
        'hdpi': (72, 162),
        'xhdpi': (96, 216),
        'xxhdpi': (144, 324),
        'xxxhdpi': (192, 432),
    }

    target_roots = [
        os.path.join(app_dir, 'android-overrides', 'app', 'src', 'main', 'res'),
        os.path.join(app_dir, 'src-tauri', 'gen', 'android', 'app', 'src', 'main', 'res'),
        os.path.join(app_dir, 'src-tauri', 'icons', 'android'),
    ]

    generated_icons = {}
    for density, (icon_size, fg_size) in densities.items():
        base_icon = src_img.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
        
        # Squircle mask (4x supersampled)
        scale = 4
        mask_size = icon_size * scale
        mask = Image.new('L', (mask_size, mask_size), 0)
        draw = ImageDraw.Draw(mask)
        draw.rounded_rectangle([0, 0, mask_size - 1, mask_size - 1], radius=int(mask_size * 0.20), fill=255)
        mask = mask.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
        launcher_img = base_icon.copy()
        launcher_img.putalpha(mask)
        generated_icons[(density, 'ic_launcher.png')] = launcher_img

        # Circle mask (4x supersampled)
        mask_round = Image.new('L', (mask_size, mask_size), 0)
        draw_round = ImageDraw.Draw(mask_round)
        draw_round.ellipse([0, 0, mask_size - 1, mask_size - 1], fill=255)
        mask_round = mask_round.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
        round_img = base_icon.copy()
        round_img.putalpha(mask_round)
        generated_icons[(density, 'ic_launcher_round.png')] = round_img

        # Adaptive foreground
        fg_img = src_img.resize((fg_size, fg_size), Image.Resampling.LANCZOS)
        generated_icons[(density, 'ic_launcher_foreground.png')] = fg_img

    xml_adaptive = '''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
'''
    xml_background = '''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#011240</color>
</resources>
'''

    for root_res in target_roots:
        os.makedirs(root_res, exist_ok=True)
        for (density, fname), img in generated_icons.items():
            density_dir = os.path.join(root_res, f'mipmap-{density}')
            os.makedirs(density_dir, exist_ok=True)
            img.save(os.path.join(density_dir, fname), format='PNG', optimize=True)
            
        anydpi_dir = os.path.join(root_res, 'mipmap-anydpi-v26')
        os.makedirs(anydpi_dir, exist_ok=True)
        with open(os.path.join(anydpi_dir, 'ic_launcher.xml'), 'w', encoding='utf-8') as f:
            f.write(xml_adaptive)
        with open(os.path.join(anydpi_dir, 'ic_launcher_round.xml'), 'w', encoding='utf-8') as f:
            f.write(xml_adaptive)
            
        values_dir = os.path.join(root_res, 'values')
        os.makedirs(values_dir, exist_ok=True)
        with open(os.path.join(values_dir, 'ic_launcher_background.xml'), 'w', encoding='utf-8') as f:
            f.write(xml_background)

    # 3. Create Android TV banner (320x180) from App_icon.png
    bg_color = src_img.getpixel((0, 0))[:3]
    tv_banner = Image.new('RGBA', (320, 180), bg_color + (255,))
    icon_resized = src_img.copy()
    icon_resized.thumbnail((140, 140), Image.Resampling.LANCZOS)
    paste_x = (320 - icon_resized.width) // 2
    paste_y = (180 - icon_resized.height) // 2
    tv_banner.paste(icon_resized, (paste_x, paste_y), icon_resized if icon_resized.mode == 'RGBA' else None)
    
    for root_res in target_roots:
        tv_banner_dir = os.path.join(root_res, 'drawable-xhdpi')
        os.makedirs(tv_banner_dir, exist_ok=True)
        tv_banner.convert('RGB').save(os.path.join(tv_banner_dir, 'tv_banner.png'), quality=95)
    print('Generated Android mipmaps, adaptive icons, and tv_banner.png successfully')

    # Copy favicon & browser image
    shutil.copyfile(os.path.join(icons_dir, 'icon.ico'), os.path.join(public_dir, 'favicon.ico'))
    shutil.copyfile(os.path.join(icons_dir, '32x32.png'), os.path.join(public_dir, 'favicon.png'))
    shutil.copyfile(app_icon_path, os.path.join(public_dir, 'image.png'))
    print('Generated public/favicon.ico, favicon.png, image.png')

# 4. In-app logo from inapp_logo.png
if os.path.exists(inapp_logo_path):
    shutil.copyfile(inapp_logo_path, os.path.join(public_dir, 'image copy.png'))
    inapp_img = Image.open(inapp_logo_path).convert('RGBA')
    inapp_img.save(os.path.join(public_dir, 'logo.png'))

    with open(inapp_logo_path, 'rb') as f:
        b64 = base64.b64encode(f.read()).decode('utf-8')

    svg_content = f'''<svg width="{inapp_img.width}" height="{inapp_img.height}" viewBox="0 0 {inapp_img.width} {inapp_img.height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <image href="data:image/png;base64,{b64}" width="{inapp_img.width}" height="{inapp_img.height}" preserveAspectRatio="xMidYMid meet" />
</svg>
'''
    with open(os.path.join(public_dir, 'logo.svg'), 'w', encoding='utf-8') as f:
        f.write(svg_content)
    print('Updated public/image copy.png, logo.png, logo.svg from inapp_logo.png successfully')

# Clean up any obsolete vector icon files
for root_res in [os.path.join(app_dir, 'src-tauri', 'gen', 'android', 'app', 'src', 'main', 'res')]:
    for obs in [
        os.path.join(root_res, 'drawable', 'ic_launcher_background.xml'),
        os.path.join(root_res, 'drawable-v24', 'ic_launcher_foreground.xml')
    ]:
        if os.path.exists(obs):
            os.remove(obs)
            print(f'Removed obsolete file: {obs}')

print('Icon synchronization completed successfully!')
