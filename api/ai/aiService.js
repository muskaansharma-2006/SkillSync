import * as geminiProvider from './providers/geminiProvider.js';
import { encryptApiKey, decryptApiKey } from '../utils/encryption.js';

const PROVIDERS = {
  gemini: geminiProvider
};

function getProvider(providerName = 'gemini') {
  const provider = PROVIDERS[providerName];
  if (!provider) {
    throw new Error(`Unsupported AI provider: ${providerName}`);
  }
  return provider;
}

/**
 * Validates, encrypts, and stores a user's API key.
 */
export async function saveUserKey(supabaseAdmin, userId, rawKey, providerName = 'gemini') {
  const provider = getProvider(providerName);

  // 1. Test key with provider first
  await provider.testKey(rawKey);

  // 2. Encrypt key
  const encryptedKey = encryptApiKey(rawKey.trim());

  // 3. Upsert into Supabase user_api_keys
  const { error } = await supabaseAdmin
    .from('user_api_keys')
    .upsert({
      user_id: userId,
      encrypted_key: encryptedKey,
      key_status: 'connected',
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

  if (error) {
    console.error('Database error saving user API key:', error);
    throw new Error('Failed to save API key to database.');
  }

  return { success: true, status: 'connected' };
}

/**
 * Retrieves non-sensitive key status for a user.
 */
export async function getUserKeyStatus(supabaseAdmin, userId) {
  const { data, error } = await supabaseAdmin
    .from('user_api_keys')
    .select('key_status, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return { hasKey: false, status: 'disconnected' };
  }

  return {
    hasKey: true,
    status: data.key_status || 'connected',
    updatedAt: data.updated_at
  };
}

/**
 * Deletes user's API key.
 */
export async function deleteUserKey(supabaseAdmin, userId) {
  const { error } = await supabaseAdmin
    .from('user_api_keys')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Database error deleting user API key:', error);
    throw new Error('Failed to remove API key from database.');
  }

  return { success: true };
}

/**
 * Internal helper to retrieve & decrypt user's API key.
 */
export async function getUserDecryptedKey(supabaseAdmin, userId) {
  const { data, error } = await supabaseAdmin
    .from('user_api_keys')
    .select('encrypted_key, key_status')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data || !data.encrypted_key) {
    const err = new Error('No API key connected. Please connect your Gemini API key to use AI Mentor.');
    err.code = 'NO_KEY_CONNECTED';
    throw err;
  }

  try {
    return decryptApiKey(data.encrypted_key);
  } catch (decErr) {
    console.error('Key decryption error:', decErr);
    const err = new Error('Failed to decrypt saved API key. Please reconnect your key.');
    err.code = 'DECRYPTION_FAILED';
    throw err;
  }
}

/**
 * Updates status of a stored key (e.g., set to invalid or rate_limited).
 */
export async function updateUserKeyStatus(supabaseAdmin, userId, status) {
  try {
    await supabaseAdmin
      .from('user_api_keys')
      .update({ key_status: status, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
  } catch (err) {
    console.error('Failed to update key status:', err);
  }
}

/**
 * Generates AI Mentor advice/responses using the user's stored API key.
 */
export async function generateAIMentorResponse({ supabaseAdmin, userId, prompt, context, providerName = 'gemini' }) {
  const apiKey = await getUserDecryptedKey(supabaseAdmin, userId);
  const provider = getProvider(providerName);

  const systemInstruction = `You are SkillSync AI Mentor, an expert tech career and skill development coach. 
Provide concise, constructive, actionable guidance tailored to software engineering skills, assessments, and technical growth.
User Context: ${context ? JSON.stringify(context) : 'General candidate'}`;

  try {
    const reply = await provider.generateResponse({
      apiKey,
      prompt,
      systemInstruction
    });
    return reply;
  } catch (err) {
    if (err.code === 'INVALID_KEY') {
      await updateUserKeyStatus(supabaseAdmin, userId, 'invalid');
    } else if (err.code === 'RATE_LIMITED') {
      await updateUserKeyStatus(supabaseAdmin, userId, 'rate_limited');
    }
    throw err;
  }
}
