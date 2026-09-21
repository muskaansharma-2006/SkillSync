const GEMINI_PRIMARY_MODEL = process.env.GEMINI_PRIMARY_MODEL || 'gemini-3.6-flash';
const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash-lite';

function getApiUrl(modelName, apiKey) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
}

/**
 * Helper to call Gemini API using GEMINI_PRIMARY_MODEL with fallback to GEMINI_FALLBACK_MODEL.
 */
async function callGeminiApi(apiKey, requestBody) {
  const cleanKey = apiKey.trim();
  const primaryUrl = getApiUrl(GEMINI_PRIMARY_MODEL, cleanKey);
  
  let response;
  try {
    response = await fetch(primaryUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
  } catch (netErr) {
    const err = new Error('Failed to reach Gemini API. Please check your network connection.');
    err.code = 'NETWORK_ERROR';
    throw err;
  }

  // If primary model returned a non-200 error, attempt fallback model
  if (!response.ok) {
    console.warn(`[GeminiProvider] Primary model ${GEMINI_PRIMARY_MODEL} returned status ${response.status}. Retrying with fallback model ${GEMINI_FALLBACK_MODEL}...`);
    try {
      const fallbackUrl = getApiUrl(GEMINI_FALLBACK_MODEL, cleanKey);
      const fallbackResponse = await fetch(fallbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      if (fallbackResponse.ok) {
        return fallbackResponse;
      }
    } catch (_) {
      // Fallback network call failed, proceed with original response for error extraction
    }
  }

  return response;
}

/**
 * Tests if the provided Gemini API key is valid by making a lightweight API call.
 * @param {string} [apiKey] 
 * @returns {Promise<{ success: boolean }>}
 */
export async function testKey(apiKey) {
  const keyToUse = (apiKey && typeof apiKey === 'string' && apiKey.trim()) ? apiKey.trim() : process.env.GEMINI_API_KEY;

  if (!keyToUse) {
    console.warn('[GeminiProvider] WARNING: No API key provided for testKey and process.env.GEMINI_API_KEY is missing!');
    const err = new Error('API key is required.');
    err.code = 'INVALID_KEY';
    throw err;
  }

  const response = await callGeminiApi(keyToUse, {
    contents: [{ parts: [{ text: 'Ping test' }] }]
  });

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
 * @param {string} [options.apiKey]
 * @param {string} options.prompt
 * @param {string} [options.systemInstruction]
 * @returns {Promise<string>}
 */
export async function generateResponse({ apiKey, prompt, systemInstruction }) {
  const keyToUse = (apiKey && typeof apiKey === 'string' && apiKey.trim()) ? apiKey.trim() : process.env.GEMINI_API_KEY;

  if (!keyToUse) {
    console.warn('[GeminiProvider] WARNING: No API key provided and process.env.GEMINI_API_KEY is not set on the server!');
    const err = new Error('No Gemini API key is configured. Please set GEMINI_API_KEY on the server or provide a custom key.');
    err.code = 'MISSING_KEY';
    throw err;
  }

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }]
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  const response = await callGeminiApi(keyToUse, requestBody);

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
