// config.js - Centralized API Configuration for SkillSync
const API_BASE_URL = (
  (typeof window !== 'undefined' && window.ENV_API_BASE_URL) ||
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://127.0.0.1:3000'
    : 'https://skillsync-web.onrender.com')
).replace(/\/$/, '');

if (typeof window !== 'undefined') {
  window.API_BASE_URL = API_BASE_URL;
}
