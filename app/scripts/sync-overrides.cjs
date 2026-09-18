const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const srcGen = path.join(root, 'src-tauri', 'gen', 'android', 'app', 'src', 'main');
const srcOverrides = path.join(root, 'android-overrides', 'app', 'src', 'main');

fs.copyFileSync(
  path.join(srcGen, 'java', 'com', 'cameronamer', 'telegramdrive', 'MainActivity.kt'),
  path.join(srcOverrides, 'java', 'com', 'cameronamer', 'telegramdrive', 'MainActivity.kt')
);
console.log('Copied MainActivity.kt to android-overrides');

const resDirs = fs.readdirSync(path.join(srcGen, 'res'));
for (const dir of resDirs) {
  if (dir.startsWith('mipmap-')) {
    fs.cpSync(path.join(srcGen, 'res', dir), path.join(srcOverrides, 'res', dir), { recursive: true, force: true });
    console.log('Synced ' + dir + ' to android-overrides');
  }
}
