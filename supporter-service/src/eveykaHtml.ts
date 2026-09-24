export function renderEveykaHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TG Drive Pro | Unlimited Cloud Storage Powered by Telegram</title>
  <meta name="description" content="Official Portal for TG Drive Pro by Eveyka Software. Unlimited cloud storage powered by Telegram MTProto with zero ads, zero monthly subscriptions, 100 MB/s speed, and client-side zero-knowledge encryption." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg-dark: #06080e;
      --bg-card: rgba(13, 18, 32, 0.78);
      --bg-card-hover: rgba(19, 27, 48, 0.92);
      --accent-cyan: #00d2ff;
      --accent-blue: #3a7bd5;
      --accent-emerald: #10b981;
      --accent-amber: #f59e0b;
      --accent-purple: #8b5cf6;
      --accent-red: #ef4444;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --text-dim: #64748b;
      --border-color: rgba(255, 255, 255, 0.09);
      --border-glow: rgba(0, 210, 255, 0.35);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: var(--bg-dark);
      color: var(--text-main);
      line-height: 1.6;
      background-image: 
        radial-gradient(circle at 12% 8%, rgba(0, 210, 255, 0.12) 0%, transparent 42%),
        radial-gradient(circle at 88% 25%, rgba(58, 123, 213, 0.12) 0%, transparent 45%),
        radial-gradient(circle at 50% 70%, rgba(139, 92, 246, 0.08) 0%, transparent 50%),
        radial-gradient(circle at 20% 90%, rgba(16, 185, 129, 0.06) 0%, transparent 40%);
      background-attachment: fixed;
      min-height: 100vh;
      overflow-x: hidden;
    }
    .mono { font-family: 'JetBrains Mono', monospace; }
    .container { max-width: 1180px; margin: 0 auto; padding: 0 24px; }
    
    section, [id] { scroll-margin-top: 96px; }

    /* Header */
    header {
      position: sticky; top: 0; z-index: 1000;
      backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
      background: rgba(6, 8, 14, 0.95);
      border-bottom: 1px solid var(--border-color);
    }
    .nav-wrapper { display: flex; justify-content: space-between; align-items: center; height: 72px; gap: 16px; }
    .brand-logo { display: flex; align-items: center; gap: 12px; text-decoration: none; color: var(--text-main); flex-shrink: 0; }
    .logo-emblem {
      width: 42px; height: 42px;
      background: linear-gradient(135deg, var(--accent-cyan), var(--accent-blue));
      border-radius: 12px; display: flex; align-items: center; justify-content: center;
      font-weight: 900; font-size: 20px; color: #06080e; box-shadow: 0 0 20px rgba(0, 210, 255, 0.45);
    }
    .brand-name { font-weight: 800; font-size: 1.15rem; letter-spacing: -0.4px; white-space: nowrap; }
    .brand-sub { font-size: 0.68rem; color: var(--accent-cyan); font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; display: block; white-space: nowrap; }
    .nav-links { display: flex; gap: 22px; align-items: center; list-style: none; margin: 0; padding: 0; white-space: nowrap; }
    .nav-links a { color: var(--text-muted); text-decoration: none; font-size: 0.88rem; font-weight: 600; transition: color 0.2s; }
    .nav-links a:hover { color: var(--accent-cyan); }
    .nav-actions { display: flex; align-items: center; gap: 12px; }
    .nav-cta { padding: 9px 18px; font-size: 0.85rem; border-radius: 10px; white-space: nowrap; flex-shrink: 0; }
    
    .nav-toggle-btn {
      display: none; background: rgba(255, 255, 255, 0.08); border: 1px solid var(--border-color);
      color: #fff; font-size: 1.3rem; padding: 6px 12px; border-radius: 10px; cursor: pointer;
    }
    
    /* Mobile Drawer */
    .mobile-nav-drawer {
      display: none;
      position: fixed; top: 72px; left: 0; right: 0;
      background: rgba(6, 8, 14, 0.98);
      border-bottom: 1px solid var(--border-color);
      padding: 20px 24px;
      backdrop-filter: blur(28px); -webkit-backdrop-filter: blur(28px);
      z-index: 999;
      flex-direction: column; gap: 14px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
    }
    .mobile-nav-drawer.open { display: flex; }
    .mobile-nav-drawer a {
      color: var(--text-main); text-decoration: none; font-size: 1rem; font-weight: 600;
      padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .mobile-nav-drawer a:hover { color: var(--accent-cyan); }
    
    /* Buttons */
    .btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      padding: 12px 24px; border-radius: 12px; font-weight: 700; font-size: 0.95rem;
      text-decoration: none; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; border: none;
    }
    .btn-primary {
      background: linear-gradient(135deg, #00d2ff, #3a7bd5); color: #050b14;
      box-shadow: 0 4px 22px rgba(0, 210, 255, 0.38);
    }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0, 210, 255, 0.6); filter: brightness(1.08); }
    .btn-secondary { background: rgba(255, 255, 255, 0.05); color: var(--text-main); border: 1px solid var(--border-color); }
    .btn-secondary:hover { background: rgba(255, 255, 255, 0.1); border-color: var(--border-glow); transform: translateY(-1px); }
    .btn-success { background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; box-shadow: 0 4px 22px rgba(16, 185, 129, 0.35); }
    .btn-success:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(16, 185, 129, 0.55); }
    .btn-amber { background: linear-gradient(135deg, #f59e0b, #d97706); color: #090e18; box-shadow: 0 4px 20px rgba(245, 158, 11, 0.35); }
    .btn-amber:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(245, 158, 11, 0.55); }

    /* Hero */
    .hero { padding: 56px 0 40px; text-align: center; }
    .badge {
      display: inline-flex; align-items: center; gap: 8px; padding: 6px 18px;
      border-radius: 9999px; background: rgba(0, 210, 255, 0.12); border: 1px solid rgba(0, 210, 255, 0.32);
      color: var(--accent-cyan); font-size: 0.8rem; font-weight: 800; text-transform: uppercase; margin-bottom: 24px;
      letter-spacing: 0.6px;
    }
    .hero h1 {
      font-size: clamp(2.2rem, 5.5vw, 3.5rem); font-weight: 900; line-height: 1.15; letter-spacing: -1.5px; margin-bottom: 20px;
    }
    .gradient-text {
      background: linear-gradient(135deg, #00d2ff 0%, #3a7bd5 50%, #93c5fd 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .hero p { font-size: 1.15rem; color: var(--text-muted); max-width: 760px; margin: 0 auto 34px; line-height: 1.65; }
    .hero-cta { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; margin-bottom: 44px; }

    /* Trust Stats Strip */
    .trust-strip {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;
      margin: 10px auto 64px; max-width: 1040px;
    }
    .trust-item {
      background: rgba(15, 23, 42, 0.55); border: 1px solid var(--border-color);
      border-radius: 18px; padding: 20px 18px; text-align: center; backdrop-filter: blur(14px);
      transition: transform 0.2s, border-color 0.2s;
    }
    .trust-item:hover { transform: translateY(-3px); border-color: rgba(0, 210, 255, 0.3); }
    .trust-icon { font-size: 1.6rem; margin-bottom: 6px; }
    .trust-title { font-size: 1.12rem; font-weight: 800; color: #ffffff; }
    .trust-desc { font-size: 0.82rem; color: var(--text-muted); margin-top: 2px; }

    /* Section Header */
    .section-title { text-align: center; margin-bottom: 40px; }
    .section-title h2 { font-size: 2.3rem; font-weight: 800; margin-bottom: 10px; letter-spacing: -0.6px; }
    .section-title p { color: var(--text-muted); font-size: 1.02rem; max-width: 680px; margin: 0 auto; }

    /* Interactive Checkout Station */
    .checkout-container { max-width: 860px; margin: 0 auto 84px; }
    .checkout-card {
      background: var(--bg-card); border: 2px solid rgba(0, 210, 255, 0.4);
      border-radius: 28px; padding: clamp(24px, 4vw, 42px); backdrop-filter: blur(24px);
      box-shadow: 0 20px 70px rgba(0, 210, 255, 0.16); position: relative;
    }
    .checkout-badge {
      position: absolute; top: -14px; right: 32px;
      background: linear-gradient(135deg, var(--accent-cyan), var(--accent-blue));
      color: #06080e; font-size: 0.75rem; font-weight: 900; padding: 6px 18px; border-radius: 9999px;
      text-transform: uppercase; letter-spacing: 0.6px; box-shadow: 0 4px 16px rgba(0, 210, 255, 0.45);
    }

    /* Tabs */
    .checkout-tabs {
      display: flex; gap: 8px; background: rgba(0, 0, 0, 0.45); border: 1px solid var(--border-color);
      padding: 6px; border-radius: 16px; margin-bottom: 28px;
    }
    .checkout-tab-btn {
      flex: 1; padding: 13px; border-radius: 12px; font-size: 0.95rem; font-weight: 700;
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
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.18) 0%, rgba(234, 88, 12, 0.18) 100%);
      border: 1px solid rgba(245, 158, 11, 0.48);
      border-radius: 18px; padding: 16px 22px; margin-bottom: 26px; text-align: left;
    }
    .offer-badge {
      font-size: 0.72rem; font-weight: 800; background: var(--accent-amber); color: #000;
      padding: 3px 10px; border-radius: 6px; text-transform: uppercase;
    }
    .offer-timer {
      font-family: 'JetBrains Mono', monospace; font-size: 0.95rem; font-weight: 800;
      background: #090e18; color: #fbbf24; padding: 6px 14px; border-radius: 10px;
      border: 1px solid rgba(245, 158, 11, 0.4); white-space: nowrap;
    }

    /* Form Fields */
    .form-group { margin-bottom: 20px; text-align: left; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .form-label { display: block; font-size: 0.86rem; font-weight: 700; color: #cbd5e1; margin-bottom: 8px; }
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
      background: rgba(10, 15, 29, 0.9); border: 1px dashed rgba(255, 255, 255, 0.22);
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
      background: rgba(0, 0, 0, 0.38); border: 1px solid var(--border-color);
      border-radius: 18px; padding: 22px 26px; margin: 24px 0;
    }
    .summary-line {
      display: flex; justify-content: space-between; align-items: center;
      font-size: 0.92rem; color: var(--text-muted); margin-bottom: 10px;
    }
    .summary-total {
      display: flex; justify-content: space-between; align-items: baseline;
      border-top: 1px solid var(--border-color); padding-top: 16px; margin-top: 14px;
    }
    .total-label { font-size: 1.15rem; font-weight: 800; color: #ffffff; }
    .total-amount { font-size: 2.6rem; font-weight: 900; color: #ffffff; line-height: 1; }
    .strike-orig { text-decoration: line-through; color: #64748b; font-size: 1.25rem; margin-right: 10px; }

    /* Alerts */
    .alert-box {
      padding: 14px 18px; border-radius: 12px; font-size: 0.88rem; margin-bottom: 20px; display: none;
    }
    .alert-error { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.35); color: #fca5a5; }
    .alert-success { background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.35); color: #6ee7b7; }

    /* Comparison Table */
    .pricing-table-wrap {
      overflow-x: auto; margin-bottom: 80px; border-radius: 24px;
      border: 1px solid var(--border-color); background: var(--bg-card); backdrop-filter: blur(20px);
    }
    .pricing-table {
      width: 100%; border-collapse: collapse; text-align: left; font-size: 0.92rem;
    }
    .pricing-table th, .pricing-table td {
      padding: 18px 22px; border-bottom: 1px solid var(--border-color);
    }
    .pricing-table th {
      background: rgba(0, 0, 0, 0.4); font-weight: 800; font-size: 1rem; color: #ffffff;
    }
    .pricing-table th.highlight {
      background: linear-gradient(135deg, rgba(0, 210, 255, 0.16), rgba(58, 123, 213, 0.22));
      color: var(--accent-cyan); border-left: 1px solid rgba(0, 210, 255, 0.3); border-right: 1px solid rgba(0, 210, 255, 0.3);
    }
    .pricing-table td.highlight {
      background: rgba(0, 210, 255, 0.04);
      border-left: 1px solid rgba(0, 210, 255, 0.2); border-right: 1px solid rgba(0, 210, 255, 0.2);
    }
    .pricing-table tr:last-child td { border-bottom: none; }
    .check-yes { color: var(--accent-emerald); font-weight: 800; font-size: 1.1rem; }
    .check-no { color: var(--text-dim); font-size: 1rem; }

    /* Feature Grid */
    .feature-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px;
      margin-bottom: 84px;
    }
    .feature-card {
      background: var(--bg-card); border: 1px solid var(--border-color);
      border-radius: 22px; padding: 30px; backdrop-filter: blur(14px); transition: transform 0.2s, border-color 0.2s;
    }
    .feature-card:hover { transform: translateY(-4px); border-color: var(--border-glow); background: var(--bg-card-hover); }
    .feature-icon-wrap {
      width: 50px; height: 50px; border-radius: 14px; display: flex; align-items: center; justify-content: center;
      font-size: 1.5rem; margin-bottom: 18px; background: rgba(0, 210, 255, 0.12); color: var(--accent-cyan);
    }
    .feature-card h3 { font-size: 1.25rem; font-weight: 800; margin-bottom: 8px; color: #ffffff; }
    .feature-card p { font-size: 0.91rem; color: var(--text-muted); line-height: 1.62; }

    /* Structured 2-Tier Download Grid */
    .download-featured-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
      margin-bottom: 24px;
    }
    .download-sub-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 84px;
    }
    .download-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 24px;
      padding: 32px 28px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      backdrop-filter: blur(16px);
      transition: transform 0.25s, border-color 0.25s, box-shadow 0.25s;
      position: relative;
    }
    .download-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 16px 40px rgba(0, 210, 255, 0.12);
    }
    .download-card-badge {
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      padding: 4px 12px;
      border-radius: 9999px;
      margin-bottom: 14px;
      width: fit-content;
    }
    .download-card h3 {
      font-size: 1.35rem;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .download-card p {
      font-size: 0.88rem;
      color: var(--text-muted);
      line-height: 1.6;
      margin-bottom: 16px;
    }
    .download-feature-list {
      list-style: none;
      padding: 0;
      margin: 0 0 20px 0;
      font-size: 0.84rem;
      color: #cbd5e1;
    }
    .download-feature-list li {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .download-feature-list li span.check {
      color: var(--accent-emerald);
      font-weight: bold;
    }
    .file-tag {
      display: inline-block; font-family: 'JetBrains Mono', monospace; font-size: 0.74rem;
      background: rgba(255, 255, 255, 0.06); padding: 3px 10px; border-radius: 6px; color: #cbd5e1; margin-bottom: 14px;
      width: fit-content;
    }
    .download-btn-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: auto;
    }

    /* FAQ Section */
    .faq-container { max-width: 860px; margin: 0 auto 84px; }
    .faq-item {
      background: var(--bg-card); border: 1px solid var(--border-color);
      border-radius: 18px; margin-bottom: 14px; overflow: hidden;
    }
    .faq-question {
      padding: 20px 24px; font-weight: 700; font-size: 1.05rem; cursor: pointer;
      display: flex; justify-content: space-between; align-items: center; user-select: none;
    }
    .faq-question:hover { color: var(--accent-cyan); }
    .faq-answer {
      padding: 0 24px 22px; font-size: 0.92rem; color: var(--text-muted); line-height: 1.65; display: none;
      border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 16px;
    }
    .faq-item.active .faq-answer { display: block; }
    .faq-icon { transition: transform 0.2s; font-size: 1.2rem; }
    .faq-item.active .faq-icon { transform: rotate(45deg); color: var(--accent-cyan); }

    /* Policies */
    .policy-section {
      background: rgba(13, 19, 34, 0.5); border: 1px solid var(--border-color);
      border-radius: 26px; padding: 42px 34px; margin-bottom: 74px;
    }
    .policy-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 22px; margin-top: 26px; }
    .policy-item {
      background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 16px; padding: 22px;
    }
    .policy-item h3 { font-size: 1rem; font-weight: 700; margin-bottom: 8px; color: var(--accent-cyan); }
    .policy-item p { font-size: 0.86rem; color: var(--text-muted); line-height: 1.62; }

    /* Support Desk Box */
    .support-box {
      text-align: center; padding: 44px;
      background: linear-gradient(180deg, rgba(0, 210, 255, 0.07) 0%, rgba(13, 19, 34, 0.85) 100%);
      border: 1px solid var(--border-glow); border-radius: 26px; margin-bottom: 74px;
    }

    footer {
      border-top: 1px solid var(--border-color); padding: 44px 0; text-align: center;
      color: var(--text-muted); font-size: 0.88rem;
    }
    footer a { color: var(--accent-cyan); text-decoration: none; }
    footer a:hover { text-decoration: underline; }

    @media (max-width: 1080px) {
      .nav-links { display: none; }
      .nav-toggle-btn { display: block; }
      .download-sub-grid { grid-template-columns: repeat(2, 1fr); }
    }

    @media (max-width: 768px) {
      .container { padding: 0 16px; }
      .hero { padding: 36px 0 28px; }
      .hero h1 { font-size: 2.1rem; }
      .hero p { font-size: 0.96rem; }
      .download-featured-grid { grid-template-columns: 1fr; }
      .download-sub-grid { grid-template-columns: 1fr; }
      .trust-strip { grid-template-columns: repeat(2, 1fr); gap: 10px; }
      .trust-item { padding: 14px 10px; }
      .checkout-card { padding: 22px 16px; }
      .form-row { grid-template-columns: 1fr; gap: 0; }
      .coupon-box { flex-direction: column; }
      .feature-grid { grid-template-columns: 1fr; }
      .policy-grid { grid-template-columns: 1fr; }
      .pricing-table th, .pricing-table td { padding: 12px 14px; font-size: 0.82rem; }
    }
  </style>
</head>
<body>

  <!-- Sticky Header -->
  <header>
    <div class="container nav-wrapper">
      <a href="#" class="brand-logo">
        <div class="logo-emblem">TG</div>
        <div>
          <span class="brand-name">TG Drive Pro</span>
          <span class="brand-sub">Eveyka Software Official</span>
        </div>
      </a>
      <ul class="nav-links">
        <li><a href="#features">Features</a></li>
        <li><a href="#comparison">Plan Comparison</a></li>
        <li><a href="#pricing">Buy License</a></li>
        <li><a href="#download">Downloads</a></li>
        <li><a href="/recover">Key Recovery</a></li>
        <li><a href="#faq">FAQ</a></li>
      </ul>
      <div class="nav-actions">
        <a href="#pricing" class="btn btn-primary nav-cta">⚡ Get Lifetime Pro</a>
        <button class="nav-toggle-btn" id="navToggleBtn" onclick="toggleMobileNav()" aria-label="Toggle navigation menu">☰</button>
      </div>
    </div>
  </header>

  <!-- Mobile Drawer Menu -->
  <nav id="mobileNavDrawer" class="mobile-nav-drawer" aria-label="Mobile Navigation">
    <a href="#features" onclick="toggleMobileNav()">✨ Core Features</a>
    <a href="#comparison" onclick="toggleMobileNav()">📊 Plan Comparison</a>
    <a href="#pricing" onclick="toggleMobileNav()">⚡ Buy Lifetime License</a>
    <a href="#download" onclick="toggleMobileNav()">📱 Download Apps</a>
    <a href="/recover" onclick="toggleMobileNav()">🔑 24/7 Key Recovery Portal</a>
    <a href="#faq" onclick="toggleMobileNav()">❓ Frequently Asked Questions</a>
    <a href="#pricing" class="btn btn-primary" style="margin-top: 10px; width: 100%;" onclick="toggleMobileNav()">⚡ Get Lifetime Access Now</a>
  </nav>

  <!-- Hero Section -->
  <section class="hero container">
    <div class="badge">✦ Official Commercial Release v1.2.0</div>
    <h1>Unlimited Cloud Storage.<br/><span class="gradient-text">Powered by Telegram. Zero Ads.</span></h1>
    <p>
      TG Drive Pro turns your Telegram account into a high-speed, private, and encrypted cloud disk with zero monthly subscriptions, up to 100 MB/s direct MTProto acceleration, zero-knowledge client encryption, and permanent cross-device sync.
    </p>
    <div class="hero-cta">
      <a href="#pricing" class="btn btn-primary" style="font-size: 1.05rem; padding: 15px 32px;">
        ⚡ Buy Lifetime Pro License
      </a>
      <a href="#download" class="btn btn-secondary" style="font-size: 1.05rem; padding: 15px 28px;">
        📱 Download Client Apps
      </a>
      <a href="/recover" class="btn btn-secondary" style="font-size: 1.05rem; padding: 15px 28px;">
        🔑 24/7 Key Recovery
      </a>
    </div>

    <!-- Trust Stats -->
    <div class="trust-strip">
      <div class="trust-item">
        <div class="trust-icon">∞</div>
        <div class="trust-title">Unlimited Storage</div>
        <div class="trust-desc">Zero 15 GB Google limits</div>
      </div>
      <div class="trust-item">
        <div class="trust-icon">⚡</div>
        <div class="trust-title">100 MB/s Wire Speed</div>
        <div class="trust-desc">Direct Telegram MTProto 2.0</div>
      </div>
      <div class="trust-item">
        <div class="trust-icon">🔒</div>
        <div class="trust-title">Zero-Knowledge Vault</div>
        <div class="trust-desc">Client-side TDENC2 AEAD</div>
      </div>
      <div class="trust-item">
        <div class="trust-icon">♾️</div>
        <div class="trust-title">Lifetime Access</div>
        <div class="trust-desc">Pay once, use forever</div>
      </div>
    </div>
  </section>

  <!-- Checkout / Purchase Station -->
  <section id="pricing" class="container">
    <div class="section-title">
      <h2>Instant Digital Purchase & Activation</h2>
      <p>Official commercial license key delivered to your email with certified tax invoice, PDF certificate & permanent Telegram account sync</p>
    </div>

    <div class="checkout-container">
      <div class="checkout-card">
        <div class="checkout-badge" id="editionBadge">LIFETIME COMMERCIAL</div>

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
            <div class="form-row">
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" for="custName">Your Full Name <span class="req">*</span></label>
                <input type="text" id="custName" class="input-field" placeholder="e.g. Alex Morgan" required />
                <p class="input-hint">Printed on your official digital PDF Certificate & tax invoice.</p>
              </div>

              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" for="custEmail">Delivery Email Address <span class="req">*</span></label>
                <input type="email" id="custEmail" class="input-field" placeholder="e.g. alex@example.com" required oninput="handleEmailInput()" />
                <p id="emailSuggestionHint" class="input-hint" style="color: var(--accent-amber); display: none;"></p>
                <p class="input-hint">Your unique TGDRV license key is emailed here within 60s.</p>
              </div>
            </div>

            <!-- Optional Telegram Account Permanent Link Fields -->
            <div class="form-row">
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" for="custTgId">Telegram User ID (Optional)</label>
                <input type="text" id="custTgId" class="input-field mono" placeholder="e.g. 123456789" />
                <p class="input-hint">Permanently binds license so re-login unlocks automatically.</p>
              </div>

              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" for="custPhone">Phone Number (Optional)</label>
                <input type="tel" id="custPhone" class="input-field mono" placeholder="e.g. +919876543210" />
                <p class="input-hint">Prefills payment details and enables phone-based restoration.</p>
              </div>
            </div>

            <div class="form-group" style="margin-top: 16px;">
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
                <span>Standard Lifetime Commercial License</span>
                <span id="summaryBasePrice" class="mono">₹399.00</span>
              </div>
              <div id="summaryOfferRow" class="summary-line" style="display: none; color: #f59e0b;">
                <span id="summaryOfferLabel">Special Promotion Offer</span>
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
            <button type="submit" id="buySubmitBtn" class="btn btn-primary" style="width: 100%; font-size: 1.15rem; padding: 18px;">
              🔒 Proceed to Secure Payment
            </button>
          </form>

          <div style="margin-top: 20px; display: flex; justify-content: center; gap: 16px; flex-wrap: wrap; font-size: 0.82rem; color: var(--text-muted); text-align: center;">
            <span>🛡️ 256-Bit Bank Encryption</span>
            <span>•</span>
            <span>⚡ Instant License Key Delivery via Email</span>
            <span>•</span>
            <span>💳 UPI (GPay, PhonePe, Paytm), Cards & NetBanking</span>
          </div>
        </div>

        <!-- FREE TRIAL TAB CONTENT -->
        <div id="trialSection" style="display: none;">
          <div style="text-align: left; margin-bottom: 24px;">
            <h3 style="color: var(--accent-cyan); font-size: 1.35rem; margin-bottom: 4px;">Experience Pro Completely Free</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem;">Enjoy 100% ad-free cloud synchronization for 30 days. Zero payment details required.</p>
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

            <button type="submit" id="trialSubmitBtn" class="btn btn-success" style="width: 100%; font-size: 1.15rem; padding: 18px;">
              🎁 Claim Free 30-Day Trial Key
            </button>
          </form>

          <!-- Activated Trial Result Box -->
          <div id="trialSuccessBox" style="display: none; margin-top: 24px; padding: 24px; border-radius: 18px; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.4); text-align: left;">
            <h4 style="color: #6ee7b7; font-size: 1.15rem; margin-bottom: 8px;">🎉 Free Trial Activated Successfully!</h4>
            <p style="font-size: 0.9rem; color: #e2e8f0; margin-bottom: 14px;">Here is your trial license key. Your official PDF certificate has also been dispatched to your email.</p>
            <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 14px;">
              <input type="text" id="trialKeyOutput" readonly class="input-field mono" style="font-weight: 800; font-size: 1.1rem; color: #34d399; background: #061510; border-color: rgba(52, 211, 153, 0.4);" />
              <button type="button" class="btn btn-primary" onclick="copyTrialKey()">Copy</button>
            </div>
            <a href="#download" class="btn btn-secondary" style="width: 100%; font-size: 0.92rem;">
              Download TG Drive App & Activate Key →
            </a>
          </div>
        </div>

      </div>
    </div>
  </section>

  <!-- Plan Comparison Matrix -->
  <section id="comparison" class="container">
    <div class="section-title">
      <h2>Transparent Plan Comparison</h2>
      <p>Compare standard free tier against 30-Day Free Trial and Lifetime Pro commercial access</p>
    </div>

    <div class="pricing-table-wrap">
      <table class="pricing-table">
        <thead>
          <tr>
            <th>Plan Feature</th>
            <th>Standard Free Tier</th>
            <th>🎁 30-Day Free Trial</th>
            <th class="highlight">⚡ Lifetime Pro Commercial</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Cloud Storage Capacity</strong></td>
            <td>Unlimited (Telegram Cloud)</td>
            <td>Unlimited (Telegram Cloud)</td>
            <td class="highlight"><strong>Unlimited (Telegram Cloud)</strong></td>
          </tr>
          <tr>
            <td><strong>Advertisements &amp; Banners</strong></td>
            <td>Banner Ads Enabled</td>
            <td><span class="check-yes">✓ 100% Ad-Free</span></td>
            <td class="highlight"><span class="check-yes">✓ 100% Ad-Free (Zero Ads)</span></td>
          </tr>
          <tr>
            <td><strong>Transfer Speed Limit</strong></td>
            <td>Standard Bandwidth</td>
            <td><span class="check-yes">✓ Uncapped (100 MB/s)</span></td>
            <td class="highlight"><span class="check-yes">✓ Uncapped (100 MB/s MTProto)</span></td>
          </tr>
          <tr>
            <td><strong>Telegram Account Permanent Sync</strong></td>
            <td><span class="check-no">✕ None</span></td>
            <td>30-Day Account Link</td>
            <td class="highlight"><span class="check-yes">✓ Permanent Cross-Device Link</span></td>
          </tr>
          <tr>
            <td><strong>Client-Side Encrypted Vault</strong></td>
            <td><span class="check-no">✕ Restricted (Pro Only)</span></td>
            <td><span class="check-yes">✓ Full TDENC2 AEAD</span></td>
            <td class="highlight"><span class="check-yes">✓ Full Zero-Knowledge AEAD</span></td>
          </tr>
          <tr>
            <td><strong>Virtual Folders &amp; Organization</strong></td>
            <td>Saved Messages + 1 Custom Folder</td>
            <td><span class="check-yes">✓ Unlimited Folders &amp; Tags</span></td>
            <td class="highlight"><span class="check-yes">✓ Unlimited Folders &amp; Color Tags</span></td>
          </tr>
          <tr>
            <td><strong>Auto Cloud Backup &amp; Sync</strong></td>
            <td><span class="check-no">✕ Disabled (Pro Only)</span></td>
            <td><span class="check-yes">✓ Full Background Sync</span></td>
            <td class="highlight"><span class="check-yes">✓ Full Folder &amp; Camera Sync</span></td>
          </tr>
          <tr>
            <td><strong>Simultaneous Devices</strong></td>
            <td>1 Device</td>
            <td>Multi-Device (Trial)</td>
            <td class="highlight"><span class="check-yes">✓ Unlimited on Telegram Account</span></td>
          </tr>
          <tr>
            <td><strong>4K Media Seek &amp; Streaming</strong></td>
            <td>Standard Buffering</td>
            <td><span class="check-yes">✓ Instant Seek</span></td>
            <td class="highlight"><span class="check-yes">✓ Instant Seek &amp; HLS Streaming</span></td>
          </tr>
          <tr>
            <td><strong>WebDAV Local Drive Mounting</strong></td>
            <td><span class="check-no">✕ No</span></td>
            <td><span class="check-yes">✓ Included</span></td>
            <td class="highlight"><span class="check-yes">✓ Full WebDAV Server Included</span></td>
          </tr>
          <tr>
            <td><strong>Official PDF Certificate &amp; Tax Invoice</strong></td>
            <td><span class="check-no">✕ No</span></td>
            <td><span class="check-yes">✓ Digital PDF</span></td>
            <td class="highlight"><span class="check-yes">✓ Digitally Signed PDF &amp; Invoice</span></td>
          </tr>
          <tr>
            <td><strong>Affiliate / Referral Earnings</strong></td>
            <td><span class="check-yes">✓ Earn ₹50 Cash / Sale</span></td>
            <td><span class="check-yes">✓ Earn ₹50 Cash / Sale</span></td>
            <td class="highlight"><span class="check-yes">✓ Earn ₹50 Cash / Sale + Instant UPI</span></td>
          </tr>
          <tr>
            <td><strong>24/7 Self-Service Key Recovery</strong></td>
            <td><span class="check-no">✕ N/A</span></td>
            <td><span class="check-yes">✓ Supported</span></td>
            <td class="highlight"><span class="check-yes">✓ 24/7 OTP Recovery Portal</span></td>
          </tr>
          <tr>
            <td><strong>Pricing &amp; Billing</strong></td>
            <td>Free Always</td>
            <td><strong>₹0 (No Card Needed)</strong></td>
            <td class="highlight"><strong>₹399 One-Time (Lifetime)</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <!-- Core Features Section -->
  <section id="features" class="container">
    <div class="section-title">
      <h2>Engineered for Power, Privacy &amp; Speed</h2>
      <p>High-performance client architecture built from the ground up in Rust and React</p>
    </div>

    <div class="feature-grid">
      <div class="feature-card">
        <div class="feature-icon-wrap">∞</div>
        <h3>Unlimited Cloud Capacity</h3>
        <p>No 15 GB Google Drive limits or monthly cloud tiers. Store entire 4K movie collections, RAW camera archives, software backups, and database dumps securely on Telegram's global distributed servers.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon-wrap">🚫</div>
        <h3>100% Ad-Free Experience</h3>
        <p>Zero popups, banner ads, or sponsors. Pure, clean productivity with maximum allocated download bandwidth, multi-connection acceleration, and seamless file browsing.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon-wrap">🔐</div>
        <h3>Zero-Knowledge Cloud Vault</h3>
        <p>Optionally encrypt sensitive files locally with your master passphrase using military-grade XChaCha20-Poly1305 / AES-256 before upload. Telegram servers only store encrypted ciphertext noise.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon-wrap">🔄</div>
        <h3>Automatic Folder &amp; Camera Sync</h3>
        <p>Set and forget: mirror local PC directories or your smartphone's camera roll straight to your cloud vault in the background with SHA-256 deduplication and change detection.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon-wrap">🎬</div>
        <h3>Instant 4K Video Streaming</h3>
        <p>Watch 4K and 1080p videos with instant seek and HLS multi-part streaming without waiting for the full file to download. Includes background audio player and playlist management.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon-wrap">🌐</div>
        <h3>Built-in WebDAV Network Drive</h3>
        <p>Mount your Telegram Drive as a local drive letter in Windows File Explorer or macOS Finder. Access your cloud files directly inside Premiere Pro, VLC, Photoshop, or Office.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon-wrap">📂</div>
        <h3>Virtual Folders &amp; Color Tag Groups</h3>
        <p>Organize unorganized Telegram chat files into clean folders, subfolders, and color-coded tag groups without moving or deleting the underlying messages on Telegram.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon-wrap">📄</div>
        <h3>In-App PDF &amp; Document Reader</h3>
        <p>Read PDF books, code scripts, archives (.zip, .rar, .tar, .7z), and text files instantly with built-in previewers and zero external dependencies.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon-wrap">⚡</div>
        <h3>Instant Key Delivery &amp; OTP Recovery</h3>
        <p>Your license key and digitally signed PDF certificate arrive in your inbox in seconds. Lost your key? Use our 24/7 OTP Key Recovery Portal to restore it anytime.</p>
      </div>
    </div>
  </section>

  <!-- Download Section -->
  <section id="download" class="container">
    <div id="downloads" style="position: relative; top: -80px; visibility: hidden;"></div>
    <div class="section-title">
      <h2>Download TG Drive for All Platforms</h2>
      <p>Install the native client on your smartphone, PC, Mac, or tablet. Connect your Telegram account and unlock unlimited high-speed cloud storage.</p>
    </div>

    <!-- Live Release Banner Strip -->
    <div style="background: rgba(15, 23, 42, 0.65); border: 1px solid rgba(0, 210, 255, 0.25); border-radius: 18px; padding: 14px 20px; margin-bottom: 32px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; backdrop-filter: blur(12px);">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 1.2rem;">🚀</span>
        <div>
          <span style="font-weight: 800; font-size: 0.95rem; color: #ffffff;">Latest Stable Release: <span id="latestReleaseTag" class="mono" style="color: var(--accent-cyan); font-weight: 800;">v1.2.0</span></span>
          <span style="font-size: 0.78rem; color: var(--text-muted); margin-left: 8px;">(Digitally Signed & Verified Binaries)</span>
        </div>
      </div>
      <a href="https://github.com/jupiterbania/Telegram-Drive/releases/latest" target="_blank" class="btn btn-secondary" style="padding: 6px 14px; font-size: 0.8rem;">
        View Release Notes & Checksums →
      </a>
    </div>

    <!-- Structured 2-Tier Download Layout -->
    <!-- Tier 1: Flagship Popular Platforms (Android & Windows) -->
    <div class="download-featured-grid">
      <!-- 1. Android Card -->
      <div class="download-card" style="border-color: rgba(16, 185, 129, 0.4); background: linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(13, 18, 32, 0.9) 100%);">
        <div class="download-card-header">
          <span class="download-card-badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4);">⭐ ULTRA-COMPACT · ~11.7 MB</span>
          <h3><span style="font-size: 1.8rem;">🤖</span> Android &amp; Android TV</h3>
          <span class="file-tag" style="background: rgba(16, 185, 129, 0.12); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3);">ARM64 &amp; Universal APK · Android 7.0+</span>
          <p>Lightweight high-speed release APK with background camera roll backup, 4K media streaming, TV remote mode, and permanent Telegram account license sync.</p>
          <ul class="download-feature-list">
            <li><span class="check">✓</span> Direct 100 MB/s Telegram MTProto 2.0 Speed</li>
            <li><span class="check">✓</span> Automated Camera Roll &amp; Gallery Background Sync</li>
            <li><span class="check">✓</span> Android TV Spatial Navigation &amp; Video Player</li>
            <li><span class="check">✓</span> Zero-Knowledge Vault Encryption (TDENC2)</li>
          </ul>
        </div>
        <div class="download-btn-group">
          <a href="https://github.com/jupiterbania/Telegram-Drive/releases/download/v1.2.0/TG-Drive-v1.2.0-Android-ARM64.apk" target="_blank" class="btn btn-success" style="width: 100%; font-size: 1rem; padding: 14px;">
            ⬇️ Download Android APK (~11.7 MB)
          </a>
          <a href="https://github.com/jupiterbania/Telegram-Drive/releases/download/v1.2.0/TG-Drive-v1.2.0-Android-Universal.apk" target="_blank" class="btn btn-secondary" style="width: 100%; font-size: 0.85rem; padding: 10px;">
            ⬇️ Universal APK Mirror (~11.7 MB) →
          </a>
        </div>
      </div>

      <!-- 2. Windows Card -->
      <div class="download-card" style="border-color: rgba(0, 210, 255, 0.4); background: linear-gradient(180deg, rgba(0, 210, 255, 0.08) 0%, rgba(13, 18, 32, 0.9) 100%);">
        <div class="download-card-header">
          <span class="download-card-badge" style="background: rgba(0, 210, 255, 0.2); color: var(--accent-cyan); border: 1px solid rgba(0, 210, 255, 0.4);">⭐ MOST POPULAR · DESKTOP</span>
          <h3><span style="font-size: 1.8rem;">🪟</span> Windows PC &amp; Laptop</h3>
          <span class="file-tag" style="background: rgba(0, 210, 255, 0.12); color: var(--accent-cyan); border: 1px solid rgba(0, 210, 255, 0.3);">64-bit EXE · Windows 10 &amp; 11</span>
          <p>Native 64-bit Windows desktop app with File Explorer WebDAV network drive mounting, system tray background sync, and instant auto-updater.</p>
          <ul class="download-feature-list">
            <li><span class="check">✓</span> Mount Telegram as Windows Explorer Local Drive Letter</li>
            <li><span class="check">✓</span> System Tray Background Minimize &amp; Auto-Update</li>
            <li><span class="check">✓</span> Multi-Stream 100 MB/s Download &amp; Upload Engine</li>
            <li><span class="check">✓</span> Zero-Knowledge Vault Encryption with Passphrase</li>
          </ul>
        </div>
        <div class="download-btn-group">
          <a href="https://github.com/jupiterbania/Telegram-Drive/releases/download/v1.2.0/TG-Drive-v1.2.0-Windows-x64-Setup.exe" target="_blank" class="btn btn-primary" style="width: 100%; font-size: 1rem; padding: 14px;">
            ⬇️ Download Windows Installer (~26.9 MB)
          </a>
          <a href="https://github.com/jupiterbania/Telegram-Drive/releases/download/v1.2.0/TG-Drive-v1.2.0-Windows-x64-Portable.exe" target="_blank" class="btn btn-secondary" style="width: 100%; font-size: 0.85rem; padding: 10px;">
            ⬇️ Download Portable EXE (~16.2 MB) →
          </a>
        </div>
      </div>
    </div>

    <!-- Tier 2: macOS, Linux, and iOS Platforms -->
    <div class="download-sub-grid">
      <!-- 3. Apple macOS Card -->
      <div class="download-card" style="border-color: rgba(139, 92, 246, 0.35);">
        <div class="download-card-header">
          <span class="download-card-badge" style="background: rgba(139, 92, 246, 0.15); color: #c084fc; border: 1px solid rgba(139, 92, 246, 0.3);">APPLE MACOS</span>
          <h3><span style="font-size: 1.6rem;">🍏</span> Apple macOS</h3>
          <span class="file-tag" style="background: rgba(139, 92, 246, 0.12); color: #c084fc; border: 1px solid rgba(139, 92, 246, 0.3);">DMG · Apple Silicon &amp; Intel</span>
          <p>Native performance for Apple Silicon (M1/M2/M3/M4) and Intel Macs with Finder cloud integration, Retina graphics, and Dark Mode.</p>
          <ul class="download-feature-list">
            <li><span class="check">✓</span> Native ARM64 &amp; x86_64 Binaries</li>
            <li><span class="check">✓</span> Finder Integration &amp; WebDAV Mount</li>
          </ul>
        </div>
        <div class="download-btn-group">
          <a href="https://github.com/jupiterbania/Telegram-Drive/releases/download/v1.2.0/TG-Drive-v1.2.0-macOS-Apple-Silicon-ARM64.dmg" target="_blank" class="btn btn-secondary" style="width: 100%; font-size: 0.84rem; border-color: rgba(139, 92, 246, 0.5);">
            ⬇️ Apple Silicon (M1/M2/M3/M4) (~9.0 MB)
          </a>
          <a href="https://github.com/jupiterbania/Telegram-Drive/releases/download/v1.2.0/TG-Drive-v1.2.0-macOS-Intel-x64.dmg" target="_blank" class="btn btn-secondary" style="width: 100%; font-size: 0.84rem;">
            ⬇️ Intel Mac DMG (x86_64) (~9.4 MB)
          </a>
        </div>
      </div>

      <!-- 4. Linux Card -->
      <div class="download-card" style="border-color: rgba(0, 210, 255, 0.25);">
        <div class="download-card-header">
          <span class="download-card-badge" style="background: rgba(0, 210, 255, 0.12); color: var(--accent-cyan); border: 1px solid rgba(0, 210, 255, 0.25);">OPEN LINUX</span>
          <h3><span style="font-size: 1.6rem;">🐧</span> Linux Desktop</h3>
          <span class="file-tag" style="background: rgba(0, 210, 255, 0.12); color: var(--accent-cyan); border: 1px solid rgba(0, 210, 255, 0.25);">AppImage &amp; DEB Package</span>
          <p>Native GTK3 desktop package. Supports Ubuntu, Debian, Linux Mint, Arch Linux, Fedora, and all modern distributions.</p>
          <ul class="download-feature-list">
            <li><span class="check">✓</span> Universal AppImage Standalone</li>
            <li><span class="check">✓</span> Official Debian / Ubuntu (.deb)</li>
          </ul>
        </div>
        <div class="download-btn-group">
          <a href="https://github.com/jupiterbania/Telegram-Drive/releases/download/v1.2.0/TG-Drive-v1.2.0-Linux-x64.AppImage" target="_blank" class="btn btn-secondary" style="width: 100%; font-size: 0.84rem;">
            ⬇️ Download AppImage (~87.1 MB)
          </a>
          <a href="https://github.com/jupiterbania/Telegram-Drive/releases/download/v1.2.0/TG-Drive-v1.2.0-Linux-x64.deb" target="_blank" class="btn btn-secondary" style="width: 100%; font-size: 0.84rem;">
            ⬇️ Download Debian / Ubuntu .deb (~9.9 MB)
          </a>
        </div>
      </div>

      <!-- 5. iOS & iPadOS Card -->
      <div class="download-card" style="border-color: rgba(245, 158, 11, 0.35);">
        <div class="download-card-header">
          <span class="download-card-badge" style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3);">MOBILE &amp; TABLET</span>
          <h3><span style="font-size: 1.6rem;">📱</span> Apple iOS &amp; iPadOS</h3>
          <span class="file-tag" style="background: rgba(245, 158, 11, 0.12); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3);">IPA Package &amp; Simulator</span>
          <p>Direct sideload package for iPhone &amp; iPad (AltStore, SideStore, TrollStore, Scarlet, Sideloadly) and Xcode Simulator bundle.</p>
          <ul class="download-feature-list">
            <li><span class="check">✓</span> Sideload Direct Install IPA</li>
            <li><span class="check">✓</span> Fullscreen PWA &amp; WebDAV Files Mount</li>
          </ul>
        </div>
        <div class="download-btn-group">
          <a href="https://github.com/jupiterbania/Telegram-Drive/releases/download/v1.2.0/TG-Drive-v1.2.0-iOS-Direct-Install.ipa" target="_blank" class="btn btn-amber" style="width: 100%; font-size: 0.86rem;">
            ⬇️ Download iOS IPA Package
          </a>
          <a href="https://github.com/jupiterbania/Telegram-Drive/releases/download/v1.2.0/TG-Drive-v1.2.0-iOS-Simulator-App.zip" target="_blank" class="btn btn-secondary" style="width: 100%; font-size: 0.82rem;">
            ⬇️ Xcode Simulator App (.zip) →
          </a>
        </div>
      </div>
    </div>
  </section>

  <!-- FAQ Section -->
  <section id="faq" class="container">
    <div class="section-title">
      <h2>Frequently Asked Questions</h2>
      <p>Everything you need to know about TG Drive Pro, lifetime licensing, and Telegram cloud storage</p>
    </div>

    <div class="faq-container">
      <div class="faq-item">
        <div class="faq-question" onclick="toggleFaq(this)">
          <span>How does TG Drive provide unlimited cloud storage?</span>
          <span class="faq-icon">+</span>
        </div>
        <div class="faq-answer">
          TG Drive connects directly to Telegram's official MTProto 2.0 protocol and stores your files in your personal "Saved Messages" or private cloud channels. Telegram provides unlimited cloud file hosting for all users without bandwidth throttling, and TG Drive provides the file explorer, vault encryption, video streamer, and folder organization layer.
        </div>
      </div>

      <div class="faq-item">
        <div class="faq-question" onclick="toggleFaq(this)">
          <span>How does Telegram account permanent license sync work?</span>
          <span class="faq-icon">+</span>
        </div>
        <div class="faq-answer">
          When you purchase or activate your license key, our license server binds the key to your Telegram User ID and Phone Number in the Cloudflare D1 database. Next time you log in from any smartphone, laptop, or new PC with that Telegram account, the app automatically verifies your Pro status in the background without asking you to buy again.
        </div>
      </div>

      <div class="faq-item">
        <div class="faq-question" onclick="toggleFaq(this)">
          <span>Is TG Drive secure? Can Telegram or third parties read my files?</span>
          <span class="faq-icon">+</span>
        </div>
        <div class="faq-answer">
          TG Drive features a built-in Zero-Knowledge Cloud Vault (TDENC2 AEAD). When you enable encryption on a folder or file, it is encrypted locally on your device with your master passphrase using XChaCha20-Poly1305 / AES-256 before being uploaded. Your passphrase never leaves your device, so neither Telegram nor anyone else can read the contents.
        </div>
      </div>

      <div class="faq-item">
        <div class="faq-question" onclick="toggleFaq(this)">
          <span>Are there any recurring monthly or annual fees?</span>
          <span class="faq-icon">+</span>
        </div>
        <div class="faq-answer">
          No! TG Drive Lifetime Pro is a one-time purchase with perpetual validity. You pay once and receive lifetime software updates, multi-device access on your Telegram account, and zero recurring monthly fees.
        </div>
      </div>

      <div class="faq-item">
        <div class="faq-question" onclick="toggleFaq(this)">
          <span>What happens if I lose my license key or change my device?</span>
          <span class="faq-icon">+</span>
        </div>
        <div class="faq-answer">
          You can recover your license key anytime using our 24/7 Self-Service Key Recovery Portal at <a href="/recover" style="color: var(--accent-cyan); font-weight: bold;">/recover</a>. Just enter the email address used during purchase, and an OTP verification code will instantly retrieve your key and signed PDF certificate.
        </div>
      </div>
    </div>
  </section>

  <!-- Policies & Merchant Terms -->
  <section id="policies" class="container">
    <div class="policy-section">
      <div class="section-title" style="margin-bottom: 20px;">
        <h2>Merchant &amp; Customer Protection Policies</h2>
        <p>Fully compliant with consumer protection norms and RBI payment gateway regulations</p>
      </div>

      <div class="policy-grid">
        <div class="policy-item">
          <h3>1. Merchant Identity</h3>
          <p><strong>Eveyka Software</strong> develops cross-platform utility software, secure cloud storage synchronization agents, and digital productivity tools.</p>
        </div>
        <div class="policy-item">
          <h3>2. Digital Fulfillment</h3>
          <p>Products are digital commercial software licenses. Upon payment confirmation, license keys &amp; signed PDF certificates are dispatched instantly via automated email within 60 seconds.</p>
        </div>
        <div class="policy-item">
          <h3>3. Refund &amp; Resolution</h3>
          <p>We provide full technical support for key activations. For key replacement, billing questions, or resolution queries, contact our desk within 24 hours of purchase.</p>
        </div>
        <div class="policy-item">
          <h3>4. Terms of License</h3>
          <p>Purchasing grants a perpetual personal license key for use on desktop and mobile client applications bound to your Telegram user account.</p>
        </div>
        <div class="policy-item">
          <h3>5. Privacy &amp; Security</h3>
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
      <h2 style="font-size: 1.9rem; margin-bottom: 10px;">Customer Support Desk</h2>
      <p style="color: var(--text-muted); max-width: 640px; margin: 0 auto 26px; font-size: 0.98rem;">
        Have a question about your order, license key, or feature setup? Our team is active on Telegram to assist you directly.
      </p>
      <div style="display: flex; gap: 14px; justify-content: center; flex-wrap: wrap;">
        <a href="https://t.me/Theexposes" target="_blank" class="btn btn-primary" style="font-size: 1rem; padding: 14px 28px;">
          💬 Telegram Support: @Theexposes
        </a>
        <a href="/recover" class="btn btn-secondary" style="font-size: 1rem; padding: 14px 28px;">
          🔑 License Recovery Portal
        </a>
      </div>
    </div>
  </section>

  <!-- Legal Disclaimer -->
  <div class="container" style="margin-bottom: 30px;">
    <p style="font-size: 0.78rem; color: #64748b; line-height: 1.6; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.06); padding-top: 24px;">
      <strong>Disclaimer &amp; Non-Affiliation Notice:</strong> TG Drive (Telegram Drive) is an independent utility application developed by Eveyka Software using Telegram's official open-source MTProto / Bot API protocol. It is not affiliated with, sponsored, or endorsed by Telegram Messenger Inc. All product names, logos, and brands are property of their respective owners.
    </p>
  </div>

  <!-- Footer -->
  <footer>
    <div class="container">
      <p>© 2026 <strong>Eveyka Software</strong>. All Rights Reserved.</p>
      <p style="margin-top: 8px; font-size: 0.82rem; color: #64748b;">
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

    // Mobile Navigation Drawer Toggle
    function toggleMobileNav() {
      const drawer = document.getElementById('mobileNavDrawer');
      if (drawer) {
        drawer.classList.toggle('open');
      }
    }

    // FAQ Accordion Toggle
    function toggleFaq(btn) {
      const item = btn.parentElement;
      item.classList.toggle('active');
    }

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
      const tgId = (document.getElementById('custTgId') ? document.getElementById('custTgId').value.trim() : '');
      const phone = (document.getElementById('custPhone') ? document.getElementById('custPhone').value.trim() : '');
      const code = appliedDiscount ? appliedDiscount.code : document.getElementById('promoCode').value.trim();
      const btn = document.getElementById('buySubmitBtn');

      const urlParams = new URLSearchParams(window.location.search);
      const passedTgId = tgId || urlParams.get('tg_id') || urlParams.get('telegram_user_id') || '';
      const passedTgPhone = phone || urlParams.get('tg_phone') || urlParams.get('phone') || '';

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
            telegram_user_id: passedTgId,
            phone_number: passedTgPhone,
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
          let prefilled = fallbackStoreUrl + sep + 'prefill[name]=' + encodeURIComponent(name) + '&prefill[email]=' + encodeURIComponent(email);
          if (passedTgPhone) prefilled += '&prefill[contact]=' + encodeURIComponent(passedTgPhone);
          window.location.href = prefilled;
        }
      } catch (err) {
        const sep = fallbackStoreUrl.includes('?') ? '&' : '?';
        let prefilled = fallbackStoreUrl + sep + 'prefill[name]=' + encodeURIComponent(name) + '&prefill[email]=' + encodeURIComponent(email);
        if (passedTgPhone) prefilled += '&prefill[contact]=' + encodeURIComponent(passedTgPhone);
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

        // Check URL Query Parameters for prefilled account details (?name=...&email=...&tg_id=...&tg_phone=...&ref=...&coupon=...)
        const urlParams = new URLSearchParams(window.location.search);
        const nameParam = urlParams.get('name') || urlParams.get('customer_name');
        const emailParam = urlParams.get('email') || urlParams.get('customer_email');
        const tgIdParam = urlParams.get('tg_id') || urlParams.get('telegram_user_id');
        const phoneParam = urlParams.get('tg_phone') || urlParams.get('phone');
        const refParam = urlParams.get('ref') || urlParams.get('referral');
        const couponParam = urlParams.get('coupon') || urlParams.get('code');

        if (nameParam && document.getElementById('custName')) {
          document.getElementById('custName').value = nameParam.trim();
        }
        if (emailParam && document.getElementById('custEmail')) {
          document.getElementById('custEmail').value = emailParam.trim();
        }
        if (tgIdParam && document.getElementById('custTgId')) {
          document.getElementById('custTgId').value = tgIdParam.trim();
        }
        if (phoneParam && document.getElementById('custPhone')) {
          document.getElementById('custPhone').value = phoneParam.trim();
        }

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
