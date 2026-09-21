/**
 * App Growth & Monetization OS
 * Master Controller Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initTheme();
  initCalculator();
  initRoadmap();
  render50Scripts();
  renderAIPrompts();
  initScriptSearchAndFilter();
});

/* ==========================================================================
   1. Tab Navigation System
   ========================================================================== */
function initTabs() {
  const navButtons = document.querySelectorAll('.nav-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });
}

function switchTab(tabId) {
  const navButtons = document.querySelectorAll('.nav-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  navButtons.forEach(btn => {
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('active');
      btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    } else {
      btn.classList.remove('active');
    }
  });

  tabPanes.forEach(pane => {
    if (pane.id === `tab-${tabId}`) {
      pane.classList.add('active');
      window.scrollTo({
        top: pane.offsetTop - 90,
        behavior: 'smooth'
      });
    } else {
      pane.classList.remove('active');
    }
  });
}

/* ==========================================================================
   2. Theme Toggle (Dark / Light)
   ========================================================================== */
function initTheme() {
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const savedTheme = localStorage.getItem('app_growth_theme');

  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('light-theme');
      const isLight = document.body.classList.contains('light-theme');
      localStorage.setItem('app_growth_theme', isLight ? 'light' : 'dark');
    });
  }
}

/* ==========================================================================
   3. Render 50 Detailed Video Scripts
   ========================================================================== */
let activeCategory = 'all';
let searchQuery = '';

function render50Scripts() {
  const container = document.getElementById('master50ScriptsContainer');
  if (!container || !window.MASTER_50_SCRIPTS) return;

  const filtered = window.MASTER_50_SCRIPTS.filter(script => {
    const matchesCat = (activeCategory === 'all' || script.cat === activeCategory);
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || 
      script.title.toLowerCase().includes(query) ||
      script.hook.toLowerCase().includes(query) ||
      script.voiceover.toLowerCase().includes(query) ||
      script.categoryName.toLowerCase().includes(query);

    return matchesCat && matchesSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="content-card" style="text-align:center; padding: 3rem;">
        <h3>No scripts found matching "${searchQuery}"</h3>
        <p style="color:var(--text-muted); margin-top:0.5rem;">Try another keyword or select "All" categories.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map((script, idx) => `
    <div class="script-card-full" id="card-${script.id}" data-category="${script.cat}">
      <div class="script-meta-row">
        <div class="meta-badges">
          <span class="badge-cat">Script #${script.id.replace('script-', '')} • ${script.categoryName}</span>
          <span class="badge-time">⏱️ ${script.duration}</span>
        </div>
        <button class="copy-btn" onclick="copyFullScript('${script.id}')">📋 Copy Full Script</button>
      </div>

      <h3>${script.title}</h3>

      <div class="script-block">
        <span class="block-label">🔥 3-Second Scroll-Stopping Hook:</span>
        <p class="block-content"><strong>"${script.hook}"</strong></p>
      </div>

      <div class="script-block">
        <span class="block-label">🎬 Visual Action (What to show on screen):</span>
        <p class="block-content">${script.visuals}</p>
      </div>

      <div class="script-block">
        <span class="block-label">🎙️ Voiceover Audio Script (English + Hinglish):</span>
        <div class="voiceover-text">${script.voiceover}</div>
      </div>

      <div class="script-block">
        <span class="block-label">📺 On-Screen Text & Subtitle Overlay:</span>
        <p class="block-content"><code>${script.onScreenText}</code></p>
      </div>

      <div class="script-block">
        <span class="block-label">🚀 Call To Action (CTA):</span>
        <p class="block-content" style="color:var(--accent-emerald); font-weight:700;">${script.cta}</p>
      </div>
    </div>
  `).join('');
}

function initScriptSearchAndFilter() {
  const searchInput = document.getElementById('scriptSearchInput');
  const filterButtons = document.querySelectorAll('#fiftyScriptFilters .filter-btn');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      render50Scripts();
    });
  }

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.getAttribute('data-cat');
      render50Scripts();
    });
  });
}

