export function renderEveykaHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Eveyka Software | TG Drive Lifetime Pro & Cloud Portal</title>
  <meta name="description" content="Eveyka Software - Official Licensing, Direct Purchase & Download Portal for TG Drive Lifetime Pro. Unlimited Cloud Storage with Zero Ads." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg-dark: #07090e;
      --bg-card: rgba(13, 19, 34, 0.78);
      --bg-card-hover: rgba(22, 32, 56, 0.9);
      --accent-cyan: #00d2ff;
      --accent-blue: #3a7bd5;
      --accent-emerald: #10b981;
      --accent-amber: #f59e0b;
      --accent-purple: #8b5cf6;
      --accent-red: #ef4444;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --border-color: rgba(255, 255, 255, 0.1);
      --border-glow: rgba(0, 210, 255, 0.3);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: var(--bg-dark);
      color: var(--text-main);
      line-height: 1.6;
      background-image: 
        radial-gradient(circle at 15% 10%, rgba(0, 210, 255, 0.10) 0%, transparent 45%),
        radial-gradient(circle at 85% 35%, rgba(58, 123, 213, 0.10) 0%, transparent 45%),
        radial-gradient(circle at 50% 85%, rgba(139, 92, 246, 0.08) 0%, transparent 50%);
      background-attachment: fixed;
      min-height: 100vh;
    }
    .mono { font-family: 'JetBrains Mono', monospace; }
    .container { max-width: 1160px; margin: 0 auto; padding: 0 24px; }
    
    /* Header */
    header {
      position: sticky; top: 0; z-index: 100;
      backdrop-filter: blur(20px);
      background: rgba(7, 9, 14, 0.88);
      border-bottom: 1px solid var(--border-color);
    }
    .nav-wrapper { display: flex; justify-content: space-between; align-items: center; height: 74px; }
    .brand-logo { display: flex; align-items: center; gap: 12px; text-decoration: none; color: var(--text-main); }
    .logo-emblem {
      width: 42px; height: 42px;
      background: linear-gradient(135deg, var(--accent-cyan), var(--accent-blue));
      border-radius: 12px; display: flex; align-items: center; justify-content: center;
      font-weight: 900; font-size: 22px; color: #07090e; box-shadow: 0 0 24px rgba(0, 210, 255, 0.45);
    }
    .brand-name { font-weight: 800; font-size: 1.25rem; letter-spacing: -0.5px; }
    .brand-sub { font-size: 0.72rem; color: var(--accent-cyan); font-weight: 700; text-transform: uppercase; letter-spacing: 1px; display: block; }
    .nav-links { display: flex; gap: 28px; align-items: center; list-style: none; }
    .nav-links a { color: var(--text-muted); text-decoration: none; font-size: 0.9rem; font-weight: 600; transition: color 0.2s; }
    .nav-links a:hover { color: var(--accent-cyan); }
    
    /* Buttons */
    .btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      padding: 12px 24px; border-radius: 12px; font-weight: 700; font-size: 0.95rem;
      text-decoration: none; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; border: none;
    }
    .btn-primary {
      background: linear-gradient(135deg, #00d2ff, #3a7bd5); color: #050b14;
      box-shadow: 0 4px 20px rgba(0, 210, 255, 0.35);
    }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0, 210, 255, 0.55); filter: brightness(1.05); }
    .btn-secondary { background: rgba(255, 255, 255, 0.05); color: var(--text-main); border: 1px solid var(--border-color); }
    .btn-secondary:hover { background: rgba(255, 255, 255, 0.1); border-color: var(--border-glow); }
    .btn-success { background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; box-shadow: 0 4px 20px rgba(16, 185, 129, 0.35); }
    .btn-success:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(16, 185, 129, 0.5); }
    
    /* Hero */
    .hero { padding: 70px 0 40px; text-align: center; }
    .badge {
      display: inline-flex; align-items: center; gap: 8px; padding: 6px 18px;
      border-radius: 9999px; background: rgba(0, 210, 255, 0.12); border: 1px solid rgba(0, 210, 255, 0.3);
      color: var(--accent-cyan); font-size: 0.8rem; font-weight: 800; text-transform: uppercase; margin-bottom: 24px;
      letter-spacing: 0.5px;
    }
    .hero h1 {
      font-size: 3.4rem; font-weight: 900; line-height: 1.15; letter-spacing: -1.5px; margin-bottom: 20px;
    }
    .gradient-text {
      background: linear-gradient(135deg, #00d2ff 0%, #3a7bd5 60%, #93c5fd 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .hero p { font-size: 1.15rem; color: var(--text-muted); max-width: 720px; margin: 0 auto 34px; line-height: 1.65; }
    .hero-cta { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; margin-bottom: 40px; }

    /* Trust Stats Strip */
    .trust-strip {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 16px;
      margin: 10px auto 60px; max-width: 1000px;
    }
    .trust-item {
      background: rgba(15, 23, 42, 0.5); border: 1px solid var(--border-color);
      border-radius: 16px; padding: 18px; text-align: center; backdrop-filter: blur(12px);
    }
    .trust-icon { font-size: 1.4rem; margin-bottom: 4px; }
    .trust-title { font-size: 1.1rem; font-weight: 800; color: #ffffff; }
    .trust-desc { font-size: 0.8rem; color: var(--text-muted); }

    /* Section Header */
    .section-title { text-align: center; margin-bottom: 36px; }
    .section-title h2 { font-size: 2.2rem; font-weight: 800; margin-bottom: 8px; letter-spacing: -0.5px; }
    .section-title p { color: var(--text-muted); font-size: 0.98rem; }

    /* Interactive Checkout Station */
    .checkout-container { max-width: 840px; margin: 0 auto 80px; }
    .checkout-card {
      background: var(--bg-card); border: 2px solid rgba(0, 210, 255, 0.4);
      border-radius: 28px; padding: 36px 40px; backdrop-filter: blur(20px);
      box-shadow: 0 16px 60px rgba(0, 210, 255, 0.14); position: relative;
    }
    .checkout-badge {
      position: absolute; top: -14px; right: 32px;
      background: linear-gradient(135deg, var(--accent-cyan), var(--accent-blue));
      color: #07090e; font-size: 0.75rem; font-weight: 900; padding: 5px 16px; border-radius: 9999px;
      text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 14px rgba(0, 210, 255, 0.4);
    }

    /* Tabs */
    .checkout-tabs {
      display: flex; gap: 8px; background: rgba(0, 0, 0, 0.4); border: 1px solid var(--border-color);
      padding: 6px; border-radius: 16px; margin-bottom: 28px;
    }
    .checkout-tab-btn {
      flex: 1; padding: 12px; border-radius: 12px; font-size: 0.95rem; font-weight: 700;
      border: none; background: transparent; color: var(--text-muted); cursor: pointer;
      transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .checkout-tab-btn.active {
      background: linear-gradient(135deg, rgba(0, 210, 255, 0.18), rgba(58, 123, 213, 0.25));
      color: var(--accent-cyan); border: 1px solid rgba(0, 210, 255, 0.4);
    }

    /* Flash Offer Banner */
    .offer-banner {
      display: none;
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.16) 0%, rgba(234, 88, 12, 0.16) 100%);
      border: 1px solid rgba(245, 158, 11, 0.45);
      border-radius: 16px; padding: 16px 20px; margin-bottom: 26px; text-align: left;
    }
    .offer-badge {
      font-size: 0.72rem; font-weight: 800; background: var(--accent-amber); color: #000;
      padding: 3px 10px; border-radius: 6px; text-transform: uppercase;
    }
    .offer-timer {
      font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; font-weight: 800;
      background: #090e18; color: #fbbf24; padding: 6px 14px; border-radius: 10px;
      border: 1px solid rgba(245, 158, 11, 0.4); white-space: nowrap;
    }

    /* Form Fields */
    .form-group { margin-bottom: 20px; text-align: left; }
    .form-label { display: block; font-size: 0.85rem; font-weight: 700; color: #cbd5e1; margin-bottom: 8px; }
    .form-label span.req { color: var(--accent-cyan); }
    .input-field {
      width: 100%; padding: 14px 18px; border-radius: 12px;
      background: rgba(10, 15, 29, 0.9); border: 1px solid var(--border-color);
      color: #ffffff; font-size: 0.98rem; font-family: inherit; transition: all 0.2s;
    }
    .input-field:focus {
      outline: none; border-color: var(--accent-cyan);
      box-shadow: 0 0 0 3px rgba(0, 210, 255, 0.18);
    }
    .input-hint { font-size: 0.78rem; color: var(--text-muted); margin-top: 6px; }

    /* Coupon Input Row */
    .coupon-box { display: flex; gap: 10px; }
    .coupon-input {
      flex: 1; padding: 12px 16px; border-radius: 12px;
      background: rgba(10, 15, 29, 0.9); border: 1px dashed rgba(255, 255, 255, 0.2);
      color: #ffffff; font-size: 0.95rem; font-family: 'JetBrains Mono', monospace; text-transform: uppercase;
    }
    .coupon-input:focus { outline: none; border-color: var(--accent-amber); border-style: solid; }
    .coupon-btn {
      padding: 12px 20px; border-radius: 12px; font-weight: 700; font-size: 0.9rem;
      background: rgba(245, 158, 11, 0.18); border: 1px solid rgba(245, 158, 11, 0.4);
      color: #fef08a; cursor: pointer; transition: all 0.2s;
    }
    .coupon-btn:hover { background: rgba(245, 158, 11, 0.3); }

    /* Price Summary Box */
    .summary-box {
      background: rgba(0, 0, 0, 0.35); border: 1px solid var(--border-color);
      border-radius: 16px; padding: 20px 24px; margin: 24px 0;
    }
    .summary-line {
      display: flex; justify-content: space-between; align-items: center;
      font-size: 0.92rem; color: var(--text-muted); margin-bottom: 10px;
    }
    .summary-total {
      display: flex; justify-content: space-between; align-items: baseline;
      border-top: 1px solid var(--border-color); padding-top: 14px; margin-top: 14px;
    }
    .total-label { font-size: 1.1rem; font-weight: 800; color: #ffffff; }
    .total-amount { font-size: 2.5rem; font-weight: 900; color: #ffffff; line-height: 1; }
    .strike-orig { text-decoration: line-through; color: #64748b; font-size: 1.2rem; margin-right: 8px; }

    /* Alerts */
    .alert-box {
      padding: 14px 18px; border-radius: 12px; font-size: 0.88rem; margin-bottom: 18px; display: none;
    }
    .alert-error { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.35); color: #fca5a5; }
    .alert-success { background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.35); color: #6ee7b7; }

    /* Feature Grid */
    .feature-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px;
      margin-bottom: 80px;
    }
    .feature-card {
      background: var(--bg-card); border: 1px solid var(--border-color);
      border-radius: 20px; padding: 28px; backdrop-filter: blur(12px); transition: transform 0.2s, border-color 0.2s;
    }
    .feature-card:hover { transform: translateY(-3px); border-color: var(--border-glow); background: var(--bg-card-hover); }
    .feature-icon-wrap {
      width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center;
      font-size: 1.5rem; margin-bottom: 16px; background: rgba(0, 210, 255, 0.12); color: var(--accent-cyan);
    }
    .feature-card h3 { font-size: 1.2rem; font-weight: 800; margin-bottom: 8px; color: #ffffff; }
    .feature-card p { font-size: 0.9rem; color: var(--text-muted); line-height: 1.6; }

    /* Download Cards */
    .download-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;
      margin-bottom: 80px;
    }
    .download-card {
      background: var(--bg-card); border: 1px solid var(--border-color);
      border-radius: 22px; padding: 32px; text-align: center;
    }
    .download-card h3 { font-size: 1.3rem; font-weight: 800; margin-bottom: 6px; }
    .download-card p { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 22px; }

    /* Policies */
    .policy-section {
      background: rgba(13, 19, 34, 0.5); border: 1px solid var(--border-color);
      border-radius: 24px; padding: 40px 32px; margin-bottom: 70px;
    }
    .policy-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; margin-top: 24px; }
    .policy-item {
      background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 14px; padding: 22px;
    }
    .policy-item h3 { font-size: 1rem; font-weight: 700; margin-bottom: 8px; color: var(--accent-cyan); }
    .policy-item p { font-size: 0.85rem; color: var(--text-muted); line-height: 1.6; }

    /* Support Desk Box */
    .support-box {
      text-align: center; padding: 40px;
      background: linear-gradient(180deg, rgba(0, 210, 255, 0.06) 0%, rgba(13, 19, 34, 0.8) 100%);
      border: 1px solid var(--border-glow); border-radius: 24px; margin-bottom: 70px;
    }

    footer {
      border-top: 1px solid var(--border-color); padding: 40px 0; text-align: center;
      color: var(--text-muted); font-size: 0.85rem;
    }
    footer a { color: var(--accent-cyan); text-decoration: none; }
    footer a:hover { text-decoration: underline; }

    @media (max-width: 768px) {
      .hero h1 { font-size: 2.3rem; }
      .nav-links { display: none; }
      .checkout-card { padding: 24px 20px; }
      .coupon-box { flex-direction: column; }
    }
  </style>
</head>
<body>

  <!-- Sticky Header -->
  <header>
    <div class="container nav-wrapper">
      <a href="#" class="brand-logo">
        <div class="logo-emblem">E</div>
        <div>
          <span class="brand-name">Eveyka Software</span>
          <span class="brand-sub">TG Drive Pro Portal</span>
        </div>
      </a>
      <ul class="nav-links">
        <li><a href="#features">Features</a></li>
        <li><a href="#pricing">Buy Pro License</a></li>
        <li><a href="#download">Download App</a></li>
        <li><a href="/recover">Key Recovery</a></li>
        <li><a href="#policies">Policies</a></li>
      </ul>
      <a href="#pricing" class="btn btn-primary">Buy License Key</a>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="hero container">
    <div class="badge">✦ Official Commercial Portal</div>
    <h1>Unlimited Cloud Storage.<br/><span class="gradient-text">Powered by Telegram. Zero Ads.</span></h1>
    <p>
      Eveyka Software develops TG Drive Pro: turn your personal Telegram into an ultra-fast, encrypted cloud disk with zero monthly subscriptions, up to 100 MB/s direct MTProto speed, and cross-platform desktop & phone sync.
    </p>
    <div class="hero-cta">
      <a href="#pricing" class="btn btn-primary" style="font-size: 1.05rem; padding: 14px 30px;">
        ⚡ Buy Lifetime Pro License
      </a>
      <a href="#download" class="btn btn-secondary" style="font-size: 1.05rem; padding: 14px 26px;">
        📱 Download Android App
      </a>
      <a href="/recover" class="btn btn-secondary" style="font-size: 1.05rem; padding: 14px 26px;">
        🔑 Recover Existing Key
      </a>
    </div>

    <!-- Trust Stats -->
    <div class="trust-strip">
      <div class="trust-item">
        <div class="trust-icon">∞</div>
        <div class="trust-title">Unlimited Storage</div>
        <div class="trust-desc">No 15 GB Google limits</div>
      </div>
      <div class="trust-item">
        <div class="trust-icon">⚡</div>
        <div class="trust-title">100 MB/s Speed</div>
        <div class="trust-desc">Direct Telegram MTProto</div>
      </div>
      <div class="trust-item">
        <div class="trust-icon">🔒</div>
        <div class="trust-title">Client-Side Vault</div>
        <div class="trust-desc">Zero-knowledge AES-256</div>
      </div>
      <div class="trust-item">
        <div class="trust-icon">💻</div>
        <div class="trust-title">Dual Device Access</div>
        <div class="trust-desc">1 PC + 1 Mobile simultaneously</div>
      </div>
    </div>
  </section>

  <!-- Checkout / Purchase Station -->
  <section id="pricing" class="container">
    <div class="section-title">
      <h2>Instant Digital Purchase & Activation</h2>
      <p>Official commercial license key delivered to your email with certified tax invoice & PDF document</p>
    </div>

    <div class="checkout-container">
      <div class="checkout-card">
        <div class="checkout-badge" id="editionBadge">LIFETIME ACCESS</div>

        <!-- Mode Tabs: Buy vs Free Trial -->
        <div class="checkout-tabs">
          <button id="tabBuyBtn" type="button" class="checkout-tab-btn active" onclick="switchTab('buy')">
            ⚡ Purchase Lifetime Pro
          </button>
          <button id="tabTrialBtn" type="button" class="checkout-tab-btn" onclick="switchTab('trial')">
            🎁 Claim 30-Day Free Trial
          </button>
        </div>

        <!-- Flash Sale / Active Offer Banner -->
        <div id="offerBanner" class="offer-banner">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap;">
            <div>
              <span id="offerBadgeTag" class="offer-badge">FLASH SALE</span>
              <h4 id="offerTitle" style="color: #fef08a; font-size: 1.05rem; margin-top: 6px; font-weight: 800;">Special Promotion Active!</h4>
              <p id="offerDescription" style="color: #fde68a; font-size: 0.85rem; margin-top: 2px;">Promotional discount automatically applied at checkout.</p>
            </div>
            <div id="offerTimer" class="offer-timer">
              --:--:--
            </div>
          </div>
        </div>

        <!-- General Alert Box -->
        <div id="statusAlert" class="alert-box"></div>

        <!-- BUY TAB CONTENT -->
        <div id="buySection">
          <form id="purchaseForm" onsubmit="handleProceedToPayment(event)">
            <div class="form-group">
              <label class="form-label" for="custName">Your Full Name <span class="req">*</span></label>
              <input type="text" id="custName" class="input-field" placeholder="e.g. Alex Morgan" required />
              <p class="input-hint">Will be embossed on your official digital PDF Certificate & tax invoice.</p>
            </div>

            <div class="form-group">
              <label class="form-label" for="custEmail">Delivery Email Address <span class="req">*</span></label>
              <input type="email" id="custEmail" class="input-field" placeholder="e.g. alex@example.com" required oninput="handleEmailInput()" />
              <p id="emailSuggestionHint" class="input-hint" style="color: var(--accent-amber); display: none;"></p>
              <p class="input-hint">Your unique TGDRV license key is emailed here instantly after payment confirmation.</p>
            </div>

            <div class="form-group">
              <label class="form-label" for="promoCode">Promo / Friend Referral Code (Optional)</label>
              <div class="coupon-box">
                <input type="text" id="promoCode" class="coupon-input" placeholder="Enter coupon or referral code" />
                <button type="button" id="applyCouponBtn" class="coupon-btn" onclick="applyCouponCode()">Apply Code</button>
              </div>
              <div id="couponFeedback" style="font-size: 0.82rem; margin-top: 6px; font-weight: 600; display: none;"></div>
            </div>

            <!-- Price Breakdown Summary -->
            <div class="summary-box">
              <div class="summary-line">
                <span>Standard Lifetime Price</span>
                <span id="summaryBasePrice" class="mono">₹399.00</span>
              </div>
              <div id="summaryOfferRow" class="summary-line" style="display: none; color: #f59e0b;">
                <span id="summaryOfferLabel">Festival Special Offer</span>
                <span id="summaryOfferValue" class="mono">-₹0.00</span>
              </div>
              <div id="summaryCouponRow" class="summary-line" style="display: none; color: #10b981;">
                <span id="summaryCouponLabel">Promo / Referral Discount</span>
                <span id="summaryCouponValue" class="mono">-₹0.00</span>
              </div>
              <div class="summary-total">
                <span class="total-label">Final Payable Amount:</span>
                <div>
                  <span id="strikePriceDisplay" class="strike-orig mono" style="display: none;">₹399</span>
                  <span id="finalPriceDisplay" class="total-amount mono">₹399</span>
                </div>
              </div>
            </div>

            <!-- Submit Button -->
            <button type="submit" id="buySubmitBtn" class="btn btn-primary" style="width: 100%; font-size: 1.1rem; padding: 16px;">
              🔒 Proceed to Secure Payment
            </button>
          </form>

          <div style="margin-top: 18px; display: flex; justify-content: center; gap: 16px; flex-wrap: wrap; font-size: 0.8rem; color: var(--text-muted); text-align: center;">
            <span>🛡️ 256-Bit Bank Encryption</span>
            <span>•</span>
            <span>⚡ Instant Key Delivery via Email</span>
            <span>•</span>
            <span>💳 UPI (GPay/PhonePe/Paytm), Cards & NetBanking</span>
          </div>
        </div>

        <!-- FREE TRIAL TAB CONTENT -->
        <div id="trialSection" style="display: none;">
          <div style="text-align: left; margin-bottom: 24px;">
            <h3 style="color: var(--accent-cyan); font-size: 1.3rem; margin-bottom: 4px;">Experience Pro Completely Free</h3>
            <p style="color: var(--text-muted); font-size: 0.88rem;">Enjoy 100% ad-free cloud synchronization for 30 days. No credit card required.</p>
          </div>

          <form id="trialForm" onsubmit="handleClaimFreeTrial(event)">
            <div class="form-group">
              <label class="form-label" for="trialName">Your Full Name <span class="req">*</span></label>
              <input type="text" id="trialName" class="input-field" placeholder="e.g. Alex Morgan" required />
            </div>

            <div class="form-group">
              <label class="form-label" for="trialEmail">Your Email Address <span class="req">*</span></label>
              <input type="email" id="trialEmail" class="input-field" placeholder="e.g. alex@example.com" required />
              <p class="input-hint">Your 30-day trial license certificate and key will be emailed immediately.</p>
            </div>

            <button type="submit" id="trialSubmitBtn" class="btn btn-success" style="width: 100%; font-size: 1.1rem; padding: 16px;">
              🎁 Claim Free 30-Day Trial Key
            </button>
          </form>

          <!-- Activated Trial Result Box -->
          <div id="trialSuccessBox" style="display: none; margin-top: 24px; padding: 24px; border-radius: 16px; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.4); text-align: left;">
            <h4 style="color: #6ee7b7; font-size: 1.1rem; margin-bottom: 8px;">🎉 Free Trial Activated Successfully!</h4>
            <p style="font-size: 0.88rem; color: #e2e8f0; margin-bottom: 14px;">Here is your trial license key. We've also dispatched your official PDF certificate to your email.</p>
            <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 14px;">
              <input type="text" id="trialKeyOutput" readonly class="input-field mono" style="font-weight: 800; font-size: 1.1rem; color: #34d399; background: #061510; border-color: rgba(52, 211, 153, 0.4);" />
              <button type="button" class="btn btn-primary" onclick="copyTrialKey()">Copy</button>
            </div>
            <a href="#download" class="btn btn-secondary" style="width: 100%; font-size: 0.9rem;">
              Download TG Drive App & Activate Key →
            </a>
          </div>
        </div>

      </div>
    </div>
  </section>

  <!-- Core Features Section -->
  <section id="features" class="container">
    <div class="section-title">
      <h2>Engineered for Power & Privacy</h2>
      <p>Why hundreds of users choose TG Drive Lifetime Pro over expensive monthly cloud subscriptions</p>
    </div>

    <div class="feature-grid">
      <div class="feature-card">
        <div class="feature-icon-wrap">∞</div>
        <h3>Unlimited Cloud Capacity</h3>
        <p>No 15 GB Google limits or storage tiers. Back up whole video libraries, RAW photos, software archives, and database dumps directly through Telegram's global infrastructure.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon-wrap">🚫</div>
        <h3>100% Ad-Free Experience</h3>
        <p>Zero popups, banner ads, or sponsors. Pure, clean productivity with maximum allocated download bandwidth and multi-connection acceleration.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon-wrap">🔐</div>
        <h3>Zero-Knowledge Cloud Vault</h3>
        <p>Optionally encrypt sensitive files locally with your master passphrase using military-grade AES-256 before upload. Telegram servers only see encrypted noise.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon-wrap">🔄</div>
        <h3>Automatic Folder & Camera Backup</h3>
        <p>Set and forget: mirror local PC directories or your phone's camera roll straight to your cloud in the background with smart deduplication.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon-wrap">🎬</div>
        <h3>Instant Media Streaming</h3>
        <p>Watch 4K / 1080p videos with instant seek without downloading the full file first. Built-in audio player with playlist management and PDF document viewer.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon-wrap">⚡</div>
        <h3>Instant Fulfillment & Recovery</h3>
        <p>Your license key and official signed PDF certificate arrive within 60 seconds. Lost your key? Use our 24/7 OTP Key Recovery Portal anytime.</p>
      </div>
    </div>
  </section>

  <!-- Download Section -->
  <section id="download" class="container">
    <div class="section-title">
      <h2>Download TG Drive Client Apps</h2>
      <p>Install the app on your phone or PC, connect your Telegram account, and activate your Pro Key</p>
    </div>

    <div class="download-grid">
      <div class="download-card">
        <div style="font-size: 2.5rem; margin-bottom: 12px;">📱</div>
        <h3>Android Application</h3>
        <p>Optimized for Android smartphones. Lightweight ~11.6 MB APK with fast camera roll sync.</p>
        <a href="https://github.com/jupiterbania/Telegram-Drive/releases/latest" target="_blank" class="btn btn-primary" style="width: 100%;">
          Download Android APK
        </a>
      </div>

      <div class="download-card">
        <div style="font-size: 2.5rem; margin-bottom: 12px;">💻</div>
        <h3>Windows Desktop</h3>
        <p>Native 64-bit application with virtual folder mapping, multi-threaded transfer, and tray minimize.</p>
        <a href="https://github.com/jupiterbania/Telegram-Drive/releases/latest" target="_blank" class="btn btn-secondary" style="width: 100%;">
          Download Windows (x64)
        </a>
      </div>

      <div class="download-card">
        <div style="font-size: 2.5rem; margin-bottom: 12px;">🔑</div>
        <h3>Self-Service Recovery</h3>
        <p>Already a supporter? Retrieve your active license key and PDF certificate with an email OTP code.</p>
        <a href="/recover" class="btn btn-secondary" style="width: 100%;">
          Open Recovery Portal
        </a>
      </div>
    </div>
  </section>

  <!-- Policies & Merchant Terms -->
  <section id="policies" class="container">
    <div class="policy-section">
      <div class="section-title" style="margin-bottom: 20px;">
        <h2>Merchant & Customer Protection Policies</h2>
        <p>Fully compliant with consumer protection norms and RBI payment gateway regulations</p>
      </div>

      <div class="policy-grid">
        <div class="policy-item">
          <h3>1. Merchant Identity</h3>
          <p><strong>Eveyka Software</strong> develops cross-platform utility software, secure cloud storage synchronization agents, and digital productivity tools.</p>
        </div>
        <div class="policy-item">
          <h3>2. Digital Fulfillment</h3>
          <p>Products are digital commercial software licenses. Upon payment confirmation, license keys & signed PDF certificates are dispatched instantly via automated email.</p>
        </div>
        <div class="policy-item">
          <h3>3. Refund & Cancellation</h3>
          <p>We provide full technical support for key activations. For key replacement or resolution queries, contact our desk within 24 hours of purchase.</p>
        </div>
        <div class="policy-item">
          <h3>4. Terms of Service</h3>
          <p>Purchasing grants a perpetual non-transferable personal license key for use on desktop and mobile client applications.</p>
        </div>
        <div class="policy-item">
          <h3>5. Privacy & Security</h3>
          <p>We do not store payment card credentials. All transactions are securely processed by Razorpay's RBI-compliant gateway with 256-bit SSL encryption.</p>
        </div>
        <div class="policy-item">
          <h3>6. Support Desk</h3>
          <p>24/7 self-service key recovery at <a href="/recover" style="color: var(--accent-cyan);">/recover</a> and support via Telegram at <strong>@Theexposes</strong>.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Support Desk -->
  <section id="contact" class="container">
    <div class="support-box">
      <h2 style="font-size: 1.8rem; margin-bottom: 10px;">Customer Support Desk</h2>
      <p style="color: var(--text-muted); max-width: 620px; margin: 0 auto 24px; font-size: 0.95rem;">
        Have a question about your order, license key, or feature setup? Our team is active on Telegram to assist you.
      </p>
      <div style="display: flex; gap: 14px; justify-content: center; flex-wrap: wrap;">
        <a href="https://t.me/Theexposes" target="_blank" class="btn btn-primary" style="font-size: 1rem;">
          💬 Telegram Support: @Theexposes
        </a>
        <a href="/recover" class="btn btn-secondary" style="font-size: 1rem;">
          🔑 License Recovery Portal
        </a>
      </div>
    </div>
  </section>

  <!-- Legal Disclaimer -->
  <div class="container" style="margin-bottom: 30px;">
    <p style="font-size: 0.78rem; color: #64748b; line-height: 1.6; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.06); padding-top: 24px;">
      <strong>Disclaimer & Non-Affiliation Notice:</strong> TG Drive (Telegram Drive) is an independent utility application developed by Eveyka Software using Telegram's official open-source MTProto / Bot API protocol. It is not affiliated with, sponsored, or endorsed by Telegram Messenger Inc. All product names, logos, and brands are property of their respective owners.
    </p>
  </div>

  <!-- Footer -->
  <footer>
    <div class="container">
      <p>© 2026 <strong>Eveyka Software</strong>. All Rights Reserved.</p>
      <p style="margin-top: 8px; font-size: 0.8rem; color: #64748b;">
        Secure Payment Gateway powered by Razorpay • Support Desk: <a href="https://t.me/Theexposes">@Theexposes</a> • <a href="/recover">Self-Service Key Recovery</a> • <a href="/admin">Admin Panel</a>
      </p>
    </div>
  </footer>

  <!-- Interactive JavaScript Engine -->
  <script>
    // State Variables
    let storeBasePrice = 399;
    let currentOffer = null;
    let appliedDiscount = null; // { type: 'percent'|'fixed', value: number, text: string, code: string, is_referral?: boolean }
    let fallbackStoreUrl = 'https://rzp.io/rzp/eBLEV0w';

    // Tab switcher
    function switchTab(mode) {
      const buySection = document.getElementById('buySection');
      const trialSection = document.getElementById('trialSection');
      const tabBuyBtn = document.getElementById('tabBuyBtn');
      const tabTrialBtn = document.getElementById('tabTrialBtn');
      const editionBadge = document.getElementById('editionBadge');

      if (mode === 'trial') {
        buySection.style.display = 'none';
        trialSection.style.display = 'block';
        tabBuyBtn.classList.remove('active');
        tabTrialBtn.classList.add('active');
        editionBadge.textContent = '30-DAY FREE TRIAL';
      } else {
        buySection.style.display = 'block';
        trialSection.style.display = 'none';
        tabTrialBtn.classList.remove('active');
        tabBuyBtn.classList.add('active');
        editionBadge.textContent = 'LIFETIME ACCESS';
      }
      hideAlert();
    }

    // Alert helper
    function showAlert(msg, isSuccess = false) {
      const el = document.getElementById('statusAlert');
      el.textContent = msg;
      el.className = 'alert-box ' + (isSuccess ? 'alert-success' : 'alert-error');
      el.style.display = 'block';
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    function hideAlert() {
      const el = document.getElementById('statusAlert');
      el.style.display = 'none';
    }

    // Recalculate and render prices
    function updatePriceCalculations() {
      let price = storeBasePrice;
      let offerCut = 0;
      let couponCut = 0;

      // 1. Calculate active offer discount
      if (currentOffer) {
        if (currentOffer.discount_type === 'percent' && currentOffer.discount_value > 0) {
          offerCut = (price * currentOffer.discount_value) / 100;
        } else if ((currentOffer.discount_type === 'flat' || currentOffer.discount_type === 'fixed') && currentOffer.discount_value > 0) {
          offerCut = currentOffer.discount_value;
        } else if (typeof currentOffer.offer_price === 'number' && currentOffer.offer_price > 0 && currentOffer.offer_price < price) {
          offerCut = price - currentOffer.offer_price;
        }
      }
      const priceAfterOffer = Math.max(1, price - offerCut);

      // 2. Calculate coupon or referral discount on top of offer price
      if (appliedDiscount) {
        if (appliedDiscount.type === 'percent' && appliedDiscount.value > 0) {
          couponCut = (priceAfterOffer * appliedDiscount.value) / 100;
        } else if (appliedDiscount.value > 0) {
          couponCut = appliedDiscount.value;
        }
      }
      const finalPrice = Math.max(1, Math.round(priceAfterOffer - couponCut));

      // Update DOM
      document.getElementById('summaryBasePrice').textContent = '₹' + storeBasePrice.toFixed(2);
      
      const offerRow = document.getElementById('summaryOfferRow');
      if (offerCut > 0) {
        offerRow.style.display = 'flex';
        document.getElementById('summaryOfferLabel').textContent = currentOffer.title || 'Special Promotion';
        document.getElementById('summaryOfferValue').textContent = '-₹' + Math.round(offerCut).toFixed(2);
      } else {
        offerRow.style.display = 'none';
      }

      const couponRow = document.getElementById('summaryCouponRow');
      if (couponCut > 0) {
        couponRow.style.display = 'flex';
        document.getElementById('summaryCouponLabel').textContent = appliedDiscount.text || 'Promo Discount';
        document.getElementById('summaryCouponValue').textContent = '-₹' + Math.round(couponCut).toFixed(2);
      } else {
        couponRow.style.display = 'none';
      }

      const strikeEl = document.getElementById('strikePriceDisplay');
      if (finalPrice < storeBasePrice) {
        strikeEl.style.display = 'inline';
        strikeEl.textContent = '₹' + storeBasePrice;
      } else {
        strikeEl.style.display = 'none';
      }

      document.getElementById('finalPriceDisplay').textContent = '₹' + finalPrice;
      document.getElementById('buySubmitBtn').textContent = '🔒 Proceed to Secure Payment (₹' + finalPrice + ')';
    }

    // Real-Time Email typo detection
    function handleEmailInput() {
      const email = document.getElementById('custEmail').value.trim().toLowerCase();
      const hint = document.getElementById('emailSuggestionHint');
      const typoMap = {
        'gmai.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmial.com': 'gmail.com',
        'yaho.com': 'yahoo.com', 'hotmial.com': 'hotmail.com', 'outlok.com': 'outlook.com'
      };

      if (email.includes('@')) {
        const domain = email.split('@')[1];
        if (typoMap[domain]) {
          const corrected = email.split('@')[0] + '@' + typoMap[domain];
          hint.textContent = 'Did you mean ' + corrected + '? Please check your email to ensure key delivery.';
          hint.style.display = 'block';
          return;
        }
      }
      hint.style.display = 'none';
    }

    // Coupon & Referral Validation
    async function applyCouponCode(customCode = null) {
      const input = document.getElementById('promoCode');
      const code = (customCode || input.value).trim().toUpperCase();
      const feedback = document.getElementById('couponFeedback');
      const btn = document.getElementById('applyCouponBtn');

      if (!code) {
        feedback.textContent = 'Please enter a coupon or referral code.';
        feedback.style.color = '#ef4444';
        feedback.style.display = 'block';
        return;
      }

      btn.textContent = 'Checking...';
      btn.disabled = true;

      try {
        const res = await fetch('/api/store/validate-coupon?code=' + encodeURIComponent(code));
        const data = await res.json();

        if (res.ok && data.valid) {
          appliedDiscount = {
            type: data.discount_type || 'percent',
            value: data.discount_value || 10,
            text: data.discount_text || (data.is_referral ? 'Referral Discount' : 'Coupon Discount'),
            code: data.code,
            is_referral: !!data.is_referral,
          };
          input.value = data.code;
          feedback.innerHTML = '🎉 <span style="color: #34d399;">' + appliedDiscount.text + ' applied!</span> <a href="javascript:void(0)" onclick="removeCoupon()" style="color: #94a3b8; margin-left: 8px; text-decoration: underline;">Remove</a>';
          feedback.style.display = 'block';
          updatePriceCalculations();
        } else {
          feedback.textContent = data.error || 'Invalid or expired coupon code.';
          feedback.style.color = '#ef4444';
          feedback.style.display = 'block';
          appliedDiscount = null;
          updatePriceCalculations();
        }
      } catch (err) {
        feedback.textContent = 'Error checking code. Please try again.';
        feedback.style.color = '#ef4444';
        feedback.style.display = 'block';
      } finally {
        btn.textContent = 'Apply Code';
        btn.disabled = false;
      }
    }

    function removeCoupon() {
      appliedDiscount = null;
      document.getElementById('promoCode').value = '';
      document.getElementById('couponFeedback').style.display = 'none';
      updatePriceCalculations();
    }

    // Proceed to Payment (Communicates with /api/store/create-checkout-link)
    async function handleProceedToPayment(e) {
      e.preventDefault();
      hideAlert();

      const name = document.getElementById('custName').value.trim();
      const email = document.getElementById('custEmail').value.trim().toLowerCase();
      const code = appliedDiscount ? appliedDiscount.code : document.getElementById('promoCode').value.trim();
      const btn = document.getElementById('buySubmitBtn');

      if (!name) {
        showAlert('Please enter your full name for the certificate.');
        return;
      }
      if (!email || !email.includes('@') || !email.includes('.')) {
        showAlert('Please enter a valid email address so your license key reaches you.');
        return;
      }

      btn.textContent = 'Connecting to Secure Gateway...';
      btn.disabled = true;

      try {
        const res = await fetch('/api/store/create-checkout-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email,
            coupon_code: code,
            referral_code: appliedDiscount && appliedDiscount.is_referral ? appliedDiscount.code : code,
          }),
        });

        const data = await res.json();

        if (res.ok && data.payment_url) {
          showAlert('Redirecting to RBI-compliant payment gateway...', true);
          window.location.href = data.payment_url;
        } else {
          // Fallback to prefilled store link
          const sep = fallbackStoreUrl.includes('?') ? '&' : '?';
          const prefilled = fallbackStoreUrl + sep + 'prefill[name]=' + encodeURIComponent(name) + '&prefill[email]=' + encodeURIComponent(email);
          window.location.href = prefilled;
        }
      } catch (err) {
        const sep = fallbackStoreUrl.includes('?') ? '&' : '?';
        const prefilled = fallbackStoreUrl + sep + 'prefill[name]=' + encodeURIComponent(name) + '&prefill[email]=' + encodeURIComponent(email);
        window.location.href = prefilled;
      }
    }

    // Claim Free Trial Web Action
    async function handleClaimFreeTrial(e) {
      e.preventDefault();
      hideAlert();

      const name = document.getElementById('trialName').value.trim();
      const email = document.getElementById('trialEmail').value.trim().toLowerCase();
      const btn = document.getElementById('trialSubmitBtn');

      if (!name) {
        showAlert('Please enter your name.');
        return;
      }
      if (!email || !email.includes('@')) {
        showAlert('Please enter a valid email.');
        return;
      }

      // Generate or retrieve persistent browser hardware ID
      let webHwid = localStorage.getItem('tg_drive_web_hwid');
      if (!webHwid) {
        webHwid = 'web-' + Math.random().toString(36).substring(2, 12) + '-' + Date.now().toString(36);
        localStorage.setItem('tg_drive_web_hwid', webHwid);
      }

      btn.textContent = 'Generating Trial Key...';
      btn.disabled = true;

      try {
        const res = await fetch('/api/store/claim-trial', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email,
            hardware_id: webHwid,
            platform: 'web',
          }),
        });

        const data = await res.json();

        if (res.ok && data.success && data.license_key) {
          document.getElementById('trialForm').style.display = 'none';
          const successBox = document.getElementById('trialSuccessBox');
          document.getElementById('trialKeyOutput').value = data.license_key;
          successBox.style.display = 'block';
          showAlert('Trial key generated! Check your email for your official PDF certificate.', true);
        } else {
          showAlert(data.error || 'Failed to claim trial. You may have already used your trial period.');
          btn.textContent = '🎁 Claim Free 30-Day Trial Key';
          btn.disabled = false;
        }
      } catch (err) {
        showAlert('Network error while claiming trial. Please try again.');
        btn.textContent = '🎁 Claim Free 30-Day Trial Key';
        btn.disabled = false;
      }
    }

    function copyTrialKey() {
      const input = document.getElementById('trialKeyOutput');
      input.select();
      navigator.clipboard.writeText(input.value);
      alert('Copied trial key to clipboard: ' + input.value);
    }

    // Sync Live Backend Store Data (Live Price, Flash Sale Offers, and URL params)
    async function initWebsiteSync() {
      try {
        const cacheBuster = '_t=' + Date.now();
        const [cfgRes, offerRes] = await Promise.allSettled([
          fetch('/api/store/config?' + cacheBuster, { cache: 'no-store' }),
          fetch('/api/store/active-offer?' + cacheBuster, { cache: 'no-store' })
        ]);

        if (cfgRes.status === 'fulfilled' && cfgRes.value.ok) {
          const cfg = await cfgRes.value.json();
          if (cfg && cfg.price !== undefined) {
            storeBasePrice = cfg.price;
          }
          if (cfg && cfg.buy_url) {
            fallbackStoreUrl = cfg.buy_url;
          }
          if (cfg && cfg.trial_label) {
            document.getElementById('tabTrialBtn').textContent = '🎁 Claim ' + cfg.trial_label;
          }
        }

        if (offerRes.status === 'fulfilled' && offerRes.value.ok) {
          const offerData = await offerRes.value.json();
          if (offerData && offerData.active && offerData.offer) {
            currentOffer = offerData.offer;
            const banner = document.getElementById('offerBanner');
            banner.style.display = 'block';

            if (currentOffer.title) document.getElementById('offerTitle').textContent = currentOffer.title;
            if (currentOffer.description) document.getElementById('offerDescription').textContent = currentOffer.description;
            if (currentOffer.badge) document.getElementById('offerBadgeTag').textContent = currentOffer.badge;

            // Live Countdown Timer
            if (currentOffer.remaining_seconds && currentOffer.remaining_seconds > 0) {
              let secLeft = currentOffer.remaining_seconds;
              const timerEl = document.getElementById('offerTimer');
              const interval = setInterval(() => {
                if (secLeft <= 0) {
                  clearInterval(interval);
                  initWebsiteSync();
                  return;
                }
                secLeft--;
                const h = String(Math.floor(secLeft / 3600)).padStart(2, '0');
                const m = String(Math.floor((secLeft % 3600) / 60)).padStart(2, '0');
                const s = String(secLeft % 60).padStart(2, '0');
                timerEl.textContent = h + ':' + m + ':' + s;
              }, 1000);
            }
          }
        }

        // Check URL Query Parameters for referral or coupon links (?ref=CODE or ?coupon=CODE)
        const urlParams = new URLSearchParams(window.location.search);
        const refParam = urlParams.get('ref') || urlParams.get('referral');
        const couponParam = urlParams.get('coupon') || urlParams.get('code');

        if (refParam) {
          document.getElementById('promoCode').value = refParam.trim().toUpperCase();
          await applyCouponCode(refParam.trim().toUpperCase());
        } else if (couponParam) {
          document.getElementById('promoCode').value = couponParam.trim().toUpperCase();
          await applyCouponCode(couponParam.trim().toUpperCase());
        }

        updatePriceCalculations();
      } catch (err) {
        console.error('Store initialization error:', err);
        updatePriceCalculations();
      }
    }

    document.addEventListener('DOMContentLoaded', initWebsiteSync);
  </script>
</body>
</html>`;
}
