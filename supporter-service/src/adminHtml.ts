export function renderAdminDashboardHtml(appName: string): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${appName} - Admin Licensing Control Panel</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background-color: #0b0f19;
      color: #f1f5f9;
    }
    .mono { font-family: 'JetBrains Mono', monospace; }
    .glass {
      background: rgba(17, 24, 39, 0.75);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .glass-card {
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%);
      border: 1px solid rgba(255, 255, 255, 0.07);
    }
    .glow-cyan {
      box-shadow: 0 0 35px -5px rgba(6, 182, 212, 0.3);
    }
    .glow-blue {
      box-shadow: 0 0 35px -5px rgba(59, 130, 246, 0.3);
    }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #0b0f19; }
    ::-webkit-scrollbar-thumb { background: #334155; border-radius: 9999px; }
  </style>
</head>
<body class="min-h-screen flex flex-col antialiased selection:bg-cyan-500 selection:text-black">
  
  <!-- Top Navigation -->
  <header class="glass sticky top-0 z-40 border-b border-slate-800/80 px-6 py-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-extrabold shadow-lg shadow-cyan-500/20">
        TG
      </div>
      <div>
        <h1 class="text-base font-bold tracking-tight text-white flex items-center gap-2">
          ${appName}
          <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">Admin Portal</span>
        </h1>
        <p class="text-xs text-slate-400">Edge Commercial Licensing & Device Management</p>
      </div>
    </div>
    
    <div id="authHeaderSection" class="flex items-center gap-3">
      <button id="logoutBtn" onclick="logout()" class="hidden text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 transition-colors">
        Logout
      </button>
    </div>
  </header>

  <!-- Login Overlay -->
  <div id="loginView" class="flex-1 flex items-center justify-center p-6">
    <div class="glass-card w-full max-w-md p-8 rounded-2xl glow-cyan space-y-6">
      <div class="text-center space-y-2">
        <div class="h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mx-auto flex items-center justify-center text-xl font-bold">
          🔒
        </div>
        <h2 class="text-xl font-bold text-white">Admin Authentication</h2>
        <p class="text-xs text-slate-400">Enter your master admin key or password to access license management</p>
      </div>

      <form id="loginForm" onsubmit="handleLogin(event)" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Master Admin Secret</label>
          <input type="password" id="adminSecretInput" required placeholder="••••••••••••••••" class="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 transition-colors">
        </div>
        <button type="submit" class="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/25 active:scale-[0.98]">
          Unlock Admin Portal
        </button>
        <p id="loginError" class="text-xs text-rose-400 text-center hidden"></p>
      </form>
    </div>
  </div>

  <!-- Main Dashboard View -->
  <main id="dashboardView" class="hidden flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
    
    <!-- Stats Row -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <div class="glass-card p-5 rounded-2xl">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Licenses</span>
          <span class="text-lg">🔑</span>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <span id="statTotalLicenses" class="text-3xl font-extrabold text-white">0</span>
          <span class="text-xs text-emerald-400 font-medium">Issued</span>
        </div>
      </div>

      <div class="glass-card p-5 rounded-2xl">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Devices</span>
          <span class="text-lg">💻</span>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <span id="statActiveDevices" class="text-3xl font-extrabold text-cyan-400">0</span>
          <span class="text-xs text-slate-400 font-medium">Bound</span>
        </div>
      </div>

      <div class="glass-card p-5 rounded-2xl">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Lifetime Pro</span>
          <span class="text-lg">⭐</span>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <span id="statLifetime" class="text-3xl font-extrabold text-indigo-400">0</span>
          <span class="text-xs text-indigo-400 font-medium">Licenses</span>
        </div>
      </div>

      <div class="glass-card p-5 rounded-2xl">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Banned / Revoked</span>
          <span class="text-lg">🚫</span>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <span id="statBanned" class="text-3xl font-extrabold text-rose-400">0</span>
          <span class="text-xs text-rose-400 font-medium">Blocked</span>
        </div>
      </div>

      <div class="glass-card p-5 rounded-2xl border border-rose-500/20 glow-blue">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Crash Reports</span>
          <span class="text-lg">🐛</span>
        </div>
        <div class="mt-3 flex items-baseline justify-between">
          <div class="flex items-baseline gap-2">
            <span id="statCrashReports" class="text-3xl font-extrabold text-rose-400">0</span>
            <span class="text-xs text-slate-400 font-medium">Logged</span>
          </div>
          <button onclick="scrollToCrashSection()" class="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors">Logs ↓</button>
        </div>
      </div>
    </div>

    <!-- Live Pricing & Razorpay Gateway Controller -->
    <div class="glass-card p-5 rounded-2xl border border-cyan-500/20 glow-cyan">
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
              Live Gateway & Pricing Controller
            </span>
            <span id="pricingStatusBadge" class="text-[10px] text-emerald-400 font-semibold">🟢 Razorpay Gateway Live</span>
          </div>
          <h3 class="text-lg font-bold text-white mt-1.5 flex items-center gap-2">
            Current Live Price: <span id="displayLivePrice" class="text-emerald-400 font-mono text-2xl font-black">₹399.00</span>
          </h3>
          <p class="text-xs text-slate-400">Razorpay Key: <span class="font-mono text-cyan-300">rzp_live_T1mw2QboxNW91L</span> | Webhook: <span class="font-mono text-slate-300">/api/webhooks/razorpay</span></p>
        </div>

        <form id="priceForm" onsubmit="handleUpdatePrice(event)" class="flex items-center gap-3 w-full md:w-auto">
          <div class="relative flex-1 md:w-44">
            <span class="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400">₹</span>
            <input type="number" id="inputNewPrice" min="1" step="1" placeholder="399" required class="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors">
          </div>
          <button type="submit" id="btnUpdatePrice" class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] whitespace-nowrap">
            Update Price Live
          </button>
        </form>
      </div>
      <div id="priceUpdateMsg" class="hidden mt-3 text-xs p-2.5 rounded-xl text-center"></div>
    </div>

    <!-- Free Trial Controller -->
    <div class="glass-card p-5 rounded-2xl border border-purple-500/20 glow-blue">
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
              🎁 Free Trial Controller
            </span>
            <span id="trialStatusBadge" class="text-[10px] text-emerald-400 font-semibold">🟢 Active: 30-Day Free Trial</span>
          </div>
          <h3 class="text-lg font-bold text-white mt-1.5 flex items-center gap-2">
            Trial Duration: <span id="displayTrialDuration" class="text-purple-300 font-mono text-2xl font-black">1 Month (30 Days)</span>
          </h3>
          <p class="text-xs text-slate-400">Allow new users to claim a free trial for a specific duration without payment.</p>
        </div>

        <form id="trialForm" onsubmit="handleUpdateTrial(event)" class="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full md:w-auto">
          <div class="flex items-center gap-2">
            <label class="text-xs font-semibold text-slate-300">Status:</label>
            <select id="inputTrialEnabled" class="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-purple-500">
              <option value="1">Enabled</option>
              <option value="0">Disabled</option>
            </select>
          </div>

          <div class="flex items-center gap-2 flex-1 sm:w-52">
            <label class="text-xs font-semibold text-slate-300">Duration:</label>
            <select id="inputTrialDays" class="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-purple-300 focus:outline-none focus:border-purple-500">
              <option value="7">7 Days (1 Week)</option>
              <option value="14">14 Days (2 Weeks)</option>
              <option value="30" selected>1 Month (30 Days)</option>
              <option value="60">2 Months (60 Days)</option>
              <option value="90">3 Months (90 Days)</option>
              <option value="180">6 Months (180 Days)</option>
              <option value="365">1 Year (365 Days)</option>
            </select>
          </div>

          <button type="submit" id="btnUpdateTrial" class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white text-sm font-bold shadow-lg shadow-purple-500/20 transition-all active:scale-[0.98] whitespace-nowrap">
            Save Trial Settings
          </button>
        </form>
      </div>
      <div id="trialUpdateMsg" class="hidden mt-3 text-xs p-2.5 rounded-xl text-center"></div>
    </div>

    <!-- Coupons & Promotional Offers Manager -->
    <div class="glass-card p-5 rounded-2xl border border-indigo-500/20 glow-blue">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
              Coupons & Promo Codes
            </span>
            <span class="text-[10px] text-slate-400">Time & Usage Limited Discounts</span>
          </div>
          <p class="text-xs text-slate-400 mt-1">Create discount codes with custom user limits and expiration durations.</p>
        </div>
        <button onclick="openCreateCouponModal()" class="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98] flex items-center gap-1.5 whitespace-nowrap">
          <span>➕</span> New Promo Code
        </button>
      </div>

      <div id="couponsList" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
        <p class="text-xs text-slate-500 py-3 italic col-span-full text-center">Loading promotional coupons...</p>
      </div>
    </div>

    <!-- Special Offers & Flash Sales Manager -->
    <div class="glass-card p-5 rounded-2xl border border-amber-500/20 glow-blue">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
              🔥 Special Offers & Flash Sales
            </span>
            <span class="text-[10px] text-slate-400">Promotional Banners & Deal Announcer</span>
          </div>
          <p class="text-xs text-slate-400 mt-1">Publish live promotional deals, festive banners, and countdown timers to all Telegram Drive users.</p>
        </div>
        <button onclick="openCreateOfferModal()" class="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98] flex items-center gap-1.5 whitespace-nowrap">
          <span>➕</span> New Special Offer
        </button>
      </div>

      <div id="offersList" class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        <p class="text-xs text-slate-500 py-3 italic col-span-full text-center">Loading special promotional offers...</p>
      </div>
    </div>

    <!-- Refer & Earn Commission & Settings Controller -->
    <div class="glass-card p-5 rounded-2xl border border-emerald-500/20 glow-cyan">
      <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              🤝 Refer & Earn Controller
            </span>
            <span id="referralStatusBadge" class="text-[10px] text-emerald-400 font-semibold">🟢 Active: ₹50 / Sale</span>
          </div>
          <h3 class="text-lg font-bold text-white mt-1.5 flex items-center gap-2">
            Referral Reward: <span id="displayReferralReward" class="text-emerald-400 font-mono text-2xl font-black">₹50.00 / Sale</span>
          </h3>
          <p class="text-xs text-slate-400">Users earn cash commission when friends purchase Pro using their referral code. Configurable reward, friend discount, & payout limits.</p>
        </div>
      </div>

      <form id="referralSettingsForm" onsubmit="handleUpdateReferralSettings(event)" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-4 items-end">
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Status</label>
          <select id="inputReferralEnabled" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-emerald-500">
            <option value="1">Enabled</option>
            <option value="0">Disabled</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Reward Type</label>
          <select id="inputReferralRewardType" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-emerald-500">
            <option value="fixed">Fixed Cash (₹)</option>
            <option value="percent">Percentage (%)</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Commission per Sale</label>
          <input type="number" id="inputReferralRewardValue" min="1" step="1" required class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-emerald-400 focus:outline-none focus:border-emerald-500">
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Friend Discount (%)</label>
          <input type="number" id="inputReferralFriendDiscount" min="0" max="100" step="1" required class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-cyan-400 focus:outline-none focus:border-emerald-500">
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Min Payout (₹)</label>
          <input type="number" id="inputReferralMinPayout" min="10" step="10" required class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-amber-400 focus:outline-none focus:border-emerald-500">
        </div>

        <div>
          <button type="submit" id="btnSaveReferralSettings" class="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]">
            Save Settings
          </button>
        </div>
      </form>
      <div id="referralUpdateMsg" class="hidden mt-3 text-xs p-2.5 rounded-xl text-center"></div>
    </div>

    <!-- Withdrawal & Payout Requests Manager -->
    <div class="glass-card p-5 rounded-2xl border border-cyan-500/20 glow-blue">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
              💸 Withdrawal & Payout Requests
            </span>
            <span id="pendingPayoutBadge" class="text-[10px] text-amber-400 font-semibold">0 Pending Requests</span>
          </div>
          <p class="text-xs text-slate-400 mt-1">Review and process user earnings withdrawals via UPI or Bank Transfer.</p>
        </div>

        <!-- Filter Buttons -->
        <div class="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
          <button type="button" onclick="loadPayoutRequests('all', this)" class="payout-filter-btn px-2.5 py-1 rounded-lg text-slate-400 hover:text-white font-semibold transition-all">All</button>
          <button type="button" onclick="loadPayoutRequests('pending', this)" class="payout-filter-btn px-2.5 py-1 rounded-lg bg-cyan-500 text-slate-950 font-bold shadow-sm transition-all">Pending</button>
          <button type="button" onclick="loadPayoutRequests('completed', this)" class="payout-filter-btn px-2.5 py-1 rounded-lg text-slate-400 hover:text-white font-semibold transition-all">Completed</button>
          <button type="button" onclick="loadPayoutRequests('rejected', this)" class="payout-filter-btn px-2.5 py-1 rounded-lg text-slate-400 hover:text-white font-semibold transition-all">Rejected</button>
        </div>
      </div>

      <div class="overflow-x-auto mt-4">
        <table class="w-full text-left text-xs text-slate-300">
          <thead class="bg-slate-900/80 uppercase font-semibold text-slate-400 border-b border-slate-800">
            <tr>
              <th class="px-4 py-3">User / Code</th>
              <th class="px-4 py-3">Amount</th>
              <th class="px-4 py-3">Payment Details</th>
              <th class="px-4 py-3">Date Requested</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody id="payoutsTableBody" class="divide-y divide-slate-800/60">
            <tr>
              <td colspan="6" class="px-4 py-8 text-center text-slate-500">Loading payout requests...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Top Referrers Leaderboard -->
    <div class="glass-card p-5 rounded-2xl border border-indigo-500/20">
      <div class="flex items-center justify-between pb-3 border-b border-slate-800">
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
            🏆 Top Referrers Leaderboard
          </span>
          <span class="text-[10px] text-slate-400">Best Viral Promoters</span>
        </div>
        <button onclick="loadTopReferrers()" class="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">🔄 Refresh</button>
      </div>
      <div id="topReferrersList" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
        <p class="text-xs text-slate-500 py-3 italic col-span-full text-center">Loading top referrers...</p>
      </div>
    </div>



    <!-- Actions & Filter Toolbar -->
    <div class="glass p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
      <div class="w-full md:w-96 relative">
        <input type="text" id="searchInput" oninput="handleSearch()" placeholder="Search by Key, Customer Name, Email..." class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors">
        <span class="absolute left-3.5 top-3 text-slate-500 text-sm">🔍</span>
      </div>

      <div class="flex items-center gap-3 w-full md:w-auto justify-end">
        <button onclick="loadLicenses()" class="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm font-semibold transition-colors flex items-center gap-2">
          <span>🔄</span> Refresh
        </button>
        <button onclick="openCreateModal()" class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-bold shadow-lg shadow-cyan-500/20 transition-all active:scale-[0.98] flex items-center gap-2">
          <span>➕</span> Generate License Key
        </button>
      </div>
    </div>

    <!-- License List Table -->
    <div class="glass rounded-2xl overflow-hidden border border-slate-800">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-slate-300">
          <thead class="bg-slate-900/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
            <tr>
              <th class="px-6 py-4">License Key</th>
              <th class="px-6 py-4">Customer / Notes</th>
              <th class="px-6 py-4">Plan Type</th>
              <th class="px-6 py-4">Devices</th>
              <th class="px-6 py-4">Status</th>
              <th class="px-6 py-4">Created Date</th>
              <th class="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody id="licensesTableBody" class="divide-y divide-slate-800/60">
            <tr>
              <td colspan="7" class="px-6 py-12 text-center text-slate-500">
                Loading licenses...
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- App Crash Telemetry & Diagnostics Section -->
    <div id="crashReportsSection" class="glass-card p-5 rounded-2xl border border-rose-500/20 glow-blue">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
              🐛 Crash Reports & Diagnostics
            </span>
            <span id="crashTelemetryStatusBadge" class="text-[10px] text-emerald-400 font-semibold">🟢 Ingestion Active • Desktop & Android</span>
          </div>
          <p class="text-xs text-slate-400 mt-1">Live error telemetry submitted automatically by Telegram Drive builds when an unhandled crash occurs.</p>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="loadCrashReports()" class="px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-colors flex items-center gap-1.5">
            <span>🔄</span> Refresh
          </button>
          <button onclick="handleClearAllCrashes()" class="px-3 py-1.5 rounded-xl border border-rose-500/30 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition-colors flex items-center gap-1.5">
            <span>🗑️</span> Clear All Logs
          </button>
        </div>
      </div>

      <div class="mt-4 overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-300">
          <thead class="text-[11px] uppercase bg-slate-900/60 text-slate-400 border-b border-slate-800">
            <tr>
              <th class="px-4 py-3">Error Type</th>
              <th class="px-4 py-3">Source</th>
              <th class="px-4 py-3">App Version</th>
              <th class="px-4 py-3">Platform / OS</th>
              <th class="px-4 py-3">Occurred At</th>
              <th class="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody id="crashReportsTableBody" class="divide-y divide-slate-800/60">
            <tr>
              <td colspan="6" class="px-4 py-8 text-center text-slate-500">
                Loading crash reports...
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </main>

  <!-- Create License Modal -->
  <div id="createModal" class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm hidden flex items-center justify-center p-4">
    <div class="glass-card w-full max-w-lg p-6 rounded-2xl glow-cyan space-y-5 border border-slate-700">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-bold text-white flex items-center gap-2">
          <span>✨</span> Generate Commercial License
        </h3>
        <button onclick="closeCreateModal()" class="text-slate-400 hover:text-white text-lg">✕</button>
      </div>

      <form id="createLicenseForm" onsubmit="handleCreateLicense(event)" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Plan Duration</label>
            <select id="planTypeSelect" class="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-500">
              <option value="lifetime">⭐ Lifetime Pro (No Expiry)</option>
              <option value="annual">📅 1 Year (Annual)</option>
              <option value="monthly">🌙 1 Month</option>
              <option value="trial">⏳ 7-Day Trial</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Max Allowed Devices</label>
            <select id="maxDevicesSelect" class="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-500">
              <option value="1">1 Device (Single PC/Phone)</option>
              <option value="2" selected>2 Devices (PC + Mobile)</option>
              <option value="3">3 Devices</option>
              <option value="5">5 Devices (Power User)</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Customer Name (Optional)</label>
          <input type="text" id="customerNameInput" placeholder="e.g. John Doe" class="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-500">
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Customer Email / Contact (Optional)</label>
          <input type="text" id="customerEmailInput" placeholder="e.g. customer@example.com / @telegram_handle" class="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-500">
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Order Notes / Memo (Optional)</label>
          <input type="text" id="notesInput" placeholder="e.g. LemonSqueezy Order #1234 or UPI Ref" class="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-500">
        </div>

        <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button type="button" onclick="closeCreateModal()" class="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-sm font-semibold">Cancel</button>
          <button type="submit" class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-bold hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/20">Generate Key</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Generated Key Success Modal -->
  <div id="successModal" class="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm hidden flex items-center justify-center p-4">
    <div class="glass-card w-full max-w-md p-6 rounded-2xl glow-cyan space-y-4 border border-cyan-500/40 text-center">
      <div class="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center text-2xl font-bold border border-emerald-500/20">
        ✓
      </div>
      <h3 class="text-lg font-bold text-white">License Key Generated!</h3>
      <p class="text-xs text-slate-400">Share this key with your customer to activate TG Drive Pro</p>
      
      <div class="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 flex items-center justify-between gap-3">
        <span id="generatedKeyDisplay" class="mono text-base font-bold text-cyan-400 tracking-wider"></span>
        <button onclick="copyGeneratedKey()" class="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors">
          Copy
        </button>
      </div>

      <button onclick="closeSuccessModal()" class="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold transition-colors">
        Done
      </button>
    </div>
  </div>

  <!-- Create Coupon Modal -->
  <div id="createCouponModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm hidden animate-fade-in">
    <div class="glass-card w-full max-w-md p-6 rounded-2xl border border-indigo-500/30 space-y-5">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 class="text-base font-bold text-white flex items-center gap-2">
          <span>🎁</span> Create Promo Coupon
        </h3>
        <button onclick="closeCreateCouponModal()" class="text-slate-400 hover:text-white">&times;</button>
      </div>

      <form id="createCouponForm" onsubmit="handleCreateCoupon(event)" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Coupon Code (Uppercase)</label>
          <input type="text" id="couponCodeInput" required placeholder="e.g. LAUNCH50 or DIWALI" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-bold text-indigo-400 uppercase tracking-wider focus:outline-none focus:border-indigo-500">
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Discount Amount</label>
            <input type="number" id="couponAmountInput" min="1" max="100" required placeholder="50" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-bold text-white focus:outline-none focus:border-indigo-500">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Type</label>
            <select id="couponTypeInput" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500">
              <option value="percent">Percentage (%)</option>
              <option value="fixed">Flat Amount (₹)</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">User Usage Limit</label>
            <input type="number" id="couponLimitInput" min="0" placeholder="e.g. 50 (0 = no limit)" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500">
            <span class="text-[10px] text-slate-500">Max users who can claim</span>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Time Duration</label>
            <select id="couponDurationInput" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500">
              <option value="0">Never Expires</option>
              <option value="1">24 Hours (1 Day)</option>
              <option value="3">3 Days</option>
              <option value="7" selected>7 Days (1 Week)</option>
              <option value="30">30 Days (1 Month)</option>
            </select>
            <span class="text-[10px] text-slate-500">Auto-expires after time</span>
          </div>
        </div>

        <div id="couponCreateError" class="hidden text-xs p-2.5 rounded-xl text-center bg-rose-500/10 text-rose-400 border border-rose-500/20"></div>

        <div class="pt-2 flex items-center justify-end gap-3">
          <button type="button" onclick="closeCreateCouponModal()" class="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800">
            Cancel
          </button>
          <button type="submit" id="btnSubmitCoupon" class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20">
            Create Live Coupon
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- Create Special Offer Modal -->
  <div id="createOfferModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm hidden animate-fade-in overflow-y-auto">
    <div class="glass-card w-full max-w-xl p-6 rounded-2xl border border-amber-500/30 space-y-4 my-8">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 class="text-base font-bold text-white flex items-center gap-2">
          <span>🔥</span> Publish Promotional Offer & Deal
        </h3>
        <button onclick="closeCreateOfferModal()" class="text-slate-400 hover:text-white text-lg">&times;</button>
      </div>

      <form id="createOfferForm" onsubmit="handleCreateOffer(event)" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="sm:col-span-2">
            <label class="block text-xs font-semibold text-slate-300 mb-1">Offer Title / Campaign Headline</label>
            <input type="text" id="offerTitleInput" required placeholder="e.g. Diwali Mega Sale: 50% OFF Lifetime Pro" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:border-amber-500">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Badge Tag</label>
            <input type="text" id="offerBadgeInput" placeholder="e.g. 50% OFF FLASH DEAL" value="LIMITED TIME OFFER" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-amber-400 uppercase tracking-wider focus:outline-none focus:border-amber-500">
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Offer Summary / Description</label>
          <textarea id="offerDescriptionInput" required rows="2" placeholder="e.g. Get lifetime unlimited cloud storage + 2 device slots at a flat promotional discount!" class="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"></textarea>
        </div>

        <!-- Offer Discount Mode & Pricing -->
        <div class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-amber-400">💰 Offer Discount & Pricing</span>
            <span class="text-[10px] text-slate-400">Select discount calculation</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <div>
              <label class="block text-[11px] font-semibold text-slate-400 mb-1">Discount Type</label>
              <select id="offerDiscountType" onchange="calculateOfferPrice()" class="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500">
                <option value="percent">Percentage (%)</option>
                <option value="flat">Flat Amount (₹)</option>
                <option value="bundle">Special Deal (Custom)</option>
              </select>
            </div>

            <div>
              <label class="block text-[11px] font-semibold text-slate-400 mb-1">Original Price (₹)</label>
              <input type="number" id="offerOriginalPrice" value="399" oninput="calculateOfferPrice()" class="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500">
            </div>

            <div>
              <label class="block text-[11px] font-semibold text-slate-400 mb-1">Discount Value</label>
              <input type="number" id="offerDiscountValue" value="50" oninput="calculateOfferPrice()" placeholder="50" class="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-500">
            </div>

            <div>
              <label class="block text-[11px] font-semibold text-slate-400 mb-1">Final Deal Price (₹)</label>
              <input type="number" id="offerFinalPrice" value="199.50" class="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-emerald-500/40 text-xs font-black text-emerald-400 focus:outline-none focus:border-emerald-400">
            </div>
          </div>
        </div>

        <!-- Kya-kya Offer Me Milega (Perks & Benefits) -->
        <div class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-cyan-400">🎁 Kya-Kya Offer Me Milega (Offer Perks)</span>
            <span class="text-[10px] text-slate-400">Displayed on deal banner</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="offerPerk" value="Lifetime Unlimited Cloud Storage" checked class="accent-cyan-500 rounded">
              <span>Lifetime Unlimited Storage</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="offerPerk" value="2 Hardware Device Slots (PC + Phone)" checked class="accent-cyan-500 rounded">
              <span>2 Hardware Device Slots</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="offerPerk" value="High-Speed Multi-Part Engine" checked class="accent-cyan-500 rounded">
              <span>High-Speed Multi-Part Engine</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="offerPerk" value="100% Offline Vault Capable" checked class="accent-cyan-500 rounded">
              <span>100% Offline Vault Capable</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="offerPerk" value="+1 Free Extra Device Slot (3 Devices Total)" class="accent-cyan-500 rounded">
              <span>+1 Free Extra Device Slot</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="offerPerk" value="VIP Priority Telegram Support" class="accent-cyan-500 rounded">
              <span>VIP Priority Support</span>
            </label>
          </div>

          <div>
            <label class="block text-[11px] font-semibold text-slate-400 mb-1">Custom Extra Perk (Optional)</label>
            <input type="text" id="offerCustomPerk" placeholder="e.g. Free Cloud Backup Encryption Tool" class="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500">
          </div>
        </div>

        <!-- Kitna Time Tak Chalega (Duration & Theme) -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">⏳ Kitna Time Tak Chalega</label>
            <select id="offerDurationInput" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500">
              <option value="6">⚡ 6 Hours Flash Sale</option>
              <option value="12">⚡ 12 Hours Half-Day Deal</option>
              <option value="24" selected>⏳ 24 Hours (1 Day Flash)</option>
              <option value="48">⏳ 48 Hours Weekend Deal</option>
              <option value="72">📅 3 Days Special</option>
              <option value="168">📅 7 Days (1 Week Sale)</option>
              <option value="720">🌙 30 Days (Month-Long)</option>
              <option value="0">♾️ Permanent / Ongoing Deal</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Auto-Coupon Code</label>
            <input type="text" id="offerCouponInput" placeholder="e.g. DIWALI50" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-indigo-400 uppercase tracking-wider focus:outline-none focus:border-indigo-500">
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Banner Visual Theme</label>
            <select id="offerStyleInput" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500">
              <option value="gold">🏆 Royal Gold & Amber</option>
              <option value="fire">🔥 Neon Flame & Orange</option>
              <option value="cyan">⚡ Cyber Neon Cyan</option>
              <option value="emerald">💎 Emerald Pro</option>
              <option value="purple">🔮 Royal Purple</option>
            </select>
          </div>
        </div>

        <div id="offerCreateError" class="hidden text-xs p-2.5 rounded-xl text-center bg-rose-500/10 text-rose-400 border border-rose-500/20"></div>

        <div class="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
          <button type="button" onclick="closeCreateOfferModal()" class="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800">
            Cancel
          </button>
          <button type="submit" id="btnSubmitOffer" class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20">
            Publish Offer Live
          </button>
        </div>
      </form>
    </div>
  </div>


  <!-- Stack Trace & Crash Inspection Modal -->
  <div id="crashInspectModal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm hidden flex items-center justify-center p-4">
    <div class="glass-card w-full max-w-2xl p-6 rounded-2xl glow-cyan space-y-4 border border-slate-700">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 class="text-base font-bold text-white flex items-center gap-2">
          <span class="text-rose-400">⚡</span> Crash Diagnostic Details
        </h3>
        <button onclick="closeCrashInspectModal()" class="text-slate-400 hover:text-white text-lg font-bold">✕</button>
      </div>
      
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
          <span class="text-slate-400 block text-[10px] uppercase">Error Type</span>
          <span id="inspectErrorType" class="font-bold text-rose-400 mono"></span>
        </div>
        <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
          <span class="text-slate-400 block text-[10px] uppercase">Source</span>
          <span id="inspectSource" class="font-bold text-cyan-400"></span>
        </div>
        <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
          <span class="text-slate-400 block text-[10px] uppercase">App Version</span>
          <span id="inspectVersion" class="font-bold text-white mono"></span>
        </div>
        <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
          <span class="text-slate-400 block text-[10px] uppercase">Platform</span>
          <span id="inspectPlatform" class="font-bold text-indigo-400"></span>
        </div>
      </div>

      <div>
        <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Stack Trace Frames (Sanitized)</label>
        <div id="inspectFrames" class="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs max-h-60 overflow-y-auto space-y-1">
        </div>
      </div>

      <div class="text-[11px] text-slate-500">
        Timestamp: <span id="inspectOccurredAt" class="text-slate-400 mono"></span>
      </div>

      <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
        <button type="button" onclick="closeCrashInspectModal()" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors">Close</button>
      </div>
    </div>
  </div>

  <!-- Toast Notification -->
  <div id="toast" class="fixed bottom-6 right-6 z-50 hidden px-4 py-3 rounded-xl bg-slate-800 text-white text-sm font-medium border border-slate-700 shadow-xl"></div>

  <script>
    let adminToken = localStorage.getItem('tg_admin_secret') || '';

    window.addEventListener('DOMContentLoaded', () => {
      if (adminToken) {
        showDashboard();
      } else {
        showLogin();
      }
    });

    function showToast(msg) {
      const toast = document.getElementById('toast');
      toast.textContent = msg;
      toast.classList.remove('hidden');
      setTimeout(() => toast.classList.add('hidden'), 3000);
    }

    function showLogin() {
      document.getElementById('loginView').classList.remove('hidden');
      document.getElementById('dashboardView').classList.add('hidden');
      document.getElementById('logoutBtn').classList.add('hidden');
    }

    function showDashboard() {
      document.getElementById('loginView').classList.add('hidden');
      document.getElementById('dashboardView').classList.remove('hidden');
      document.getElementById('logoutBtn').classList.remove('hidden');
      loadStats();
      loadLicenses();
      loadPricing();
      loadTrialSettings();
      loadDiscounts();
      loadOffers();
      loadReferralSettings();
      loadPayoutRequests('pending');
      loadTopReferrers();
      loadCrashReports();
    }

    async function loadTrialSettings() {
      try {
        const res = await fetch('/api/admin/trial', {
          headers: { 'Authorization': 'Bearer ' + adminToken }
        });
        if (!res.ok) return;
        const data = await res.json();
        const enabled = !!data.trial_enabled;
        const days = data.trial_days || 30;

        document.getElementById('inputTrialEnabled').value = enabled ? '1' : '0';
        document.getElementById('inputTrialDays').value = String(days);
        
        let label = days + ' Days';
        if (days === 30) label = '1 Month (30 Days)';
        else if (days === 90) label = '3 Months (90 Days)';
        else if (days === 365) label = '1 Year (365 Days)';

        document.getElementById('displayTrialDuration').textContent = enabled ? label : 'Disabled';
        document.getElementById('trialStatusBadge').textContent = enabled ? '🟢 Active: ' + label : '🔴 Disabled';
        document.getElementById('trialStatusBadge').className = enabled ? 'text-[10px] text-emerald-400 font-semibold' : 'text-[10px] text-rose-400 font-semibold';
      } catch (err) {
        console.error('Failed to load trial settings:', err);
      }
    }

    async function handleUpdateTrial(e) {
      e.preventDefault();
      const enabled = document.getElementById('inputTrialEnabled').value === '1';
      const days = parseInt(document.getElementById('inputTrialDays').value, 10) || 30;

      const btn = document.getElementById('btnUpdateTrial');
      const msgBox = document.getElementById('trialUpdateMsg');
      btn.disabled = true;
      btn.textContent = 'Saving...';
      msgBox.classList.add('hidden');

      try {
        const res = await fetch('/api/admin/trial/update', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + adminToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ trial_enabled: enabled, trial_days: days })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          msgBox.className = 'mt-3 text-xs p-2.5 rounded-xl text-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
          msgBox.textContent = data.message || 'Trial settings saved!';
          msgBox.classList.remove('hidden');

          let label = days + ' Days';
          if (days === 30) label = '1 Month (30 Days)';
          else if (days === 90) label = '3 Months (90 Days)';
          else if (days === 365) label = '1 Year (365 Days)';

          document.getElementById('displayTrialDuration').textContent = enabled ? label : 'Disabled';
          document.getElementById('trialStatusBadge').textContent = enabled ? '🟢 Active: ' + label : '🔴 Disabled';
          document.getElementById('trialStatusBadge').className = enabled ? 'text-[10px] text-emerald-400 font-semibold' : 'text-[10px] text-rose-400 font-semibold';
          showToast('Free trial settings updated live!');
        } else {
          msgBox.className = 'mt-3 text-xs p-2.5 rounded-xl text-center bg-rose-500/10 text-rose-400 border border-rose-500/20';
          msgBox.textContent = data.error || 'Failed to update trial settings.';
          msgBox.classList.remove('hidden');
        }
      } catch (err) {
        msgBox.className = 'mt-3 text-xs p-2.5 rounded-xl text-center bg-rose-500/10 text-rose-400 border border-rose-500/20';
        msgBox.textContent = 'Network error while updating trial.';
        msgBox.classList.remove('hidden');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Save Trial Settings';
      }
    }

    async function loadPricing() {
      try {
        const res = await fetch('/api/admin/pricing', {
          headers: { 'Authorization': 'Bearer ' + adminToken }
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.formatted_price) {
          document.getElementById('displayLivePrice').textContent = data.formatted_price;
          document.getElementById('inputNewPrice').placeholder = data.price;
        }
        if (data.configured) {
          document.getElementById('pricingStatusBadge').textContent = '🟢 ' + (data.gateway || 'Razorpay') + ' Live Sync: ' + (data.product_name || 'TG Drive Pro');
        }
      } catch (err) {
        console.error('Failed to load pricing:', err);
      }
    }

    async function handleUpdatePrice(e) {
      e.preventDefault();
      const newPrice = parseFloat(document.getElementById('inputNewPrice').value);
      if (!newPrice || newPrice <= 0) return;

      const btn = document.getElementById('btnUpdatePrice');
      const msgBox = document.getElementById('priceUpdateMsg');
      btn.disabled = true;
      btn.textContent = 'Updating...';
      msgBox.classList.add('hidden');

      try {
        const res = await fetch('/api/admin/pricing/update', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + adminToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ price: newPrice })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          msgBox.className = 'mt-3 text-xs p-2.5 rounded-xl text-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
          msgBox.textContent = data.message || 'Price updated successfully!';
          msgBox.classList.remove('hidden');
          document.getElementById('displayLivePrice').textContent = '₹' + newPrice.toFixed(2);
          document.getElementById('inputNewPrice').value = '';
          showToast('Live price updated on Razorpay!');
        } else {
          msgBox.className = 'mt-3 text-xs p-2.5 rounded-xl text-center bg-rose-500/10 text-rose-400 border border-rose-500/20';
          msgBox.textContent = data.error || 'Failed to update price.';
          msgBox.classList.remove('hidden');
        }
      } catch (err) {
        msgBox.className = 'mt-3 text-xs p-2.5 rounded-xl text-center bg-rose-500/10 text-rose-400 border border-rose-500/20';
        msgBox.textContent = 'Network error while updating price.';
        msgBox.classList.remove('hidden');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Update Price Live';
      }
    }

    function openCreateCouponModal() {
      const errBox = document.getElementById('couponCreateError');
      if (errBox) errBox.classList.add('hidden');
      document.getElementById('createCouponModal').classList.remove('hidden');
    }

    function closeCreateCouponModal() {
      document.getElementById('createCouponModal').classList.add('hidden');
      document.getElementById('createCouponForm').reset();
    }

    async function loadDiscounts() {
      const container = document.getElementById('couponsList');
      if (!container) return;
      try {
        const res = await fetch('/api/admin/discounts', {
          headers: { 'Authorization': 'Bearer ' + adminToken }
        });
        if (!res.ok) {
          container.innerHTML = '<p class="text-xs text-slate-500 py-3 italic col-span-full text-center">Unable to load coupons from Lemon Squeezy.</p>';
          return;
        }
        const data = await res.json();
        const discounts = data.discounts || [];
        if (!discounts.length) {
          container.innerHTML = '<p class="text-xs text-slate-500 py-3 italic col-span-full text-center">No active coupons. Click "+ New Promo Code" to create one!</p>';
          return;
        }

        container.innerHTML = discounts.map(d => {
          const discountVal = d.amount_type === 'percent' ? d.amount + '% OFF' : '₹' + d.amount + ' OFF';
          const expiryStr = d.expires_at 
            ? new Date(d.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'Never Expires';
          const usageStr = d.is_limited_redemptions && d.max_redemptions 
            ? 'Limit: ' + d.max_redemptions + ' users'
            : 'Unlimited Claims';

          return \`
            <div class="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/70 hover:border-indigo-500/50 transition-all flex flex-col justify-between gap-2.5">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <span class="mono text-sm font-bold text-indigo-400 tracking-wider">\${d.code}</span>
                  <div class="text-[11px] text-emerald-400 font-semibold mt-0.5">\${discountVal}</div>
                </div>
                <button onclick="copyToClipboard('\${d.code}')" class="text-slate-400 hover:text-indigo-400 text-xs p-1" title="Copy Code">📋</button>
              </div>
              <div class="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/80 pt-2">
                <div class="flex flex-col">
                  <span>👥 \${usageStr}</span>
                  <span>⏳ \${expiryStr}</span>
                </div>
                <button onclick="handleDeleteCoupon('\${d.id}', '\${d.code}')" class="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-medium text-[10px] transition-colors" title="Delete Coupon">
                  Delete
                </button>
              </div>
            </div>
          \`;
        }).join('');
      } catch (err) {
        container.innerHTML = '<p class="text-xs text-rose-400 py-3 italic col-span-full text-center">Failed to fetch coupons.</p>';
      }
    }

    async function handleCreateCoupon(e) {
      e.preventDefault();
      const code = document.getElementById('couponCodeInput').value.trim();
      const amount = parseFloat(document.getElementById('couponAmountInput').value);
      const amountType = document.getElementById('couponTypeInput').value;
      const limit = parseInt(document.getElementById('couponLimitInput').value, 10) || 0;
      const duration = parseInt(document.getElementById('couponDurationInput').value, 10) || 0;

      const btn = document.getElementById('btnSubmitCoupon');
      const errEl = document.getElementById('couponCreateError');
      btn.disabled = true;
      btn.textContent = 'Creating...';
      errEl.classList.add('hidden');

      try {
        const res = await fetch('/api/admin/discounts/create', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + adminToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            code,
            amount,
            amount_type: amountType,
            max_redemptions: limit > 0 ? limit : undefined,
            duration_days: duration > 0 ? duration : undefined
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          closeCreateCouponModal();
          showToast('Coupon ' + code + ' created successfully!');
          loadDiscounts();
        } else {
          errEl.textContent = data.error || 'Failed to create coupon';
          errEl.classList.remove('hidden');
        }
      } catch (err) {
        errEl.textContent = 'Network error creating coupon';
        errEl.classList.remove('hidden');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Create Live Coupon';
      }
    }

    async function handleDeleteCoupon(id, code) {
      if (!confirm('Delete coupon code ' + code + '? Users will no longer be able to use this discount.')) return;
      try {
        const res = await fetch('/api/admin/discounts/delete', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + adminToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ id, code })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Coupon ' + code + ' deleted.');
          loadDiscounts();
        } else {
          alert(data.error || 'Failed to delete coupon');
        }
      } catch (err) {
        alert('Network error deleting coupon');
      }
    }

    async function openCreateOfferModal() {
      const errBox = document.getElementById('offerCreateError');
      if (errBox) errBox.classList.add('hidden');
      document.getElementById('createOfferModal').classList.remove('hidden');
      // Auto-fill the current live price so offer discounts are accurate
      try {
        const res = await fetch('/api/admin/pricing', { headers: { 'Authorization': 'Bearer ' + adminToken } });
        if (res.ok) {
          const data = await res.json();
          if (data.price) {
            const origInput = document.getElementById('offerOriginalPrice');
            if (origInput) origInput.value = data.price;
          }
        }
      } catch(e) {}
      calculateOfferPrice();
    }

    function closeCreateOfferModal() {
      document.getElementById('createOfferModal').classList.add('hidden');
      document.getElementById('createOfferForm').reset();
    }

    function calculateOfferPrice() {
      const orig = parseFloat(document.getElementById('offerOriginalPrice').value) || 0;
      const type = document.getElementById('offerDiscountType').value;
      const val = parseFloat(document.getElementById('offerDiscountValue').value) || 0;
      const badgeInput = document.getElementById('offerBadgeInput');
      const finalInput = document.getElementById('offerFinalPrice');

      let finalPrice = orig;
      if (type === 'percent') {
        finalPrice = Math.max(0, orig - (orig * val / 100));
        if (badgeInput) badgeInput.value = val + '% OFF MEGA DEAL';
      } else if (type === 'flat') {
        finalPrice = Math.max(0, orig - val);
        if (badgeInput) badgeInput.value = 'FLAT ₹' + val + ' OFF';
      } else {
        if (badgeInput) badgeInput.value = 'SPECIAL PROMO BUNDLE';
      }
      if (finalInput) finalInput.value = finalPrice.toFixed(2);
    }

    async function loadOffers() {
      const container = document.getElementById('offersList');
      if (!container) return;

      try {
        const res = await fetch('/api/admin/offers', {
          headers: { 'Authorization': 'Bearer ' + adminToken }
        });
        if (!res.ok) {
          container.innerHTML = '<p class="text-xs text-slate-500 py-3 italic col-span-full text-center">Unable to load offers from server.</p>';
          return;
        }
        const data = await res.json();
        const offers = data.offers || [];

        if (!offers.length) {
          container.innerHTML = '<p class="text-xs text-slate-500 py-4 italic col-span-full text-center">No promotional offers published yet. Click "+ New Special Offer" to launch a campaign!</p>';
          return;
        }

        container.innerHTML = offers.map(o => {
          const isActive = o.is_active === 1;
          const now = Math.floor(Date.now() / 1000);
          const isExpired = o.countdown_end && o.countdown_end <= now;
          
          let statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">ACTIVE NOW</span>';
          if (isExpired) {
            statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">EXPIRED</span>';
          } else if (!isActive) {
            statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">PAUSED</span>';
          }

          let countdownText = 'Ongoing';
          if (o.countdown_end) {
            const remSec = o.countdown_end - now;
            if (remSec <= 0) {
              countdownText = 'Expired';
            } else {
              const hours = Math.floor(remSec / 3600);
              const mins = Math.floor((remSec % 3600) / 60);
              countdownText = hours + 'h ' + mins + 'm remaining';
            }
          }

          let styleBorder = 'border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-slate-900/90 to-slate-950';
          let badgeColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
          if (o.banner_style === 'fire') {
            styleBorder = 'border-orange-500/40 bg-gradient-to-br from-orange-500/10 via-slate-900/90 to-slate-950';
            badgeColor = 'text-orange-400 bg-orange-500/10 border-orange-500/20';
          } else if (o.banner_style === 'cyan') {
            styleBorder = 'border-cyan-500/40 bg-gradient-to-br from-cyan-500/10 via-slate-900/90 to-slate-950';
            badgeColor = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
          } else if (o.banner_style === 'emerald') {
            styleBorder = 'border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-slate-900/90 to-slate-950';
            badgeColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
          } else if (o.banner_style === 'purple') {
            styleBorder = 'border-purple-500/40 bg-gradient-to-br from-purple-500/10 via-slate-900/90 to-slate-950';
            badgeColor = 'text-purple-400 bg-purple-500/10 border-purple-500/20';
          }

          const perksHtml = (o.perks_list || []).map(p => 
            '<div class="flex items-center gap-1.5 text-[11px] text-slate-300"><span>✓</span><span>' + p + '</span></div>'
          ).join('');

          return \`
            <div class="p-4 rounded-2xl border \${styleBorder} flex flex-col justify-between gap-3 shadow-lg transition-all">
              <div class="space-y-2">
                <div class="flex items-start justify-between gap-2">
                  <span class="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border \${badgeColor}">
                    \${o.badge || 'LIMITED OFFER'}
                  </span>
                  <div>\${statusBadge}</div>
                </div>

                <div>
                  <h4 class="text-sm font-bold text-white">\${o.title}</h4>
                  <p class="text-xs text-slate-400 mt-0.5">\${o.description}</p>
                </div>

                <!-- Price & Discount -->
                <div class="flex items-baseline gap-2 pt-1">
                  <span class="text-lg font-black text-emerald-400 font-mono">₹\${o.offer_price || 0}</span>
                  \${o.original_price ? \`<span class="text-xs text-slate-500 line-through">₹\${o.original_price}</span>\` : ''}
                  \${o.coupon_code ? \`<span class="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">CODE: \${o.coupon_code}</span>\` : ''}
                </div>

                <!-- Perks List -->
                \${perksHtml ? \`<div class="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">\${perksHtml}</div>\` : ''}
              </div>

              <div class="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
                <span class="text-slate-400">⏳ \${countdownText}</span>
                <div class="flex items-center gap-2">
                  <button onclick="toggleOfferActive('\${o.id}', \${isActive ? 1 : 0})" class="px-2.5 py-1 rounded-lg text-xs font-semibold \${isActive ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}">
                    \${isActive ? 'Pause' : 'Activate Live'}
                  </button>
                  <button onclick="deleteOffer('\${o.id}')" class="text-slate-500 hover:text-rose-400 text-xs p-1" title="Delete Offer">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          \`;
        }).join('');
      } catch (err) {
        container.innerHTML = '<p class="text-xs text-rose-400 py-3 italic col-span-full text-center">Failed to load offers.</p>';
      }
    }

    async function handleCreateOffer(e) {
      e.preventDefault();
      const title = document.getElementById('offerTitleInput').value.trim();
      const badge = document.getElementById('offerBadgeInput').value.trim();
      const description = document.getElementById('offerDescriptionInput').value.trim();
      const discountType = document.getElementById('offerDiscountType').value;
      const discountVal = parseFloat(document.getElementById('offerDiscountValue').value) || 0;
      const origPrice = parseFloat(document.getElementById('offerOriginalPrice').value) || 0;
      const offerPrice = parseFloat(document.getElementById('offerFinalPrice').value) || 0;
      const durationHours = parseFloat(document.getElementById('offerDurationInput').value) || 0;
      const couponCode = document.getElementById('offerCouponInput').value.trim();
      const bannerStyle = document.getElementById('offerStyleInput').value;

      const checkedPerks = Array.from(document.querySelectorAll('input[name="offerPerk"]:checked')).map(cb => cb.value);
      const customPerk = document.getElementById('offerCustomPerk').value.trim();
      if (customPerk) checkedPerks.push(customPerk);

      const btn = document.getElementById('btnSubmitOffer');
      const errEl = document.getElementById('offerCreateError');
      btn.disabled = true;
      btn.textContent = 'Publishing...';
      errEl.classList.add('hidden');

      try {
        const res = await fetch('/api/admin/offers/create', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + adminToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title,
            badge: badge || undefined,
            description,
            discount_type: discountType,
            discount_value: discountVal,
            original_price: origPrice > 0 ? origPrice : undefined,
            offer_price: offerPrice > 0 ? offerPrice : undefined,
            perks: checkedPerks,
            coupon_code: couponCode || undefined,
            banner_style: bannerStyle,
            duration_hours: durationHours > 0 ? durationHours : undefined
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          closeCreateOfferModal();
          showToast('Promotional offer published live!');
          loadOffers();
        } else {
          errEl.textContent = data.error || 'Failed to create offer';
          errEl.classList.remove('hidden');
        }
      } catch (err) {
        errEl.textContent = 'Network error publishing offer';
        errEl.classList.remove('hidden');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Publish Offer Live';
      }
    }

    async function toggleOfferActive(id, currentActive) {
      try {
        const res = await fetch('/api/admin/offers/toggle', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + adminToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ id, is_active: currentActive === 1 ? 0 : 1 })
        });
        if (res.ok) {
          showToast('Offer status updated');
          loadOffers();
        }
      } catch (e) {
        alert('Failed to toggle offer status');
      }
    }

    async function deleteOffer(id) {
      if (!confirm('Are you sure you want to delete this promotional offer?')) return;
      try {
        const res = await fetch('/api/admin/offers/delete', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + adminToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ id })
        });
        if (res.ok) {
          showToast('Offer deleted');
          loadOffers();
        }
      } catch (e) {
        alert('Failed to delete offer');
      }
    }




    function logout() {
      localStorage.removeItem('tg_admin_secret');
      adminToken = '';
      showLogin();
    }

    async function handleLogin(e) {
      e.preventDefault();
      const secret = document.getElementById('adminSecretInput').value.trim();
      const errEl = document.getElementById('loginError');
      errEl.classList.add('hidden');

      try {
        const res = await fetch('/api/admin/stats', {
          headers: { 'Authorization': 'Bearer ' + secret }
        });
        if (res.ok) {
          adminToken = secret;
          localStorage.setItem('tg_admin_secret', secret);
          showDashboard();
        } else {
          errEl.textContent = 'Invalid Master Secret Password';
          errEl.classList.remove('hidden');
        }
      } catch (err) {
        errEl.textContent = 'Failed to connect to server';
        errEl.classList.remove('hidden');
      }
    }

    async function loadStats() {
      try {
        const res = await fetch('/api/admin/stats', {
          headers: { 'Authorization': 'Bearer ' + adminToken }
        });
        if (res.ok) {
          const data = await res.json();
          document.getElementById('statTotalLicenses').textContent = data.totalLicenses || 0;
          document.getElementById('statActiveDevices').textContent = data.activeDevices || 0;
          document.getElementById('statLifetime').textContent = data.lifetimeLicenses || 0;
          document.getElementById('statBanned').textContent = data.bannedLicenses || 0;
          const crashStatEl = document.getElementById('statCrashReports');
          if (crashStatEl) {
            crashStatEl.textContent = data.totalCrashes || 0;
          }
        }
      } catch (err) {
        console.error('Stats error:', err);
      }
    }

    async function loadLicenses() {
      const tbody = document.getElementById('licensesTableBody');
      try {
        const res = await fetch('/api/admin/licenses', {
          headers: { 'Authorization': 'Bearer ' + adminToken }
        });
        if (res.status === 401) {
          logout();
          return;
        }
        const data = await res.json();
        renderLicensesTable(data.licenses || []);
      } catch (err) {
        tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-8 text-center text-rose-400">Failed to load licenses.</td></tr>';
      }
    }

    let searchTimeout = null;
    function handleSearch() {
      clearTimeout(searchTimeout);
      const q = document.getElementById('searchInput').value.trim();
      if (!q) {
        loadLicenses();
        return;
      }
      searchTimeout = setTimeout(async () => {
        try {
          const res = await fetch('/api/admin/licenses/search?q=' + encodeURIComponent(q), {
            headers: { 'Authorization': 'Bearer ' + adminToken }
          });
          if (res.ok) {
            const data = await res.json();
            renderLicensesTable(data.licenses || []);
          }
        } catch (e) {
          console.error(e);
        }
      }, 250);
    }

    function renderLicensesTable(licenses) {
      const tbody = document.getElementById('licensesTableBody');
      if (!licenses.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-12 text-center text-slate-500">No licenses found.</td></tr>';
        return;
      }

      tbody.innerHTML = licenses.map(l => {
        const createdDate = new Date(l.created_at * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const isBanned = l.is_banned === 1;
        
        let planBadge = '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">LIFETIME</span>';
        if (l.plan_type === 'annual') planBadge = '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">ANNUAL</span>';
        if (l.plan_type === 'monthly') planBadge = '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">MONTHLY</span>';
        if (l.plan_type === 'trial') planBadge = '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">TRIAL</span>';

        const statusBadge = isBanned 
          ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">BANNED</span>'
          : '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">ACTIVE</span>';

        return \`
          <tr class="hover:bg-slate-800/40 transition-colors">
            <td class="px-6 py-4">
              <div class="flex items-center gap-2">
                <span class="mono font-bold text-white text-xs tracking-wider select-all">\${l.license_key}</span>
                <button onclick="copyToClipboard('\${l.license_key}')" class="text-slate-400 hover:text-cyan-400 text-xs p-1" title="Copy Key">📋</button>
              </div>
            </td>
            <td class="px-6 py-4">
              <div class="text-xs font-semibold text-white">\${l.customer_name || '—'}</div>
              <div class="text-[11px] text-slate-400">\${l.customer_email || l.notes || '—'}</div>
            </td>
            <td class="px-6 py-4">\${planBadge}</td>
            <td class="px-6 py-4">
              <div class="text-xs font-semibold text-slate-200">\${l.active_devices_count || 0} / \${l.max_devices}</div>
            </td>
            <td class="px-6 py-4">\${statusBadge}</td>
            <td class="px-6 py-4 text-xs text-slate-400">\${createdDate}</td>
            <td class="px-6 py-4 text-right">
              <div class="flex items-center justify-end gap-2">
                <button onclick="resetDevices('\${l.license_key}')" class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300" title="Reset all device bindings">
                  Reset Devs
                </button>
                \${isBanned 
                  ? \`<button onclick="unbanKey('\${l.license_key}')" class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Unban</button>\`
                  : \`<button onclick="banKey('\${l.license_key}')" class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30">Ban</button>\`
                }
                <button onclick="deleteKey('\${l.license_key}')" class="text-slate-500 hover:text-rose-400 text-xs p-1" title="Delete">🗑️</button>
              </div>
            </td>
          </tr>
        \`;
      }).join('');
    }

    function openCreateModal() {
      document.getElementById('createModal').classList.remove('hidden');
    }
    function closeCreateModal() {
      document.getElementById('createModal').classList.add('hidden');
    }

    async function handleCreateLicense(e) {
      e.preventDefault();
      const plan = document.getElementById('planTypeSelect').value;
      const maxDevices = parseInt(document.getElementById('maxDevicesSelect').value, 10);
      const name = document.getElementById('customerNameInput').value.trim();
      const email = document.getElementById('customerEmailInput').value.trim();
      const notes = document.getElementById('notesInput').value.trim();

      try {
        const res = await fetch('/api/admin/licenses/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + adminToken
          },
          body: JSON.stringify({
            plan_type: plan,
            max_devices: maxDevices,
            customer_name: name || undefined,
            customer_email: email || undefined,
            notes: notes || undefined
          })
        });

        if (res.ok) {
          const data = await res.json();
          closeCreateModal();
          document.getElementById('createLicenseForm').reset();
          document.getElementById('generatedKeyDisplay').textContent = data.license.license_key;
          document.getElementById('successModal').classList.remove('hidden');
          loadStats();
          loadLicenses();
        } else {
          alert('Failed to generate license key');
        }
      } catch (err) {
        alert('Server error generating license');
      }
    }

    function closeSuccessModal() {
      document.getElementById('successModal').classList.add('hidden');
    }

    function copyGeneratedKey() {
      const key = document.getElementById('generatedKeyDisplay').textContent;
      copyToClipboard(key);
    }

    function copyToClipboard(text) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('Copied: ' + text);
      });
    }

    async function resetDevices(key) {
      if (!confirm('Reset all device bindings for ' + key + '? User will be able to activate on new devices.')) return;
      try {
        const res = await fetch('/api/admin/licenses/reset-devices', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + adminToken
          },
          body: JSON.stringify({ license_key: key })
        });
        if (res.ok) {
          showToast('Devices reset successfully');
          loadLicenses();
          loadStats();
        }
      } catch (e) {
        alert('Failed to reset devices');
      }
    }

    async function banKey(key) {
      const reason = prompt('Enter reason for banning this key:', 'Chargeback / Terms Violation') || 'Administrative Ban';
      try {
        const res = await fetch('/api/admin/licenses/ban', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + adminToken
          },
          body: JSON.stringify({ license_key: key, reason })
        });
        if (res.ok) {
          showToast('License Banned: ' + key);
          loadLicenses();
          loadStats();
        }
      } catch (e) {
        alert('Failed to ban key');
      }
    }

    async function unbanKey(key) {
      try {
        const res = await fetch('/api/admin/licenses/unban', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + adminToken
          },
          body: JSON.stringify({ license_key: key })
        });
        if (res.ok) {
          showToast('License Unbanned: ' + key);
          loadLicenses();
          loadStats();
        }
      } catch (e) {
        alert('Failed to unban key');
      }
    }

    async function deleteKey(key) {
      if (!confirm('Permanently delete license ' + key + '? This action cannot be undone!')) return;
      try {
        const res = await fetch('/api/admin/licenses/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + adminToken
          },
          body: JSON.stringify({ license_key: key })
        });
        if (res.ok) {
          showToast('License deleted');
          loadLicenses();
          loadStats();
        }
      } catch (e) {
        alert('Failed to delete key');
      }
    }

    // -------------------------------------------------------------
    // Refer & Earn Admin Functions
    // -------------------------------------------------------------
    async function loadReferralSettings() {
      try {
        const res = await fetch('/api/admin/referrals/settings', {
          headers: { 'Authorization': 'Bearer ' + adminToken }
        });
        if (!res.ok) return;
        const data = await res.json();
        const enabled = !!data.referral_enabled;
        const rewardType = data.reward_type || 'fixed';
        const rewardVal = data.reward_value || 50;
        const friendDisc = data.friend_discount_value || 10;
        const minPayout = data.min_payout || 200;

        document.getElementById('inputReferralEnabled').value = enabled ? '1' : '0';
        document.getElementById('inputReferralRewardType').value = rewardType;
        document.getElementById('inputReferralRewardValue').value = String(rewardVal);
        document.getElementById('inputReferralFriendDiscount').value = String(friendDisc);
        document.getElementById('inputReferralMinPayout').value = String(minPayout);

        const rewardText = rewardType === 'percent' ? rewardVal + '% / Sale' : '₹' + rewardVal + ' / Sale';
        document.getElementById('displayReferralReward').textContent = enabled ? rewardText : 'Disabled';
        document.getElementById('referralStatusBadge').textContent = enabled ? '🟢 Active: ' + rewardText : '🔴 Disabled';
        document.getElementById('referralStatusBadge').className = enabled ? 'text-[10px] text-emerald-400 font-semibold' : 'text-[10px] text-rose-400 font-semibold';
      } catch (err) {
        console.error('Failed to load referral settings:', err);
      }
    }

    async function handleUpdateReferralSettings(e) {
      e.preventDefault();
      const enabled = document.getElementById('inputReferralEnabled').value === '1';
      const rewardType = document.getElementById('inputReferralRewardType').value;
      const rewardVal = parseFloat(document.getElementById('inputReferralRewardValue').value) || 50;
      const friendDisc = parseFloat(document.getElementById('inputReferralFriendDiscount').value) || 10;
      const minPayout = parseFloat(document.getElementById('inputReferralMinPayout').value) || 200;

      const btn = document.getElementById('btnSaveReferralSettings');
      const msgBox = document.getElementById('referralUpdateMsg');
      btn.disabled = true;
      btn.textContent = 'Saving...';
      msgBox.classList.add('hidden');

      try {
        const res = await fetch('/api/admin/referrals/settings', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + adminToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            referral_enabled: enabled,
            reward_type: rewardType,
            reward_value: rewardVal,
            friend_discount_type: 'percent',
            friend_discount_value: friendDisc,
            min_payout: minPayout
          })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          msgBox.className = 'mt-3 text-xs p-2.5 rounded-xl text-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
          msgBox.textContent = data.message || 'Referral settings saved!';
          msgBox.classList.remove('hidden');
          loadReferralSettings();
        } else {
          msgBox.className = 'mt-3 text-xs p-2.5 rounded-xl text-center bg-rose-500/10 text-rose-400 border border-rose-500/20';
          msgBox.textContent = data.error || 'Failed to save settings';
          msgBox.classList.remove('hidden');
        }
      } catch (err) {
        msgBox.className = 'mt-3 text-xs p-2.5 rounded-xl text-center bg-rose-500/10 text-rose-400 border border-rose-500/20';
        msgBox.textContent = 'Network error saving referral settings';
        msgBox.classList.remove('hidden');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Save Settings';
      }
    }

    let currentPayoutFilter = 'pending';
    async function loadPayoutRequests(status = 'pending', clickedBtn = null) {
      currentPayoutFilter = status;
      if (clickedBtn) {
        document.querySelectorAll('.payout-filter-btn').forEach(b => {
          b.className = 'payout-filter-btn px-2.5 py-1 rounded-lg text-slate-400 hover:text-white font-semibold transition-all';
        });
        clickedBtn.className = 'payout-filter-btn px-2.5 py-1 rounded-lg bg-cyan-500 text-slate-950 font-bold shadow-sm transition-all';
      }

      const tbody = document.getElementById('payoutsTableBody');
      try {
        const res = await fetch('/api/admin/payouts?status=' + status, {
          headers: { 'Authorization': 'Bearer ' + adminToken }
        });
        if (!res.ok) {
          tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-rose-400">Failed to load payouts.</td></tr>';
          return;
        }
        const data = await res.json();
        const payouts = data.payouts || [];

        const pendingCount = payouts.filter(p => p.status === 'pending').length;
        document.getElementById('pendingPayoutBadge').textContent = pendingCount + ' Pending Requests';

        if (!payouts.length) {
          tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-slate-500 italic">No withdrawal requests found for this filter.</td></tr>';
          return;
        }

        tbody.innerHTML = payouts.map(p => {
          const dateStr = new Date(p.created_at * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
          
          let statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">PENDING</span>';
          if (p.status === 'completed') {
            statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">PAID</span>';
          } else if (p.status === 'rejected') {
            statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">REJECTED</span>';
          }

          let detailsStr = '';
          if (p.payout_method === 'upi') {
            detailsStr = '<strong>UPI:</strong> ' + (p.upi_id || 'N/A');
          } else {
            detailsStr = '<strong>Bank:</strong> ' + (p.bank_name || '') + ' | Acc: ' + (p.bank_account || '') + ' | IFSC: ' + (p.bank_ifsc || '') + ' | Holder: ' + (p.bank_holder_name || '');
          }

          let actionsHtml = '';
          if (p.status === 'pending') {
            actionsHtml = \`
              <button onclick="openProcessPayoutModal('\${p.id}', '\${p.user_email}', \${p.amount}, '\${p.payout_method}', '\${encodeURIComponent(detailsStr)}')" class="px-2.5 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] transition-colors shadow-sm cursor-pointer">
                Process
              </button>
            \`;
          } else if (p.status === 'completed' && p.utr_number) {
            actionsHtml = '<span class="font-mono text-[10px] text-slate-400">UTR: ' + p.utr_number + '</span>';
          } else if (p.status === 'rejected' && p.admin_notes) {
            actionsHtml = '<span class="text-[10px] text-rose-400 italic">' + p.admin_notes + '</span>';
          }

          return \`
            <tr class="hover:bg-slate-900/50 transition-colors">
              <td class="px-4 py-3">
                <div class="font-bold text-white">\${p.user_name || 'Partner'}</div>
                <div class="text-[11px] text-slate-400">\${p.user_email}</div>
                <div class="font-mono text-[10px] text-cyan-400 mt-0.5">\${p.referral_code}</div>
              </td>
              <td class="px-4 py-3 font-mono font-black text-emerald-400 text-sm">
                ₹\${p.amount.toFixed(2)}
              </td>
              <td class="px-4 py-3 text-[11px] text-slate-300 max-w-xs">
                <div>\${detailsStr}</div>
              </td>
              <td class="px-4 py-3 text-[11px] text-slate-400 whitespace-nowrap">
                \${dateStr}
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                \${statusBadge}
              </td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                \${actionsHtml}
              </td>
            </tr>
          \`;
        }).join('');
      } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-rose-400">Network error loading payouts.</td></tr>';
      }
    }

    function openProcessPayoutModal(id, email, amount, method, encDetails) {
      document.getElementById('modalPayoutId').value = id;
      document.getElementById('modalPayoutUser').textContent = email;
      document.getElementById('modalPayoutAmount').textContent = '₹' + amount.toFixed(2);
      document.getElementById('modalPayoutMethod').textContent = method.toUpperCase();
      document.getElementById('modalPayoutDetails').innerHTML = decodeURIComponent(encDetails);
      document.getElementById('modalPayoutAction').value = 'completed';
      document.getElementById('modalPayoutUtr').value = '';
      document.getElementById('modalPayoutReason').value = '';
      togglePayoutActionFields();
      document.getElementById('processPayoutModal').classList.remove('hidden');
    }

    function closeProcessPayoutModal() {
      document.getElementById('processPayoutModal').classList.add('hidden');
    }

    function togglePayoutActionFields() {
      const action = document.getElementById('modalPayoutAction').value;
      if (action === 'completed') {
        document.getElementById('fieldUtr').classList.remove('hidden');
        document.getElementById('fieldRejectReason').classList.add('hidden');
      } else {
        document.getElementById('fieldUtr').classList.add('hidden');
        document.getElementById('fieldRejectReason').classList.remove('hidden');
      }
    }

    async function handleProcessPayoutSubmit(e) {
      e.preventDefault();
      const id = document.getElementById('modalPayoutId').value;
      const action = document.getElementById('modalPayoutAction').value;
      const utr = document.getElementById('modalPayoutUtr').value.trim();
      const reason = document.getElementById('modalPayoutReason').value.trim();
      const btn = document.getElementById('btnSubmitProcessPayout');

      btn.disabled = true;
      btn.textContent = 'Processing...';

      try {
        const res = await fetch('/api/admin/payouts/process', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + adminToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            payout_id: id,
            status: action,
            utr_number: action === 'completed' ? (utr || 'PROCESSED') : undefined,
            reason: action === 'rejected' ? (reason || 'Rejected by Admin') : undefined
          })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          closeProcessPayoutModal();
          showToast(action === 'completed' ? 'Payout marked as Completed!' : 'Payout rejected and refunded.');
          loadPayoutRequests(currentPayoutFilter);
          loadTopReferrers();
        } else {
          alert(data.error || 'Failed to process payout');
        }
      } catch (err) {
        alert('Network error processing payout');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Confirm Action';
      }
    }

    async function loadTopReferrers() {
      const container = document.getElementById('topReferrersList');
      if (!container) return;
      try {
        const res = await fetch('/api/admin/referrals/leaderboard', {
          headers: { 'Authorization': 'Bearer ' + adminToken }
        });
        if (!res.ok) return;
        const data = await res.json();
        const referrers = data.referrers || [];

        if (!referrers.length) {
          container.innerHTML = '<p class="text-xs text-slate-500 py-3 italic col-span-full text-center">No referrers active yet.</p>';
          return;
        }

        container.innerHTML = referrers.map((r, idx) => {
          return \`
            <div class="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between gap-2">
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-extrabold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">#\${idx + 1}</span>
                <span class="mono text-xs font-bold text-cyan-400">\${r.referral_code}</span>
              </div>
              <div>
                <div class="text-xs font-bold text-white truncate">\${r.user_name || 'Partner'}</div>
                <div class="text-[10px] text-slate-400 truncate">\${r.user_email}</div>
              </div>
              <div class="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-800">
                <span class="text-slate-400">Sales: <strong class="text-white">\${r.total_pro_sales}</strong></span>
                <span class="text-emerald-400 font-bold font-mono">₹\${r.total_earned.toFixed(0)}</span>
              </div>
            </div>
          \`;
        }).join('');
      } catch (err) {
        container.innerHTML = '<p class="text-xs text-rose-400 py-3 italic col-span-full text-center">Failed to load leaderboard.</p>';
      }
    }

    // -------------------------------------------------------------
    // Crash Reporting & Diagnostics Controller
    // -------------------------------------------------------------
    let cachedCrashReports = [];

    function scrollToCrashSection() {
      const el = document.getElementById('crashReportsSection');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }

    function escapeHtml(str) {
      return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    async function loadCrashReports() {
      const tbody = document.getElementById('crashReportsTableBody');
      if (!tbody) return;
      try {
        const res = await fetch('/api/admin/crash-reports?limit=50', {
          headers: { 'Authorization': 'Bearer ' + adminToken }
        });
        if (!res.ok) {
          tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-rose-400">Failed to load crash reports.</td></tr>';
          return;
        }
        const data = await res.json();
        cachedCrashReports = data.reports || [];
        const total = data.total ?? cachedCrashReports.length;
        const statEl = document.getElementById('statCrashReports');
        if (statEl) statEl.textContent = total;

        renderCrashReportsTable(cachedCrashReports);
      } catch (err) {
        console.error('Error loading crash reports:', err);
        tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-rose-400">Network error fetching crash reports.</td></tr>';
      }
    }

    function renderCrashReportsTable(reports) {
      const tbody = document.getElementById('crashReportsTableBody');
      if (!tbody) return;
      if (!reports.length) {
        tbody.innerHTML = \`
          <tr>
            <td colspan="6" class="px-4 py-10 text-center">
              <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 text-xl mb-2 border border-emerald-500/20">✓</div>
              <div class="text-sm font-semibold text-white">No Crashes Recorded</div>
              <p class="text-xs text-slate-400 mt-0.5">Your application builds are currently running healthy and crash-free!</p>
            </td>
          </tr>
        \`;
        return;
      }

      tbody.innerHTML = reports.map(r => {
        const dateStr = r.occurred_at
          ? new Date(r.occurred_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
          : new Date(r.created_at * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

        let sourceBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">REACT</span>';
        if (r.source === 'window') sourceBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">WINDOW</span>';
        if (r.source === 'promise') sourceBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">PROMISE</span>';

        return \`
          <tr class="hover:bg-slate-800/40 transition-colors">
            <td class="px-4 py-3">
              <span class="mono font-bold text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">\${escapeHtml(r.error_type)}</span>
            </td>
            <td class="px-4 py-3">\${sourceBadge}</td>
            <td class="px-4 py-3 font-mono font-semibold text-white text-xs">v\${escapeHtml(r.app_version)}</td>
            <td class="px-4 py-3 text-slate-300 text-xs">\${escapeHtml(r.platform)}</td>
            <td class="px-4 py-3 text-slate-400 text-xs font-mono whitespace-nowrap">\${dateStr}</td>
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <button onclick="openCrashInspectModal('\${r.id}')" class="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-semibold transition-colors flex items-center gap-1">
                  <span>🔍</span> Inspect
                </button>
                <button onclick="handleDeleteCrash('\${r.id}')" class="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 text-xs transition-colors" title="Delete Log">
                  ✕
                </button>
              </div>
            </td>
          </tr>
        \`;
      }).join('');
    }

    function openCrashInspectModal(id) {
      const r = cachedCrashReports.find(x => x.id === id);
      if (!r) return;
      document.getElementById('inspectErrorType').textContent = r.error_type;
      document.getElementById('inspectSource').textContent = r.source;
      document.getElementById('inspectVersion').textContent = 'v' + r.app_version;
      document.getElementById('inspectPlatform').textContent = r.platform;
      document.getElementById('inspectOccurredAt').textContent = r.occurred_at || new Date(r.created_at * 1000).toLocaleString();

      const framesBox = document.getElementById('inspectFrames');
      try {
        const frames = typeof r.frames === 'string' ? JSON.parse(r.frames) : r.frames;
        if (Array.isArray(frames) && frames.length > 0) {
          framesBox.innerHTML = frames.map((f, idx) => \`
            <div class="flex items-start gap-2 py-1 border-b border-slate-900/80 last:border-0">
              <span class="text-slate-500 text-[10px] select-none w-5 text-right font-mono">#\${idx + 1}</span>
              <span class="text-rose-300 font-semibold break-all">\${escapeHtml(f)}</span>
            </div>
          \`).join('');
        } else {
          framesBox.innerHTML = '<span class="text-slate-500 italic text-xs">No stack call frames captured.</span>';
        }
      } catch (e) {
        framesBox.textContent = String(r.frames);
      }

      document.getElementById('crashInspectModal').classList.remove('hidden');
    }

    function closeCrashInspectModal() {
      document.getElementById('crashInspectModal').classList.add('hidden');
    }

    async function handleDeleteCrash(id) {
      try {
        const res = await fetch('/api/admin/crash-reports/' + encodeURIComponent(id), {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer ' + adminToken }
        });
        if (res.ok) {
          showToast('Crash log removed');
          loadCrashReports();
          loadStats();
        } else {
          showToast('Failed to delete crash log');
        }
      } catch (err) {
        showToast('Network error deleting crash log');
      }
    }

    async function handleClearAllCrashes() {
      if (!cachedCrashReports.length) {
        showToast('No crash reports to clear');
        return;
      }
      if (!confirm('Are you sure you want to permanently clear all recorded crash reports?')) {
        return;
      }
      try {
        const res = await fetch('/api/admin/crash-reports/clear', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + adminToken }
        });
        if (res.ok) {
          showToast('All crash reports cleared successfully!');
          loadCrashReports();
          loadStats();
        } else {
          showToast('Failed to clear crash reports');
        }
      } catch (err) {
        showToast('Network error clearing crash reports');
      }
    }
  </script>

  <!-- Process Payout Modal -->
  <div id="processPayoutModal" class="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm hidden flex items-center justify-center p-4">
    <div class="glass-card w-full max-w-md p-6 rounded-2xl glow-cyan space-y-4 border border-slate-700">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-bold text-white flex items-center gap-2">
          <span>💸</span> Process Withdrawal Request
        </h3>
        <button onclick="closeProcessPayoutModal()" class="text-slate-400 hover:text-white text-lg">✕</button>
      </div>

      <div class="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
        <div class="flex justify-between"><span class="text-slate-400">Recipient:</span> <span id="modalPayoutUser" class="font-bold text-white"></span></div>
        <div class="flex justify-between"><span class="text-slate-400">Amount:</span> <span id="modalPayoutAmount" class="font-bold text-emerald-400 font-mono text-sm"></span></div>
        <div class="flex justify-between"><span class="text-slate-400">Method:</span> <span id="modalPayoutMethod" class="font-bold text-cyan-300 uppercase"></span></div>
        <div class="pt-2 border-t border-slate-800">
          <div class="text-slate-400 mb-1">Transfer Destination:</div>
          <div id="modalPayoutDetails" class="font-mono text-slate-200 bg-slate-950 p-2 rounded-lg border border-slate-800 text-[11px] break-all select-all"></div>
        </div>
      </div>

      <form id="processPayoutForm" onsubmit="handleProcessPayoutSubmit(event)" class="space-y-3">
        <input type="hidden" id="modalPayoutId">
        
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Select Action</label>
          <select id="modalPayoutAction" onchange="togglePayoutActionFields()" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-cyan-500">
            <option value="completed">✅ Mark Paid (Completed)</option>
            <option value="rejected">❌ Reject & Refund to Wallet</option>
          </select>
        </div>

        <div id="fieldUtr">
          <label class="block text-xs font-semibold text-slate-300 mb-1">Bank / UPI Reference (UTR Number)</label>
          <input type="text" id="modalPayoutUtr" placeholder="e.g. 426189218291" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500">
          <p class="text-[10px] text-slate-400 mt-1">This reference will be emailed to the user as proof of payment.</p>
        </div>

        <div id="fieldRejectReason" class="hidden">
          <label class="block text-xs font-semibold text-slate-300 mb-1">Rejection Reason</label>
          <input type="text" id="modalPayoutReason" placeholder="e.g. Invalid UPI ID / Account not found" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500">
          <p class="text-[10px] text-rose-400 mt-1">The requested funds will be automatically credited back to user's wallet.</p>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2">
          <button type="button" onclick="closeProcessPayoutModal()" class="px-3 py-1.5 rounded-xl text-slate-400 hover:text-white text-xs font-semibold">Cancel</button>
          <button type="submit" id="btnSubmitProcessPayout" class="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-cyan-500/20 transition-all">
            Confirm Action
          </button>
        </div>
      </form>
    </div>
  </div>
</body>
</html>`;
}