function copyFullScript(scriptId) {
  const script = window.MASTER_50_SCRIPTS.find(s => s.id === scriptId);
  if (!script) return;

  const formattedText = `
=== ${script.title.toUpperCase()} ===
Category: ${script.categoryName}
Target Duration: ${script.duration}

[0-3s SCROLL-STOPPING HOOK]:
"${script.hook}"

[VISUAL ACTIONS ON SCREEN]:
${script.visuals}

[VOICEOVER SCRIPT (Audio)]:
${script.voiceover}

[ON-SCREEN TEXT / CAPTION]:
${script.onScreenText}

[CALL TO ACTION (CTA)]:
${script.cta}
`.trim();

  copyToClipboardText(formattedText, `Script #${script.id.replace('script-', '')} copied! ✅`);
}

/* ==========================================================================
   4. Render 10 AI Video Generator Prompts
   ========================================================================== */
function renderAIPrompts() {
  const container = document.getElementById('aiPromptsContainer');
  if (!container || !window.AI_VIDEO_SCRIPTS) return;

  container.innerHTML = window.AI_VIDEO_SCRIPTS.map((ai, index) => `
    <div class="ai-card" id="ai-card-${ai.id}">
      <div class="script-meta-row">
        <div class="meta-badges">
          <span class="ai-badge">AI Video #${index + 1}</span>
          <span class="badge-time">⏱️ ${ai.duration}</span>
        </div>
        <button class="copy-btn" onclick="copyAIPrompt('${ai.id}')">📋 Copy AI Prompt</button>
      </div>

      <h3>${ai.title}</h3>
      <p style="font-size:0.85rem; color:var(--text-muted);">
        <strong>Recommended AI Tools:</strong> ${ai.aiTools}
      </p>

      <div class="script-block">
        <span class="block-label">💡 Scene Concept & Hook:</span>
        <p class="block-content">${ai.concept}</p>
      </div>

      <div class="script-block">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.25rem;">
          <span class="block-label">🎨 Text-To-Video AI Prompt (Copy to Runway/Kling):</span>
          <button class="copy-btn" style="padding:0.15rem 0.5rem; font-size:0.75rem;" onclick="copySingleText('${ai.id}-prompt', 'Visual prompt copied! ✅')">Copy Prompt</button>
        </div>
        <div id="${ai.id}-prompt" class="prompt-box">${ai.visualPrompt}</div>
      </div>

      <div class="script-block">
        <span class="block-label">🎙️ Voiceover Script (ElevenLabs / CapCut AI Voice):</span>
        <div class="voiceover-text">${ai.voiceover}</div>
      </div>

      <div class="script-block">
        <span class="block-label">📺 On-Screen Text & Subtitle:</span>
        <p class="block-content"><code>${ai.onScreenText}</code></p>
      </div>

      <div class="script-block">
        <span class="block-label">🚀 Call To Action:</span>
        <p class="block-content" style="color:var(--accent-cyan); font-weight:700;">${ai.cta}</p>
      </div>
    </div>
  `).join('');
}

function copyAIPrompt(aiId) {
  const ai = window.AI_VIDEO_SCRIPTS.find(item => item.id === aiId);
  if (!ai) return;

  const fullContent = `
=== AI VIDEO PROMPT: ${ai.title.toUpperCase()} ===
Duration: ${ai.duration}
AI Generators: ${ai.aiTools}

[TEXT-TO-VIDEO VISUAL PROMPT]:
${ai.visualPrompt}

[VOICEOVER SCRIPT]:
${ai.voiceover}

[ON-SCREEN TEXT]:
${ai.onScreenText}

[CTA]:
${ai.cta}
`.trim();

  copyToClipboardText(fullContent, `AI Prompt #${ai.id.replace('ai-', '')} copied! ✅`);
}

function copySingleText(elementId, toastMsg) {
  const el = document.getElementById(elementId);
  if (!el) return;
  copyToClipboardText(el.textContent.trim(), toastMsg);
}

function copyToClipboardText(text, toastMsg = 'Copied to clipboard! ✅') {
  navigator.clipboard.writeText(text).then(() => {
    showToast(toastMsg);
  }).catch(err => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast(toastMsg);
  });
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

/* ==========================================================================
   5. Interactive ROI & Revenue Calculator
   ========================================================================== */
