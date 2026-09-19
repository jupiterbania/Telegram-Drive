export function renderRecoveryHtml(appName: string): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${appName} - License Self-Service & Help Portal</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: #080c14;
      color: #f1f5f9;
    }
    .mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="min-h-screen flex flex-col justify-between antialiased selection:bg-cyan-500 selection:text-black bg-[#080c14]">

  <!-- Header Navigation -->
  <header class="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-3.5 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-extrabold shadow-lg shadow-cyan-500/20 text-sm">
        TG
      </div>
      <div>
        <h1 class="text-sm font-bold text-white tracking-tight">${appName}</h1>
        <p class="text-[11px] text-slate-400">License Self-Service & Recovery</p>
      </div>
    </div>
    
    <div class="flex items-center gap-3 sm:gap-4">
      <button
        type="button"
        onclick="openHelpModal()"
        class="text-xs font-bold text-slate-300 hover:text-cyan-400 transition-colors flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 px-3 py-1.5 rounded-lg shadow-sm"
      >
        <span>Need Help?</span>
        <span class="text-cyan-400">&rarr;</span>
      </button>
      <a
        href="https://eveyka.lemonsqueezy.com"
        target="_blank"
        class="hidden sm:inline-flex text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
      >
        Buy License &rarr;
      </a>
    </div>
  </header>

  <main class="flex-1 flex items-center justify-center p-4 sm:p-6">
    <div class="w-full max-w-md">

      <!-- STEP 1: Enter Email -->
      <div id="stepEmail" class="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
        <div class="text-center space-y-2">
          <div class="h-14 w-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mx-auto flex items-center justify-center text-2xl shadow-lg shadow-cyan-500/10">
            🔑
          </div>
          <h2 class="text-xl font-extrabold text-white tracking-tight">Find Your License Key</h2>
          <p class="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
            Enter the email address you used during purchase to receive a 6-digit confirmation code.
          </p>
        </div>

        <div id="step1Error" class="hidden text-xs bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3.5 rounded-xl space-y-1"></div>

        <form id="emailForm" onsubmit="handleRequestOtp(event)" class="space-y-4">
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-300">Purchase Email</label>
            <input
              type="email"
              id="inputEmail"
              required
              placeholder="you@example.com"
              class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-medium"
            >
          </div>

          <button
            type="submit"
            id="btnRequestOtp"
            class="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-cyan-500/25 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <span>Send Confirmation Code</span>
          </button>
        </form>

        <div class="flex items-center justify-between text-[11px] text-slate-500 pt-1">
          <span>🔒 Protected by email OTP</span>
          <button type="button" onclick="openHelpModal()" class="text-cyan-400 hover:underline font-semibold">
            Contact Support &rarr;
          </button>
        </div>
      </div>

      <!-- STEP 2: Enter 6-Digit OTP -->
      <div id="stepOtp" class="hidden rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
        <div class="text-center space-y-2">
          <div class="h-14 w-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mx-auto flex items-center justify-center text-2xl shadow-lg shadow-cyan-500/10">
            ✉️
          </div>
          <h2 class="text-xl font-extrabold text-white tracking-tight">Enter Verification Code</h2>
          <p class="text-xs text-slate-400">
            We sent a 6-digit code to:<br>
            <span id="displayEmail" class="text-cyan-400 font-bold"></span>
          </p>
        </div>

        <div id="step2Error" class="hidden text-xs bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3.5 rounded-xl text-center"></div>

        <form id="otpForm" onsubmit="handleVerifyOtp(event)" class="space-y-4">
          <div>
            <input
              type="text"
              id="inputOtp"
              required
              maxlength="6"
              pattern="[0-9]{6}"
              placeholder="000000"
              class="w-full text-center mono tracking-[0.5em] text-3xl font-extrabold bg-slate-950 border border-slate-700 rounded-xl px-4 py-3.5 text-cyan-400 placeholder-slate-700 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
            >
          </div>

          <button
            type="submit"
            id="btnVerifyOtp"
            class="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-cyan-500/25 active:scale-[0.98]"
          >
            Verify & Reveal License
          </button>

          <div class="flex items-center justify-between text-xs text-slate-400 pt-1">
            <button type="button" onclick="backToStep1()" class="hover:text-white transition-colors">
              &larr; Change Email
            </button>
            <button type="button" id="btnResendOtp" onclick="handleResendOtp()" class="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors disabled:opacity-50">
              Resend Code
            </button>
          </div>
        </form>
      </div>

      <!-- STEP 3: License & Device Management View -->
      <div id="stepResult" class="hidden space-y-4">
        <div class="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-7 shadow-2xl backdrop-blur-xl space-y-5">
          <div class="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <span id="badgePlan" class="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">LIFETIME</span>
              <h3 id="resCustomerName" class="text-base font-bold text-white mt-1.5">Supporter Access</h3>
            </div>
            <button onclick="location.reload()" class="text-xs text-slate-400 hover:text-white transition-colors">
              Sign Out
            </button>
          </div>

          <!-- License Key Box -->
          <div class="space-y-1.5">
            <label class="text-xs font-bold text-slate-300">Your Official License Key</label>
            <div class="flex items-center gap-2 bg-slate-950 border border-cyan-500/40 rounded-xl p-3">
              <span id="resLicenseKey" class="mono font-bold text-sm text-cyan-300 flex-1 select-all break-all">TGDRV-XXXX-XXXX-XXXX</span>
              <button id="btnCopy" onclick="copyLicenseKey()" class="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all flex items-center gap-1 flex-shrink-0">
                <span>Copy</span>
              </button>
            </div>
          </div>

          <!-- Connected Devices Section -->
          <div class="space-y-3 pt-2">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold text-slate-300">Authorized Devices (<span id="devCount">0</span>/<span id="devMax">2</span>)</label>
              <span class="text-[11px] text-slate-500">Max 1 PC + 1 Mobile</span>
            </div>

            <div id="devicesContainer" class="space-y-2">
              <!-- Rendered via JS -->
            </div>
          </div>
        </div>

        <!-- How to Activate card -->
        <div class="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-xs text-slate-400 space-y-1.5">
          <p class="font-bold text-slate-300">How to Activate in App:</p>
          <ol class="list-decimal pl-4 space-y-1 text-slate-400">
            <li>Open the <strong>TG Drive</strong> app on your PC or Phone.</li>
            <li>Navigate to <strong>Settings</strong> &rarr; <strong>Supporter / License</strong>.</li>
            <li>Paste your License Key and click <strong>Activate</strong>.</li>
          </ol>
        </div>
      </div>

    </div>
  </main>

  <!-- ========================================================= -->
  <!-- HELP & SUPPORT MODAL (With Direct Telegram @Theexposes)    -->
  <!-- ========================================================= -->
  <div id="helpModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md hidden animate-fade-in">
    <div class="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-6 sm:p-7 shadow-2xl text-slate-200 max-h-[90vh] overflow-y-auto space-y-6">
      
      <!-- Modal Header -->
      <div class="flex items-center justify-between pb-4 border-b border-slate-800">
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-xl text-cyan-400 font-bold">
            💡
          </div>
          <div>
            <h3 class="text-base font-extrabold text-white">Help & Support Guide</h3>
            <p class="text-xs text-slate-400">Official assistance for TG Drive users</p>
          </div>
        </div>
        <button onclick="closeHelpModal()" class="h-8 w-8 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold">
          ✕
        </button>
      </div>

      <!-- Instant Contact Buttons (Highlighted) -->
      <div class="space-y-3">
        <p class="text-xs font-bold uppercase tracking-wider text-cyan-400">Need Immediate Assistance?</p>
        
        <!-- Telegram Direct Button -->
        <a
          href="https://t.me/Theexposes"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-sky-500/15 via-blue-600/15 to-cyan-500/15 border border-sky-500/40 hover:border-sky-400 transition-all group"
        >
          <div class="flex items-center gap-3">
            <div class="h-11 w-11 rounded-xl bg-sky-500 flex items-center justify-center text-white text-xl shadow-lg shadow-sky-500/30">
              ✈️
            </div>
            <div>
              <p class="text-sm font-extrabold text-white group-hover:text-sky-300 transition-colors">
                Chat on Telegram (@Theexposes)
              </p>
              <p class="text-xs text-sky-200/80 mt-0.5">
                Click to open direct chat in Telegram app
              </p>
            </div>
          </div>
          <span class="text-sky-400 font-bold text-sm group-hover:translate-x-1 transition-transform">&rarr;</span>
        </a>

        <!-- Email Support Button -->
        <a
          href="mailto:tgdrive.official@gmail.com?subject=TG%20Drive%20License%20Help%20Request"
          class="flex items-center justify-between p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all group"
        >
          <div class="flex items-center gap-3">
            <div class="h-11 w-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 text-xl">
              ✉️
            </div>
            <div>
              <p class="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                Send Support Email
              </p>
              <p class="text-xs text-slate-400 mt-0.5">
                tgdrive.official@gmail.com
              </p>
            </div>
          </div>
          <span class="text-slate-400 font-bold text-sm group-hover:translate-x-1 transition-transform">&rarr;</span>
        </a>
      </div>

      <!-- Step-by-Step FAQ / Guide Accordion -->
      <div class="space-y-3 pt-2 border-t border-slate-800">
        <p class="text-xs font-bold uppercase tracking-wider text-slate-400">Frequently Asked Questions</p>

        <div class="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5 space-y-1">
          <p class="text-xs font-bold text-white">1. How do I recover my license key?</p>
          <p class="text-xs text-slate-400 leading-relaxed">
            Enter the email you used during checkout on the main screen. We will instantly email you a 6-digit code. Enter the code to view your key.
          </p>
        </div>

        <div class="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5 space-y-1">
          <p class="text-xs font-bold text-white">2. How to transfer license to a new PC or Phone?</p>
          <p class="text-xs text-slate-400 leading-relaxed">
            After verifying your email, your connected devices will be listed. Simply click <strong class="text-rose-400">Deactivate</strong> next to your old device to free up a slot, then paste your key into your new device.
          </p>
        </div>

        <div class="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5 space-y-1">
          <p class="text-xs font-bold text-white">3. Did not receive the confirmation code?</p>
          <p class="text-xs text-slate-400 leading-relaxed">
            Check your Gmail <strong>Spam</strong> or <strong>Promotions</strong> folder. Make sure you entered the exact email address used during purchase.
          </p>
        </div>
      </div>

      <!-- Close Button -->
      <button
        onclick="closeHelpModal()"
        class="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs border border-slate-800 transition-colors"
      >
        Close Guide
      </button>

    </div>
  </div>

  <!-- Footer -->
  <footer class="py-4 text-center text-xs text-slate-600 border-t border-slate-800/40 flex items-center justify-center gap-4">
    <span>&copy; ${appName}. All rights reserved.</span>
    <span>&bull;</span>
    <a href="https://t.me/Theexposes" target="_blank" class="text-cyan-500/80 hover:text-cyan-400 font-semibold">
      Telegram Support: @Theexposes
    </a>
  </footer>

  <script>
    let currentEmail = '';
    let currentSessionToken = '';
    let currentLicenses = [];
    let resendTimer = null;

    function openHelpModal() {
      document.getElementById('helpModal').classList.remove('hidden');
    }

    function closeHelpModal() {
      document.getElementById('helpModal').classList.add('hidden');
    }

    async function handleRequestOtp(e) {
      e.preventDefault();
      const email = document.getElementById('inputEmail').value.trim();
      const errBox = document.getElementById('step1Error');
      const btn = document.getElementById('btnRequestOtp');
      
      errBox.classList.add('hidden');
      btn.disabled = true;
      btn.innerHTML = '<span>Checking account...</span>';

      try {
        const res = await fetch('/api/license/request-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          errBox.innerHTML = \`
            <div class="flex items-start gap-2.5">
              <span class="text-base">⚠️</span>
              <div>
                <p class="font-bold text-rose-300">\${escapeHtml(data.error || 'No license found for this email.')}</p>
                <div class="mt-2 flex flex-wrap gap-2 text-[11px]">
                  <a href="https://eveyka.lemonsqueezy.com" target="_blank" class="text-cyan-400 underline font-bold">Buy License &rarr;</a>
                  <span class="text-slate-500">&bull;</span>
                  <button type="button" onclick="openHelpModal()" class="text-sky-300 underline font-semibold">Contact @Theexposes</button>
                </div>
              </div>
            </div>
          \`;
          errBox.classList.remove('hidden');
          btn.disabled = false;
          btn.innerHTML = '<span>Send Confirmation Code</span>';
          return;
        }

        currentEmail = email;
        document.getElementById('displayEmail').innerText = email;
        document.getElementById('stepEmail').classList.add('hidden');
        document.getElementById('stepOtp').classList.remove('hidden');
        document.getElementById('inputOtp').focus();
        startResendCooldown();
      } catch (err) {
        errBox.innerHTML = '<p class="font-bold">Network connection error. Please try again.</p>';
        errBox.classList.remove('hidden');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>Send Confirmation Code</span>';
      }
    }

    async function handleVerifyOtp(e) {
      e.preventDefault();
      const otp = document.getElementById('inputOtp').value.trim();
      const errBox = document.getElementById('step2Error');
      const btn = document.getElementById('btnVerifyOtp');

      errBox.classList.add('hidden');
      btn.disabled = true;
      btn.innerText = 'Verifying...';

      try {
        const res = await fetch('/api/license/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: currentEmail, otp })
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          errBox.innerText = data.error || 'Invalid or expired verification code.';
          errBox.classList.remove('hidden');
          btn.disabled = false;
          btn.innerText = 'Verify & Reveal License';
          return;
        }

        currentSessionToken = data.session_token;
        currentLicenses = data.licenses || [];
        renderLicenseDashboard();
      } catch (err) {
        errBox.innerText = 'Network error. Please try again.';
        errBox.classList.remove('hidden');
      } finally {
        btn.disabled = false;
        btn.innerText = 'Verify & Reveal License';
      }
    }

    function renderLicenseDashboard() {
      document.getElementById('stepOtp').classList.add('hidden');
      document.getElementById('stepResult').classList.remove('hidden');

      if (!currentLicenses || currentLicenses.length === 0) return;
      const primary = currentLicenses[0];

      document.getElementById('resCustomerName').innerText = primary.customer_name || 'Supporter Access';
      document.getElementById('resLicenseKey').innerText = primary.license_key;
      document.getElementById('badgePlan').innerText = (primary.plan_type || 'LIFETIME').toUpperCase();
      
      const devices = primary.devices || [];
      const activeDevices = devices.filter(d => d.is_revoked === 0);
      document.getElementById('devCount').innerText = activeDevices.length;
      document.getElementById('devMax').innerText = primary.max_devices || 2;

      const container = document.getElementById('devicesContainer');
      container.innerHTML = '';

      if (activeDevices.length === 0) {
        container.innerHTML = '<p class="text-xs text-slate-500 py-3 italic text-center bg-slate-950/40 rounded-xl border border-slate-800/60">No devices activated yet. Paste your key into the app to activate!</p>';
        return;
      }

      activeDevices.forEach(dev => {
        const isMobile = dev.platform === 'android' || dev.platform === 'ios';
        const icon = isMobile ? '📱' : '💻';
        const dateStr = new Date(dev.activated_at * 1000).toLocaleDateString();

        const card = document.createElement('div');
        card.className = 'flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs';
        card.innerHTML = \`
          <div class="flex items-center gap-3">
            <span class="text-base">\${icon}</span>
            <div>
              <p class="font-bold text-slate-200">\${escapeHtml(dev.device_name)}</p>
              <p class="text-[10px] text-slate-500 uppercase font-mono">\${dev.platform} &bull; \${dateStr}</p>
            </div>
          </div>
          <button onclick="handleDeactivateDevice('\${dev.hardware_id}')" class="px-3 py-1 text-[11px] font-bold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 rounded-lg transition-colors">
            Deactivate
          </button>
        \`;
        container.appendChild(card);
      });
    }

    async function handleDeactivateDevice(hardwareId) {
      if (!confirm('Are you sure you want to deactivate this device slot? You can reactivate on a new device anytime.')) return;

      try {
        const res = await fetch('/api/license/self-reset-device', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: currentEmail,
            session_token: currentSessionToken,
            hardware_id: hardwareId
          })
        });
        const data = await res.json();
        if (data.success) {
          const primary = currentLicenses[0];
          if (primary && primary.devices) {
            primary.devices = primary.devices.filter(d => d.hardware_id !== hardwareId);
          }
          renderLicenseDashboard();
        } else {
          alert(data.error || 'Failed to deactivate device.');
        }
      } catch {
        alert('Network error while resetting device slot.');
      }
    }

    function copyLicenseKey() {
      const key = document.getElementById('resLicenseKey').innerText;
      navigator.clipboard.writeText(key).then(() => {
        const btn = document.getElementById('btnCopy');
        btn.innerText = 'Copied!';
        setTimeout(() => { btn.innerText = 'Copy'; }, 2000);
      });
    }

    function backToStep1() {
      document.getElementById('stepOtp').classList.add('hidden');
      document.getElementById('stepEmail').classList.remove('hidden');
    }

    function startResendCooldown() {
      let seconds = 60;
      const btn = document.getElementById('btnResendOtp');
      btn.disabled = true;

      clearInterval(resendTimer);
      resendTimer = setInterval(() => {
        seconds--;
        if (seconds <= 0) {
          clearInterval(resendTimer);
          btn.disabled = false;
          btn.innerText = 'Resend Code';
        } else {
          btn.innerText = \`Resend in \${seconds}s\`;
        }
      }, 1000);
    }

    function handleResendOtp() {
      document.getElementById('inputEmail').value = currentEmail;
      handleRequestOtp({ preventDefault: () => {} });
    }

    function escapeHtml(str) {
      return String(str || '').replace(/[&<>"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
      });
    }
  </script>
</body>
</html>`;
}
