/**
 * Gold Rate Calculator - Application Logic
 * Integrates live rates from devijewellers.lk where published rates are for 8 grams.
 * Supports weight in Grams (g) and Milligrams (mg), making charges, and seller price comparison.
 */

(() => {
  'use strict';

  // Constants
  const SOVEREIGN_IN_GRAMS = 8.0;

  // Devi's published rates are for 8 grams
  const DEFAULT_FALLBACK_SOVEREIGN_RATES = {
    sov24k: 343000,
    sov22k: 315600,
    sov21k: 300125,
    sov18k: 257250,
    timestamp: new Date().toISOString(),
  };

  const STORAGE_KEY = 'gold_calculator_state_v6';

  function formatDateTime(d = new Date()) {
    const dateObj = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(dateObj.getTime())) return String(d);
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) + ', ' + dateObj.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // App State
  const state = {
    sourceMode: 'devi', // 'devi' | 'manual'
    sov24k: DEFAULT_FALLBACK_SOVEREIGN_RATES.sov24k,
    sov22k: DEFAULT_FALLBACK_SOVEREIGN_RATES.sov22k,
    manualSov24k: DEFAULT_FALLBACK_SOVEREIGN_RATES.sov24k,
    manualSov22k: DEFAULT_FALLBACK_SOVEREIGN_RATES.sov22k,
    manualSov21k: DEFAULT_FALLBACK_SOVEREIGN_RATES.sov21k,
    manualSov18k: DEFAULT_FALLBACK_SOVEREIGN_RATES.sov18k,
    lastUpdated: null,
    isFetching: false,

    // Calculator inputs
    weight: 8,
    weightUnit: 'g', // 'g' | 'mg'
    selectedKt: 22, // 22 | 24 | 21 | 18
    makingValue: 0,
    makingMode: 'percent', // 'percent' | 'amount'
    sellerPrice: 0,
  };

  // DOM Elements Cache
  const elements = {
    refreshBtn: document.getElementById('refresh-btn'),
    settingsBtn: document.getElementById('settings-btn'),
    lastUpdatedText: document.getElementById('last-updated-text'),

    rate24kVal: document.getElementById('rate-24k-val'),
    rate22kVal: document.getElementById('rate-22k-val'),

    weightInput: document.getElementById('weight-input'),
    unitBtns: document.querySelectorAll('.unit-btn'),
    equivGrams: document.getElementById('equiv-grams'),
    equivMg: document.getElementById('equiv-mg'),

    karatCards: document.querySelectorAll('.karat-card'),

    makingInput: document.getElementById('making-input'),
    makingTypeBtns: document.querySelectorAll('.making-type-btn'),

    sellerPriceInput: document.getElementById('seller-price-input'),
    sellerDiffBanner: document.getElementById('seller-diff-banner'),
    diffTitleLabel: document.getElementById('diff-title-label'),
    diffPctBadge: document.getElementById('diff-pct-badge'),
    diffAmountVal: document.getElementById('diff-amount-val'),

    effectiveKtBadge: document.getElementById('effective-kt-badge'),
    grandTotalVal: document.getElementById('grand-total-val'),
    baseGoldVal: document.getElementById('base-gold-val'),
    makingChargeVal: document.getElementById('making-charge-val'),
    effectiveRateGram: document.getElementById('effective-rate-gram'),
    effectiveRateMg: document.getElementById('effective-rate-mg'),

    copySummaryBtn: document.getElementById('copy-summary-btn'),
    copyBtnText: document.getElementById('copy-btn-text'),
    resetBtn: document.getElementById('reset-btn'),

    settingsDialog: document.getElementById('settings-dialog'),
    dialogCloseX: document.getElementById('dialog-close-x'),
    saveSettingsBtn: document.getElementById('save-settings-btn'),
    cancelSettingsBtn: document.getElementById('cancel-settings-btn'),
    sourceToggleBtns: document.querySelectorAll('.source-toggle-btn'),
    manualInputsBlock: document.getElementById('manual-inputs-block'),
    manual24kInput: document.getElementById('manual-24k-input'),
    manual22kInput: document.getElementById('manual-22k-input'),
    manual21kInput: document.getElementById('manual-21k-input'),
    manual18kInput: document.getElementById('manual-18k-input'),

    toast: document.getElementById('toast'),
  };

  // Number Formatter helper
  function formatLKR(num, decimals = 2) {
    if (isNaN(num) || num === null || num === undefined) return '0.00';
    return Number(num).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  // Toast Notification
  let toastTimer = null;
  function showToast(message) {
    if (!elements.toast) return;
    elements.toast.textContent = message;
    elements.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      elements.toast.classList.remove('show');
    }, 2800);
  }

  // Local Storage
  function loadPersistedData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.sourceMode) state.sourceMode = parsed.sourceMode;
        if (parsed.sov24k) state.sov24k = Number(parsed.sov24k);
        if (parsed.sov22k) state.sov22k = Number(parsed.sov22k);
        if (parsed.manualSov24k) state.manualSov24k = Number(parsed.manualSov24k);
        if (parsed.manualSov22k) state.manualSov22k = Number(parsed.manualSov22k);
        if (parsed.manualSov21k) state.manualSov21k = Number(parsed.manualSov21k);
        if (parsed.manualSov18k) state.manualSov18k = Number(parsed.manualSov18k);
        if (parsed.lastUpdated) state.lastUpdated = parsed.lastUpdated;
        if (parsed.weight !== undefined) state.weight = parsed.weight;
        if (parsed.weightUnit === 'g' || parsed.weightUnit === 'mg') {
          state.weightUnit = parsed.weightUnit;
        } else {
          state.weightUnit = 'g';
        }
        if ([24, 22, 21, 18].includes(Number(parsed.selectedKt))) {
          state.selectedKt = Number(parsed.selectedKt);
        } else {
          state.selectedKt = 22;
        }
        if (parsed.makingValue !== undefined) state.makingValue = parsed.makingValue;
        if (parsed.makingMode) state.makingMode = parsed.makingMode;
        if (parsed.sellerPrice !== undefined) state.sellerPrice = parsed.sellerPrice;
      }
    } catch (e) {
      console.warn('Unable to load from localStorage:', e);
    }
  }

  function persistData() {
    try {
      const data = {
        sourceMode: state.sourceMode,
        sov24k: state.sov24k,
        sov22k: state.sov22k,
        manualSov24k: state.manualSov24k,
        manualSov22k: state.manualSov22k,
        manualSov21k: state.manualSov21k,
        manualSov18k: state.manualSov18k,
        lastUpdated: state.lastUpdated,
        weight: state.weight,
        weightUnit: state.weightUnit,
        selectedKt: state.selectedKt,
        makingValue: state.makingValue,
        makingMode: state.makingMode,
        sellerPrice: state.sellerPrice,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Unable to save to localStorage:', e);
    }
  }

  // Rate Parser for Devi Jewellers (Numbers extracted are per 8g)
  function extractRatesFromHTML(html) {
    let sov22 = null;
    let sov24 = null;

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const purity22El = doc.querySelector('.purity_22');
      if (purity22El) {
        const m = purity22El.textContent.match(/22KT[^\d]*([\d,]+(?:\.\d+)?)/i);
        if (m) sov22 = parseFloat(m[1].replace(/,/g, ''));
      }

      const purity24El = doc.querySelector('.purity_24');
      if (purity24El) {
        const m = purity24El.textContent.match(/24KT[^\d]*([\d,]+(?:\.\d+)?)/i);
        if (m) sov24 = parseFloat(m[1].replace(/,/g, ''));
      }
    } catch (e) {
      console.warn('DOM parsing failed, falling back to regex:', e);
    }

    if (!sov22) {
      const m22 = html.match(/(?:22\s*KT|\(22KT\))[^\d]*([\d,]+(?:\.\d+)?)\s*LKR/i);
      if (m22) sov22 = parseFloat(m22[1].replace(/,/g, ''));
    }
    if (!sov24) {
      const m24 = html.match(/(?:24\s*KT|\(24KT\))[^\d]*([\d,]+(?:\.\d+)?)\s*LKR/i);
      if (m24) sov24 = parseFloat(m24[1].replace(/,/g, ''));
    }

    if (sov22 && sov24) {
      return { sov22, sov24 };
    }
    return null;
  }

  // Fetch rates with multi-layer fallback
  async function fetchDeviRates() {
    if (state.sourceMode === 'manual') {
      applyManualRates();
      return;
    }

    state.isFetching = true;
    updateRefreshButtonState();
    elements.lastUpdatedText.textContent = 'Last updated: Fetching live rates...';

    let fetched = null;

    // Strategy 1: Direct fetch from devijewellers.lk
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch('https://devijewellers.lk/', {
        signal: controller.signal,
        headers: { 'Accept': 'text/html' },
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const html = await res.text();
        fetched = extractRatesFromHTML(html);
      }
    } catch (err) {
      console.warn('Direct fetch failed, trying admin-ajax endpoint:', err.message);
    }

    // Strategy 2: AJAX chart data endpoint on devijewellers.lk
    if (!fetched) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const res = await fetch('https://devijewellers.lk/wp-admin/admin-ajax.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'action=gpt_chart_data&range=week',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            const latest = list[list.length - 1];
            if (latest.price_24k && latest.price_22k) {
              fetched = {
                sov24: parseFloat(latest.price_24k),
                sov22: parseFloat(latest.price_22k),
              };
            }
          }
        }
      } catch (err) {
        console.warn('Admin-ajax endpoint failed, trying CORS proxy:', err.message);
      }
    }

    // Strategy 3: Public CORS proxy fallback
    if (!fetched) {
      try {
        const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://devijewellers.lk/');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);
        const res = await fetch(proxyUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const html = await res.text();
          fetched = extractRatesFromHTML(html);
        }
      } catch (err) {
        console.warn('CORS proxy fetch failed:', err.message);
      }
    }

    state.isFetching = false;
    updateRefreshButtonState();

    if (fetched && fetched.sov22 && fetched.sov24) {
      state.sov24k = fetched.sov24;
      state.sov22k = fetched.sov22;
      state.lastUpdated = formatDateTime(new Date());
      persistData();
      renderRates();
      recalculate();
      showToast('Rates updated from online sources');
    } else {
      if (!state.lastUpdated) {
        state.sov24k = state.manualSov24k || DEFAULT_FALLBACK_SOVEREIGN_RATES.sov24k;
        state.sov22k = state.manualSov22k || DEFAULT_FALLBACK_SOVEREIGN_RATES.sov22k;
        state.lastUpdated = formatDateTime(new Date());
      }
      renderRates();
      recalculate();
      showToast('Online source unreachable, using cached rate');
    }
  }

  function applyManualRates() {
    state.sov24k = state.manualSov24k || DEFAULT_FALLBACK_SOVEREIGN_RATES.sov24k;
    state.sov22k = state.manualSov22k || DEFAULT_FALLBACK_SOVEREIGN_RATES.sov22k;
    state.lastUpdated = 'Manual Override';
    renderRates();
    recalculate();
  }

  function updateRefreshButtonState() {
    const icon = elements.refreshBtn ? elements.refreshBtn.querySelector('.refresh-icon') : null;
    if (icon) {
      if (state.isFetching) {
        icon.classList.add('spinning');
      } else {
        icon.classList.remove('spinning');
      }
    }
  }

  // Render Rate Ticker Cards & Timestamp (Prominent 8g values)
  function renderRates() {
    if (elements.lastUpdatedText) {
      elements.lastUpdatedText.textContent = `Last updated: ${state.lastUpdated || 'Fetching...'}`;
    }

    // 24K: 8 grams rate
    const activeSov24 = state.sourceMode === 'manual' ? (state.manualSov24k || state.sov24k) : state.sov24k;
    if (elements.rate24kVal) {
      elements.rate24kVal.textContent = formatLKR(activeSov24, 0);
    }

    // 22K: 8 grams rate
    const activeSov22 = state.sourceMode === 'manual' ? (state.manualSov22k || state.sov22k) : state.sov22k;
    if (elements.rate22kVal) {
      elements.rate22kVal.textContent = formatLKR(activeSov22, 0);
    }
  }

  // Calculate Jewelry Value & Seller Difference
  function recalculate() {
    const rawWeight = parseFloat(elements.weightInput.value) || 0;
    state.weight = rawWeight;

    // Convert input weight to grams and milligrams
    let weightInGrams = 0;
    let weightInMg = 0;

    if (state.weightUnit === 'g') {
      weightInGrams = rawWeight;
      weightInMg = rawWeight * 1000;
    } else if (state.weightUnit === 'mg') {
      weightInGrams = rawWeight / 1000;
      weightInMg = rawWeight;
    }

    // Secondary equivalent display
    if (elements.equivGrams) elements.equivGrams.textContent = `${weightInGrams.toFixed(3)} g`;
    if (elements.equivMg) elements.equivMg.textContent = `${Math.round(weightInMg).toLocaleString('en-US')} mg`;

    // Determine Gold Rate per Gram based on selected KT (8g sovereign rate / 8.0)
    let ratePerGram = 0;
    let activeSovereignRate = 0;

    if (state.selectedKt === 24) {
      activeSovereignRate = state.sourceMode === 'manual' ? (state.manualSov24k || state.sov24k) : state.sov24k;
      ratePerGram = activeSovereignRate / SOVEREIGN_IN_GRAMS;
    } else if (state.selectedKt === 22) {
      activeSovereignRate = state.sourceMode === 'manual' ? (state.manualSov22k || state.sov22k) : state.sov22k;
      ratePerGram = activeSovereignRate / SOVEREIGN_IN_GRAMS;
    } else if (state.selectedKt === 21) {
      activeSovereignRate = state.manualSov21k || (state.sov24k * 21 / 24);
      ratePerGram = activeSovereignRate / SOVEREIGN_IN_GRAMS;
    } else if (state.selectedKt === 18) {
      activeSovereignRate = state.manualSov18k || (state.sov24k * 18 / 24);
      ratePerGram = activeSovereignRate / SOVEREIGN_IN_GRAMS;
    }

    // Base Gold Value = Weight (in grams) × Rate (per gram)
    const baseGoldPrice = weightInGrams * ratePerGram;

    // Making Charges
    const rawMakingVal = parseFloat(elements.makingInput.value) || 0;
    state.makingValue = rawMakingVal;

    let makingCharge = 0;
    if (state.makingMode === 'percent') {
      makingCharge = baseGoldPrice * (rawMakingVal / 100);
    } else {
      makingCharge = rawMakingVal;
    }

    // Grand Total (Calculated Actual Value)
    const grandTotal = baseGoldPrice + makingCharge;

    // Seller's Quoted Price
    const rawSellerPrice = parseFloat(elements.sellerPriceInput.value) || 0;
    state.sellerPrice = rawSellerPrice;

    // Handle Seller's Price Difference / Overcharge comparison
    if (state.sellerPrice > 0 && grandTotal > 0) {
      elements.sellerDiffBanner.style.display = 'flex';
      const diff = state.sellerPrice - grandTotal;
      const diffPct = (diff / grandTotal) * 100;

      if (diff > 0.5) {
        elements.sellerDiffBanner.className = 'diff-banner overcharge';
        elements.diffTitleLabel.textContent = 'Seller Premium';
        elements.diffPctBadge.textContent = `+${diffPct.toFixed(1)}%`;
        elements.diffAmountVal.textContent = `+ ${formatLKR(diff, 2)}`;
      } else if (diff < -0.5) {
        elements.sellerDiffBanner.className = 'diff-banner discount';
        elements.diffTitleLabel.textContent = 'Below Actual Value';
        elements.diffPctBadge.textContent = `${diffPct.toFixed(1)}%`;
        elements.diffAmountVal.textContent = `- ${formatLKR(Math.abs(diff), 2)}`;
      } else {
        elements.sellerDiffBanner.className = 'diff-banner exact';
        elements.diffTitleLabel.textContent = 'Matches Actual Value';
        elements.diffPctBadge.textContent = '0.0%';
        elements.diffAmountVal.textContent = '0.00';
      }
    } else {
      elements.sellerDiffBanner.style.display = 'none';
    }

    // Effective Rates (including making charges)
    const effectivePerGram = weightInGrams > 0 ? (grandTotal / weightInGrams) : ratePerGram;
    const effectivePerMg = effectivePerGram / 1000;

    // Update UI Displays
    if (elements.effectiveKtBadge) {
      const badgeWeight = state.weightUnit === 'mg' && weightInGrams < 1 
        ? `${Math.round(weightInMg)}mg` 
        : `${weightInGrams.toFixed(2)}g`;
      elements.effectiveKtBadge.textContent = `${state.selectedKt}KT • ${badgeWeight}`;
    }
    if (elements.grandTotalVal) {
      elements.grandTotalVal.textContent = formatLKR(grandTotal, 2);
    }
    if (elements.baseGoldVal) {
      elements.baseGoldVal.textContent = `LKR ${formatLKR(baseGoldPrice, 2)}`;
    }
    if (elements.makingChargeVal) {
      elements.makingChargeVal.textContent = `+ LKR ${formatLKR(makingCharge, 2)}`;
    }
    if (elements.effectiveRateGram) {
      elements.effectiveRateGram.textContent = `LKR ${formatLKR(effectivePerGram, 2)}`;
    }
    if (elements.effectiveRateMg) {
      elements.effectiveRateMg.textContent = `LKR ${formatLKR(effectivePerMg, 2)}`;
    }

    persistData();
  }

  // Unit Selector handlers: Grams (g) and Milligrams (mg)
  function setWeightUnit(newUnit) {
    if (state.weightUnit === newUnit) return;
    const currentVal = parseFloat(elements.weightInput.value) || 0;

    let convertedVal = currentVal;
    if (newUnit === 'mg' && state.weightUnit === 'g') {
      convertedVal = currentVal * 1000;
    } else if (newUnit === 'g' && state.weightUnit === 'mg') {
      convertedVal = currentVal / 1000;
    }

    state.weightUnit = newUnit;
    elements.weightInput.value = convertedVal > 0 ? Number(convertedVal.toFixed(3)) : '';

    elements.unitBtns.forEach(btn => {
      const isActive = btn.dataset.unit === newUnit;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
    });

    const weightUnitLabel = document.getElementById('weight-unit-label');
    if (weightUnitLabel) weightUnitLabel.textContent = newUnit;

    recalculate();
  }

  function setKarat(kt) {
    state.selectedKt = Number(kt);
    elements.karatCards.forEach(card => {
      const isActive = Number(card.dataset.kt) === state.selectedKt;
      card.classList.toggle('active', isActive);
      card.setAttribute('aria-checked', isActive ? 'true' : 'false');
    });
    recalculate();
  }

  function setMakingMode(mode) {
    state.makingMode = mode;
    elements.makingTypeBtns.forEach(btn => {
      const isActive = btn.dataset.mode === mode;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
    });

    const makingUnitTag = document.getElementById('making-unit-tag');
    if (makingUnitTag) makingUnitTag.textContent = mode === 'percent' ? '%' : 'LKR';

    recalculate();
  }

  // Copy Summary to Clipboard
  async function copyQuote() {
    const grandTotal = elements.grandTotalVal.textContent;
    const baseVal = elements.baseGoldVal.textContent;
    const makingVal = elements.makingChargeVal.textContent;
    const rawWeight = elements.weightInput.value || '0';
    const unitLabel = state.weightUnit === 'g' ? 'g' : 'mg';
    const rateGram = elements.effectiveRateGram.textContent;
    const rateMg = elements.effectiveRateMg.textContent;

    let quoteText =
`Gold Rate Quote
Weight: ${rawWeight} ${unitLabel} (${elements.equivGrams.textContent} / ${elements.equivMg.textContent})
Purity: ${state.selectedKt}KT
Base Gold: ${baseVal}
Making: ${makingVal} (${state.makingValue}${state.makingMode === 'percent' ? '%' : ' LKR'})
Actual Value: LKR ${grandTotal}
Effective Rate: ${rateGram} /g | ${rateMg} /mg`;

    if (state.sellerPrice > 0) {
      const actualNum = parseFloat(grandTotal.replace(/,/g, '')) || 0;
      const diff = state.sellerPrice - actualNum;
      const diffPct = actualNum > 0 ? (diff / actualNum) * 100 : 0;
      quoteText += `\nSeller's Price: LKR ${formatLKR(state.sellerPrice, 2)}`;
      quoteText += `\nDifference: ${diff >= 0 ? '+' : ''}LKR ${formatLKR(diff, 2)} (${diff >= 0 ? '+' : ''}${diffPct.toFixed(1)}%)`;
    }

    quoteText += `\nLast Updated: ${state.lastUpdated || 'N/A'}`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(quoteText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = quoteText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      elements.copyBtnText.textContent = 'Copied!';
      showToast('Quote copied to clipboard');
      setTimeout(() => {
        elements.copyBtnText.textContent = 'Copy Quote';
      }, 2000);
    } catch (err) {
      console.error('Failed to copy quote:', err);
      showToast('Unable to copy to clipboard');
    }
  }

  // Reset to default standard jewel (8g, 22KT)
  function resetCalculator() {
    state.weight = 8;
    state.weightUnit = 'g';
    state.selectedKt = 22;
    state.makingValue = 0;
    state.makingMode = 'percent';
    state.sellerPrice = 0;

    elements.weightInput.value = '8';
    elements.makingInput.value = '0';
    elements.sellerPriceInput.value = '';

    setWeightUnit('g');
    setKarat(22);
    setMakingMode('percent');
    showToast('Reset to default values');
  }

  // Settings Dialog Controls
  function openSettings() {
    if (!elements.settingsDialog) return;

    elements.sourceToggleBtns.forEach(btn => {
      const isActive = btn.dataset.source === state.sourceMode;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
    });

    if (elements.manualInputsBlock) {
      elements.manualInputsBlock.classList.toggle('disabled', state.sourceMode === 'devi');
    }

    const onlineHint = document.getElementById('online-status-hint');
    if (onlineHint) {
      onlineHint.style.display = state.sourceMode === 'devi' ? 'flex' : 'none';
    }

    if (elements.manual24kInput) elements.manual24kInput.value = state.manualSov24k || state.sov24k;
    if (elements.manual22kInput) elements.manual22kInput.value = state.manualSov22k || state.sov22k;
    if (elements.manual21kInput) elements.manual21kInput.value = state.manualSov21k || DEFAULT_FALLBACK_SOVEREIGN_RATES.sov21k;
    if (elements.manual18kInput) elements.manual18kInput.value = state.manualSov18k || DEFAULT_FALLBACK_SOVEREIGN_RATES.sov18k;

    elements.settingsDialog.showModal();
  }

  function closeSettings() {
    if (elements.settingsDialog && elements.settingsDialog.open) {
      elements.settingsDialog.close();
    }
  }

  function saveSettings() {
    const selectedSourceBtn = document.querySelector('.source-toggle-btn.active');
    const newSource = selectedSourceBtn ? selectedSourceBtn.dataset.source : 'devi';

    const m24 = parseFloat(elements.manual24kInput.value);
    const m22 = parseFloat(elements.manual22kInput.value);
    const m21 = parseFloat(elements.manual21kInput.value);
    const m18 = parseFloat(elements.manual18kInput.value);

    if (m24 > 0) state.manualSov24k = m24;
    if (m22 > 0) state.manualSov22k = m22;
    if (m21 > 0) state.manualSov21k = m21;
    if (m18 > 0) state.manualSov18k = m18;

    const sourceChanged = state.sourceMode !== newSource;
    state.sourceMode = newSource;

    closeSettings();
    persistData();

    if (state.sourceMode === 'manual') {
      applyManualRates();
      showToast('Manual rates activated');
    } else {
      if (sourceChanged) {
        fetchDeviRates();
      } else {
        renderRates();
        recalculate();
      }
    }
  }

  // Event Listeners Setup
  function bindEvents() {
    if (elements.refreshBtn) {
      elements.refreshBtn.addEventListener('click', () => {
        if (state.sourceMode === 'manual') {
          showToast('In manual mode. Switch to online sources in settings to fetch.');
        } else {
          fetchDeviRates();
        }
      });
    }

    if (elements.settingsBtn) {
      elements.settingsBtn.addEventListener('click', openSettings);
    }
    if (elements.dialogCloseX) {
      elements.dialogCloseX.addEventListener('click', closeSettings);
    }
    if (elements.cancelSettingsBtn) {
      elements.cancelSettingsBtn.addEventListener('click', closeSettings);
    }
    if (elements.saveSettingsBtn) {
      elements.saveSettingsBtn.addEventListener('click', saveSettings);
    }

    if (elements.settingsDialog) {
      elements.settingsDialog.addEventListener('click', (e) => {
        const rect = elements.settingsDialog.getBoundingClientRect();
        const isInDialog = (
          rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
          rect.left <= e.clientX && e.clientX <= rect.left + rect.width
        );
        if (!isInDialog) {
          elements.settingsDialog.close();
        }
      });
    }

    elements.sourceToggleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        elements.sourceToggleBtns.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');
        const isManual = btn.dataset.source === 'manual';
        if (elements.manualInputsBlock) {
          elements.manualInputsBlock.classList.toggle('disabled', !isManual);
        }
        const onlineHint = document.getElementById('online-status-hint');
        if (onlineHint) {
          onlineHint.style.display = isManual ? 'none' : 'flex';
        }
      });
    });

    if (elements.weightInput) {
      elements.weightInput.addEventListener('input', () => {
        recalculate();
      });
    }

    elements.unitBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        setWeightUnit(btn.dataset.unit);
      });
    });

    elements.karatCards.forEach(card => {
      card.addEventListener('click', () => {
        setKarat(card.dataset.kt);
      });
    });

    if (elements.makingInput) {
      elements.makingInput.addEventListener('input', () => {
        recalculate();
      });
    }

    elements.makingTypeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        setMakingMode(btn.dataset.mode);
      });
    });

    if (elements.sellerPriceInput) {
      elements.sellerPriceInput.addEventListener('input', () => {
        recalculate();
      });
    }

    if (elements.copySummaryBtn) {
      elements.copySummaryBtn.addEventListener('click', copyQuote);
    }
    if (elements.resetBtn) {
      elements.resetBtn.addEventListener('click', resetCalculator);
    }
  }

  // Initialization
  function init() {
    loadPersistedData();

    if (elements.weightInput) elements.weightInput.value = state.weight;
    if (elements.makingInput) elements.makingInput.value = state.makingValue;
    if (elements.sellerPriceInput && state.sellerPrice > 0) {
      elements.sellerPriceInput.value = state.sellerPrice;
    }

    elements.unitBtns.forEach(btn => {
      const isActive = btn.dataset.unit === state.weightUnit;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
    });

    elements.karatCards.forEach(card => {
      const isActive = Number(card.dataset.kt) === state.selectedKt;
      card.classList.toggle('active', isActive);
      card.setAttribute('aria-checked', isActive ? 'true' : 'false');
    });

    elements.makingTypeBtns.forEach(btn => {
      const isActive = btn.dataset.mode === state.makingMode;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
    });

    const weightUnitLabel = document.getElementById('weight-unit-label');
    if (weightUnitLabel) weightUnitLabel.textContent = state.weightUnit;

    const makingUnitTag = document.getElementById('making-unit-tag');
    if (makingUnitTag) makingUnitTag.textContent = state.makingMode === 'percent' ? '%' : 'LKR';

    const onlineHint = document.getElementById('online-status-hint');
    if (onlineHint) {
      onlineHint.style.display = state.sourceMode === 'devi' ? 'flex' : 'none';
    }

    bindEvents();
    renderRates();
    recalculate();

    if (state.sourceMode === 'devi') {
      fetchDeviRates();
    }

    // Register Service Worker for PWA installability & offline capability
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch((err) => {
          console.warn('PWA service worker registration failed:', err);
        });
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
