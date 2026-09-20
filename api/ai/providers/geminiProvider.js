const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * Tests if the provided Gemini API key is valid by making a lightweight API call.
 * @param {string} apiKey 
 * @returns {Promise<{ success: boolean }>}
 */
export async function testKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
    const err = new Error('API key is required.');
    err.code = 'INVALID_KEY';
    throw err;
  }

  const cleanKey = apiKey.trim();
  const url = `${GEMINI_API_URL}?key=${cleanKey}`;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Ping test' }] }]
      })
    });
  } catch (netErr) {
    const err = new Error('Failed to reach Gemini API. Please check your network connection.');
    err.code = 'NETWORK_ERROR';
    throw err;
  }

  if (response.ok) {
    return { success: true };
  }

  let errorDetails = {};
  try {
    const errJson = await response.json();
    errorDetails = errJson.error || {};
  } catch (_) {}

  const status = response.status;
  const reason = errorDetails.reason || errorDetails.status || '';
  const message = errorDetails.message || '';

  if (status === 400 || status === 401 || status === 403 || reason.includes('API_KEY') || message.toLowerCase().includes('key')) {
    const err = new Error('Invalid API key. Please check your key and try again.');
    err.code = 'INVALID_KEY';
    throw err;
  }

  if (status === 429 || reason.includes('RESOURCE_EXHAUSTED') || message.toLowerCase().includes('quota') || message.toLowerCase().includes('rate')) {
    const err = new Error('API key quota or rate limit exceeded.');
    err.code = 'RATE_LIMITED';
    throw err;
  }

  const err = new Error(message || `Gemini API returned status ${status}`);
  err.code = 'PROVIDER_ERROR';
  throw err;
}

/**
 * Generates text response using Gemini API.
 * @param {Object} options
 * @param {string} options.apiKey
 * @param {string} options.prompt
 * @param {string} [options.systemInstruction]
 * @returns {Promise<string>}
 */
export async function generateResponse({ apiKey, prompt, systemInstruction }) {
  if (!apiKey) {
    const err = new Error('No API key provided.');
    err.code = 'MISSING_KEY';
    throw err;
  }

  const url = `${GEMINI_API_URL}?key=${apiKey.trim()}`;
  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }]
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
  } catch (netErr) {
    const err = new Error('Network error reaching Gemini AI service.');
    err.code = 'NETWORK_ERROR';
    throw err;
  }

  if (!response.ok) {
    let errorDetails = {};
    try {
      const errJson = await response.json();
      errorDetails = errJson.error || {};
    } catch (_) {}

    const status = response.status;
    const reason = errorDetails.reason || errorDetails.status || '';
    const message = errorDetails.message || '';

    if (status === 400 || status === 401 || status === 403 || reason.includes('API_KEY')) {
      const err = new Error('Your saved API key is invalid or revoked.');
      err.code = 'INVALID_KEY';
      throw err;
    }

    if (status === 429 || reason.includes('RESOURCE_EXHAUSTED')) {
      const err = new Error('API key quota or rate limit exceeded.');
      err.code = 'RATE_LIMITED';
      throw err;
    }

    const err = new Error(message || `Gemini API error (Status ${status})`);
    err.code = 'PROVIDER_ERROR';
    throw err;
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  const responseText = candidate?.content?.parts?.[0]?.text;

  if (!responseText) {
    throw new Error('No content returned from Gemini API.');
  }

  return responseText;
}