function initCalculator() {
  const dailyDownloads = document.getElementById('dailyDownloads');
  const convRate = document.getElementById('convRate');
  const licensePrice = document.getElementById('licensePrice');
  const monthlyAdSpend = document.getElementById('monthlyAdSpend');

  if (!dailyDownloads || !convRate || !licensePrice || !monthlyAdSpend) return;

  const updateCalc = () => {
    const dailyDls = parseInt(dailyDownloads.value, 10);
    const conv = parseFloat(convRate.value);
    const price = parseFloat(licensePrice.value);
    const adSpend = parseFloat(monthlyAdSpend.value);

    // Update Slider Labels
    document.getElementById('dailyDownloadsVal').textContent = dailyDls.toLocaleString();
    document.getElementById('convRateVal').textContent = `${conv.toFixed(1)}%`;
    document.getElementById('licensePriceVal').textContent = `$${price}`;
    document.getElementById('monthlyAdSpendVal').textContent = `$${adSpend.toLocaleString()}`;

    // Calculations
    const monthlyDls = dailyDls * 30;
    const payingUsers = Math.round(monthlyDls * (conv / 100));
    const grossRevUSD = payingUsers * price;
    const netProfitUSD = grossRevUSD - adSpend;

    const inrRate = 83.2;
    const grossRevINR = Math.round(grossRevUSD * inrRate);
    const netProfitINR = Math.round(netProfitUSD * inrRate);

    const cac = payingUsers > 0 && adSpend > 0 ? (adSpend / payingUsers).toFixed(2) : '0.00';
    const roas = adSpend > 0 ? (grossRevUSD / adSpend).toFixed(1) + 'x' : 'Organic (∞)';

    document.getElementById('resMonthlyDownloads').textContent = monthlyDls.toLocaleString();
    document.getElementById('resPayingUsers').textContent = payingUsers.toLocaleString();
    document.getElementById('resGrossRev').textContent = `$${grossRevUSD.toLocaleString()}`;
    document.getElementById('resGrossRevINR').textContent = `≈ ₹${grossRevINR.toLocaleString()} INR`;
    document.getElementById('resNetProfit').textContent = `$${netProfitUSD.toLocaleString()}`;
    document.getElementById('resNetProfitINR').textContent = `≈ ₹${netProfitINR.toLocaleString()} INR`;

    document.getElementById('resCAC').textContent = `$${cac} / buyer`;
    document.getElementById('resROAS').textContent = roas;
  };

  dailyDownloads.addEventListener('input', updateCalc);
  convRate.addEventListener('input', updateCalc);
  licensePrice.addEventListener('input', updateCalc);
  monthlyAdSpend.addEventListener('input', updateCalc);

  updateCalc();
}

/* ==========================================================================
   6. Interactive 30-Day Roadmap with LocalStorage
   ========================================================================== */
function initRoadmap() {
  const checkboxes = document.querySelectorAll('.task-item input[type="checkbox"]');
  const progressPercent = document.getElementById('progressPercent');
  const progressBarFill = document.getElementById('progressBarFill');

  if (!checkboxes.length) return;

  const STORAGE_KEY = 'app_growth_roadmap_tasks_v2';
  let savedState = {};

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) savedState = JSON.parse(raw);
  } catch (e) {
    savedState = {};
  }

  checkboxes.forEach(cb => {
    const taskId = cb.getAttribute('data-task');
    if (savedState[taskId]) {
      cb.checked = true;
      cb.closest('.task-item').classList.add('completed');
    }

    cb.addEventListener('change', () => {
      const parent = cb.closest('.task-item');
      if (cb.checked) {
        parent.classList.add('completed');
        savedState[taskId] = true;
      } else {
        parent.classList.remove('completed');
        delete savedState[taskId];
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedState));
      updateProgress();
    });
  });

  function updateProgress() {
    const total = checkboxes.length;
    let completed = 0;
    checkboxes.forEach(cb => {
      if (cb.checked) completed++;
    });

    const percent = Math.round((completed / total) * 100);
    if (progressPercent) progressPercent.textContent = `${percent}%`;
    if (progressBarFill) progressBarFill.style.width = `${percent}%`;
  }

  updateProgress();
}
