/**
 * SkillSync - Centralized Bring Your Own Key (BYOK) Component
 * Manages user API key encryption, provider selection, settings UI, and global modal prompts.
 */

window.BYOKManager = (function () {
  let statusState = {
    hasKey: false,
    status: 'disconnected', // 'connected' | 'connecting' | 'invalid' | 'rate_limited' | 'disconnected'
    provider: 'gemini',
    maskedKey: '',
    updatedAt: null
  };

  let onStatusChangeCallback = null;
  let pendingRetryResolver = null;

  const getApiUrl = (endpoint) => {
    if (typeof window !== 'undefined' && (!window.API_BASE_URL || window.location.origin === (window.API_BASE_URL || '').replace(/\/$/, ''))) {
      return endpoint;
    }
    const base = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : (window.API_BASE_URL || '');
    return `${base.replace(/\/$/, '')}${endpoint}`;
  };

  function setStatus(newStatusState) {
    statusState = { ...statusState, ...newStatusState };
    renderCardUI();
    renderSettingsUI();
    renderModalUI();
    if (typeof onStatusChangeCallback === 'function') {
      onStatusChangeCallback(statusState);
    }
  }

  async function checkKeyStatus() {
    setStatus({ status: 'connecting' });
    let newStatus = 'disconnected';
    let hasKey = false;
    let provider = 'gemini';
    let maskedKey = '';
    let updatedAt = null;

    try {
      const res = await fetch(getApiUrl('/api/user/key-status'), {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        hasKey = !!data.hasKey;
        provider = data.provider || 'gemini';
        maskedKey = data.maskedKey || '';
        updatedAt = data.updatedAt || null;
        newStatus = data.status || (hasKey ? 'connected' : 'disconnected');
      }
    } catch (err) {
      console.error('Failed to check API key status:', err);
    } finally {
      setStatus({ status: newStatus, hasKey, provider, maskedKey, updatedAt });
    }
    return statusState;
  }

  async function connectKey(rawKey, selectedProvider = 'gemini') {
    if (!rawKey || !rawKey.trim()) {
      showFeedback('Please enter a valid API key.', 'error');
      return false;
    }

    setStatus({ status: 'connecting' });
    showFeedback('Testing & encrypting API key with provider...', 'info');

    let targetStatus = 'invalid';
    let targetHasKey = false;
    let targetMasked = '';
    let targetUpdatedAt = null;
    let success = false;

    try {
      const res = await fetch(getApiUrl('/api/user/api-key'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: rawKey.trim(), provider: selectedProvider })
      });

      const json = await res.json().catch(() => ({}));

      if (res.ok && json.success) {
        targetStatus = 'connected';
        targetHasKey = true;
        targetMasked = json.data?.maskedKey || '••••••••••••';
        targetUpdatedAt = new Date().toISOString();
        showFeedback('API Key connected successfully! You can now use SkillSync AI features.', 'success');
        
        const inputs = document.querySelectorAll('#byokApiKeyInput, #byokModalKeyInput');
        inputs.forEach(input => { if (input) input.value = ''; });
        
        success = true;
        closeModal();

        if (typeof pendingRetryResolver === 'function') {
          pendingRetryResolver(true);
          pendingRetryResolver = null;
        }
      } else {
        const errMsg = json.message || (res.status === 401 ? 'Authentication required. Please sign in to connect your API key.' : 'Failed to validate or save API key.');
        targetStatus = (res.status === 429 || errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('rate'))
          ? 'rate_limited'
          : 'invalid';
        showFeedback(errMsg, 'error');
      }
    } catch (err) {
      console.error('BYOK Connect error:', err);
      targetStatus = 'invalid';
      const errMsg = err.message ? `Connection error: ${err.message}` : 'Network error reaching backend server. Please try again.';
      showFeedback(errMsg, 'error');
    } finally {
      setStatus({ status: targetStatus, hasKey: targetHasKey, provider: selectedProvider, maskedKey: targetMasked, updatedAt: targetUpdatedAt });
    }
    return success;
  }


  async function removeKey() {
    if (!confirm('Are you sure you want to remove your stored API key?')) {
      return;
    }

    setStatus({ status: 'connecting' });
    let targetStatus = 'disconnected';
    let targetHasKey = false;

    try {
      const res = await fetch(getApiUrl('/api/user/api-key'), {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.ok) {
        showFeedback('API Key removed. Connect a key to continue using AI features.', 'info');
      } else {
        const json = await res.json().catch(() => ({}));
        showFeedback(json.message || 'Failed to remove API key.', 'error');
        targetStatus = 'connected';
        targetHasKey = true;
      }
    } catch (err) {
      console.error('BYOK Remove error:', err);
      showFeedback('Network error while removing key.', 'error');
      targetStatus = 'connected';
      targetHasKey = true;
    } finally {
      setStatus({ status: targetStatus, hasKey: targetHasKey, maskedKey: '' });
    }
  }

  function showFeedback(msg, type = 'info') {
    const feedbackElements = document.querySelectorAll('.byok-feedback');
    feedbackElements.forEach(fb => {
      fb.hidden = !msg;
      fb.className = `byok-feedback byok-feedback-${type}`;
      fb.innerHTML = msg;
    });
  }

  function renderCardUI() {
    const badge = document.getElementById('byokStatusBadge');
    const input = document.getElementById('byokApiKeyInput');
    const connectBtn = document.getElementById('byokConnectBtn');
    const updateBtn = document.getElementById('byokUpdateBtn');
    const removeBtn = document.getElementById('byokRemoveBtn');
    const statusNote = document.getElementById('byokStatusNote');

    if (!badge) return;

    const { status, hasKey, maskedKey, updatedAt } = statusState;

    if (status === 'connecting') {
      badge.className = 'badge badge-cyan';
      badge.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Validating...`;
    } else if (status === 'connected') {
      badge.className = 'badge badge-green';
      badge.innerHTML = `<i class="fa-solid fa-circle-check"></i> Connected (${maskedKey || 'Key Active'})`;
    } else if (status === 'invalid') {
      badge.className = 'badge badge-rose';
      badge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Invalid Key`;
    } else if (status === 'rate_limited') {
      badge.className = 'badge badge-amber';
      badge.innerHTML = `<i class="fa-solid fa-hourglass-half"></i> Rate Limited`;
    } else {
      badge.className = 'badge badge-secondary';
      badge.innerHTML = `<i class="fa-solid fa-key"></i> Key Required`;
    }

    if (connectBtn) connectBtn.style.display = hasKey ? 'none' : 'inline-flex';
    if (updateBtn) updateBtn.style.display = hasKey ? 'inline-flex' : 'none';
    if (removeBtn) removeBtn.style.display = hasKey ? 'inline-flex' : 'none';

    if (input) {
      input.placeholder = hasKey
        ? `${maskedKey || '••••••••••••'} (Encrypted & Connected)`
        : 'Paste Gemini API Key (e.g. AIzaSy...)';
      input.disabled = status === 'connecting';
    }

    if (statusNote) {
      if (hasKey) {
        const timeStr = updatedAt ? new Date(updatedAt).toLocaleDateString() : 'recently';
        statusNote.innerHTML = `<i class="fa-solid fa-lock" style="color: var(--accent-green);"></i> Key encrypted (AES-256-GCM) & saved ${timeStr}.`;
      } else {
        statusNote.innerHTML = `<i class="fa-solid fa-circle-info"></i> Obtain a free API key at <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color: var(--accent-cyan); text-decoration: underline;">Google AI Studio</a>.`;
      }
    }
  }

  function renderSettingsUI() {
    const settingsBadge = document.getElementById('settingsByokBadge');
    const settingsMasked = document.getElementById('settingsByokMaskedKey');
    const settingsProvider = document.getElementById('settingsByokProvider');
    const settingsConnectBtn = document.getElementById('settingsByokConnectBtn');
    const settingsUpdateBtn = document.getElementById('settingsByokUpdateBtn');
    const settingsRemoveBtn = document.getElementById('settingsByokRemoveBtn');

    if (!settingsBadge) return;

    const { status, hasKey, maskedKey, provider } = statusState;

    if (hasKey && status === 'connected') {
      settingsBadge.className = 'badge badge-green';
      settingsBadge.innerHTML = `<i class="fa-solid fa-circle-check"></i> Connected`;
      if (settingsMasked) settingsMasked.textContent = maskedKey || '••••••••••••';
    } else if (status === 'invalid') {
      settingsBadge.className = 'badge badge-rose';
      settingsBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Invalid Key`;
      if (settingsMasked) settingsMasked.textContent = 'Key invalid or revoked';
    } else {
      settingsBadge.className = 'badge badge-secondary';
      settingsBadge.innerHTML = `<i class="fa-solid fa-key"></i> Key Required`;
      if (settingsMasked) settingsMasked.textContent = 'No key connected';
    }

    if (settingsProvider) settingsProvider.textContent = provider === 'gemini' ? 'Google Gemini' : provider;
    if (settingsConnectBtn) settingsConnectBtn.style.display = hasKey ? 'none' : 'inline-flex';
    if (settingsUpdateBtn) settingsUpdateBtn.style.display = hasKey ? 'inline-flex' : 'none';
    if (settingsRemoveBtn) settingsRemoveBtn.style.display = hasKey ? 'inline-flex' : 'none';
  }

  function renderModalUI() {
    const modalInput = document.getElementById('byokModalKeyInput');
    const modalSelect = document.getElementById('byokModalProviderSelect');
    if (modalInput && statusState.hasKey) {
      modalInput.placeholder = `${statusState.maskedKey || '••••••••••••'} (Encrypted & Connected)`;
    }
    if (modalSelect) {
      modalSelect.value = statusState.provider || 'gemini';
    }
  }

  function createModalDOM() {
    if (document.getElementById('byokGlobalModal')) return;

    const modalHTML = `
      <div id="byokGlobalModal" class="byok-modal-backdrop" hidden>
        <div class="byok-modal-card" role="dialog" aria-labelledby="byokModalTitle">
          <button type="button" class="byok-modal-close" id="byokModalCloseBtn" aria-label="Close modal">&times;</button>
          
          <div class="byok-modal-header">
            <div class="byok-modal-icon"><i class="fa-solid fa-key"></i></div>
            <div>
              <span class="badge badge-cyan">Personal AI Configuration</span>
              <h2 id="byokModalTitle">Bring Your Own API Key</h2>
            </div>
          </div>

          <p class="byok-modal-subtitle">
            To use SkillSync's AI-powered features, please connect your own API key. Your key is stored securely encrypted and used exclusively for your requests.
          </p>

          <form id="byokModalForm">
            <div style="margin-bottom: 1rem;">
              <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-main); margin-bottom: 0.35rem;">
                Select AI Provider
              </label>
              <select id="byokModalProviderSelect" class="byok-select">
                <option value="gemini">Google Gemini (Recommended)</option>
                <option value="openai" disabled>OpenAI (Coming Soon)</option>
                <option value="anthropic" disabled>Anthropic Claude (Coming Soon)</option>
              </select>
            </div>

            <div style="margin-bottom: 1rem;">
              <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-main); margin-bottom: 0.35rem;">
                API Key
              </label>
              <div class="byok-input-group">
                <input type="password" id="byokModalKeyInput" placeholder="Paste Gemini API key (e.g. AIzaSy...)" autocomplete="off" required />
                <button type="button" class="byok-toggle-btn" id="byokModalToggleVisibility" title="Toggle visibility">
                  <i class="fa-regular fa-eye"></i>
                </button>
              </div>
            </div>

            <div class="byok-feedback" hidden></div>

            <div style="display: flex; gap: 0.75rem; margin-top: 1.25rem;">
              <button type="submit" id="byokModalSubmitBtn" class="btn btn-primary" style="flex: 1; justify-content: center;">
                <i class="fa-solid fa-plug"></i> Connect API Key
              </button>
            </div>
          </form>

          <div style="margin-top: 1rem; text-align: center; font-size: 0.78rem; color: var(--text-muted);">
            <i class="fa-solid fa-circle-info"></i> Don't have a key? Get a free API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color: var(--accent-cyan); text-decoration: underline;">Google AI Studio</a>.
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('byokGlobalModal');
    const closeBtn = document.getElementById('byokModalCloseBtn');
    const toggleBtn = document.getElementById('byokModalToggleVisibility');
    const input = document.getElementById('byokModalKeyInput');
    const form = document.getElementById('byokModalForm');
    const select = document.getElementById('byokModalProviderSelect');

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });
    }

    if (toggleBtn && input) {
      toggleBtn.addEventListener('click', () => {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        toggleBtn.innerHTML = isPassword ? '<i class="fa-regular fa-eye-slash"></i>' : '<i class="fa-regular fa-eye"></i>';
      });
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const key = input ? input.value.trim() : '';
        const provider = select ? select.value : 'gemini';
        connectKey(key, provider);
      });
    }
  }

  function openModal() {
    createModalDOM();
    const modal = document.getElementById('byokGlobalModal');
    if (modal) {
      modal.hidden = false;
      const input = document.getElementById('byokModalKeyInput');
      if (input) input.focus();
    }
    return new Promise((resolve) => {
      pendingRetryResolver = resolve;
    });
  }

  function closeModal() {
    const modal = document.getElementById('byokGlobalModal');
    if (modal) modal.hidden = true;
  }

  function init({ containerId, onStatusChange }) {
    onStatusChangeCallback = onStatusChange;

    createModalDOM();

    const toggleBtn = document.getElementById('byokToggleVisibility');
    const input = document.getElementById('byokApiKeyInput');
    const removeBtn = document.getElementById('byokRemoveBtn');
    const form = document.getElementById('byokForm');

    if (toggleBtn && input) {
      toggleBtn.addEventListener('click', () => {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        toggleBtn.innerHTML = isPassword ? '<i class="fa-regular fa-eye-slash"></i>' : '<i class="fa-regular fa-eye"></i>';
      });
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const key = input ? input.value.trim() : '';
        connectKey(key);
      });
    }

    if (removeBtn) {
      removeBtn.addEventListener('click', removeKey);
    }

    // Perform initial status check
    checkKeyStatus();
  }

  return {
    init,
    checkKeyStatus,
    connectKey,
    removeKey,
    openModal,
    closeModal,
    getStatus: () => statusState
  };
})();
