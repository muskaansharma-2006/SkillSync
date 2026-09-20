/**
 * SkillSync - Bring Your Own Key (BYOK) Component
 * Manages user Gemini API key status, encryption workflow, and UI state.
 */

window.BYOKManager = (function () {
  let statusState = {
    hasKey: false,
    status: 'disconnected', // 'connected' | 'connecting' | 'invalid' | 'rate_limited' | 'disconnected'
    updatedAt: null
  };

  let onStatusChangeCallback = null;

  const getApiUrl = (endpoint) => {
    const base = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : (window.API_BASE_URL || '');
    return `${base.replace(/\/$/, '')}${endpoint}`;
  };

  function setStatus(status, hasKey = statusState.hasKey, updatedAt = statusState.updatedAt) {
    statusState = { hasKey, status, updatedAt };
    renderUI();
    if (typeof onStatusChangeCallback === 'function') {
      onStatusChangeCallback(statusState);
    }
  }

  async function checkKeyStatus() {
    setStatus('connecting', statusState.hasKey);
    try {
      const res = await fetch(getApiUrl('/api/user/key-status'), {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        setStatus(data.status || (data.hasKey ? 'connected' : 'disconnected'), !!data.hasKey, data.updatedAt);
      } else {
        setStatus('disconnected', false);
      }
    } catch (err) {
      console.error('Failed to check API key status:', err);
      setStatus('disconnected', false);
    }
  }

  async function connectKey(rawKey) {
    if (!rawKey || !rawKey.trim()) {
      showFeedback('Please enter a valid Gemini API key.', 'error');
      return false;
    }

    setStatus('connecting');
    showFeedback('Testing & encrypting API key with Gemini service...', 'info');

    try {
      const res = await fetch(getApiUrl('/api/user/api-key'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: rawKey.trim() })
      });

      const json = await res.json().catch(() => ({}));

      if (res.ok && json.success) {
        setStatus('connected', true, new Date().toISOString());
        showFeedback('Gemini API Key connected successfully! AI Mentor is unlocked.', 'success');
        const input = document.getElementById('byokApiKeyInput');
        if (input) input.value = '';
        return true;
      } else {
        const errMsg = json.message || 'Failed to validate or save API key.';
        if (res.status === 429 || errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('rate')) {
          setStatus('rate_limited', false);
        } else {
          setStatus('invalid', false);
        }
        showFeedback(errMsg, 'error');
        return false;
      }
    } catch (err) {
      console.error('BYOK Connect error:', err);
      setStatus('invalid', false);
      showFeedback('Network error while connecting API key. Please try again.', 'error');
      return false;
    }
  }

  async function removeKey() {
    if (!confirm('Are you sure you want to remove your stored Gemini API key?')) {
      return;
    }

    setStatus('connecting');
    try {
      const res = await fetch(getApiUrl('/api/user/api-key'), {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.ok) {
        setStatus('disconnected', false, null);
        showFeedback('API Key removed.', 'info');
      } else {
        const json = await res.json().catch(() => ({}));
        showFeedback(json.message || 'Failed to remove API key.', 'error');
        setStatus('connected', true);
      }
    } catch (err) {
      console.error('BYOK Remove error:', err);
      showFeedback('Network error while removing key.', 'error');
      setStatus('connected', true);
    }
  }

  function showFeedback(msg, type = 'info') {
    const fb = document.getElementById('byokFeedback');
    if (!fb) return;
    fb.hidden = !msg;
    fb.className = `byok-feedback byok-feedback-${type}`;
    fb.innerHTML = msg;
  }

  function renderUI() {
    const badge = document.getElementById('byokStatusBadge');
    const input = document.getElementById('byokApiKeyInput');
    const connectBtn = document.getElementById('byokConnectBtn');
    const updateBtn = document.getElementById('byokUpdateBtn');
    const removeBtn = document.getElementById('byokRemoveBtn');
    const statusNote = document.getElementById('byokStatusNote');

    if (!badge) return;

    const { status, hasKey, updatedAt } = statusState;

    if (status === 'connecting') {
      badge.className = 'badge badge-cyan';
      badge.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Connecting...`;
    } else if (status === 'connected') {
      badge.className = 'badge badge-green';
      badge.innerHTML = `<i class="fa-solid fa-circle-check"></i> Key Connected`;
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
        ? '•••••••••••••••••••••••••••• (Key encrypted)'
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

  function init({ containerId, onStatusChange }) {
    onStatusChangeCallback = onStatusChange;

    const toggleBtn = document.getElementById('byokToggleVisibility');
    const input = document.getElementById('byokApiKeyInput');
    const connectBtn = document.getElementById('byokConnectBtn');
    const updateBtn = document.getElementById('byokUpdateBtn');
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

    // Perform initial check
    checkKeyStatus();
  }

  return {
    init,
    checkKeyStatus,
    connectKey,
    removeKey,
    getStatus: () => statusState
  };
})();
