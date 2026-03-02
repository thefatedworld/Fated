/**
 * Auth token management using expo-secure-store.
 * Tokens are never stored in AsyncStorage (insecure).
 */

import * as SecureStore from 'expo-secure-store';
import { api, setTokenGetter, AuthTokens } from './api-client';

const ACCESS_TOKEN_KEY = 'fated_access_token';
const REFRESH_TOKEN_KEY = 'fated_refresh_token';
const DEVICE_ID_KEY = 'fated_device_id';

export async function getDeviceId(): Promise<string> {
  let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

export async function saveTokens(tokens: AuthTokens): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

/**
 * Attempt to get a valid access token; refresh if expired.
 * Returns null if completely unauthenticated.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  // Decode payload to check expiry (no library needed — just base64)
  try {
    const [, payloadB64] = accessToken.split('.');
    const payload = JSON.parse(atob(payloadB64));
    const expiresAt = payload.exp * 1000; // ms
    // If token expires in more than 60 seconds, use it
    if (Date.now() < expiresAt - 60_000) return accessToken;
  } catch {
    // Malformed token — fall through to refresh
  }

  // Token expired or malformed — try refresh
  const refreshToken = await getRefreshToken();
  if (!refreshToken) { await clearTokens(); return null; }

  try {
    const deviceId = await getDeviceId();
    const newTokens = await api.refresh(refreshToken, deviceId);
    await saveTokens(newTokens);
    return newTokens.accessToken;
  } catch {
    await clearTokens();
    return null;
  }
}

/**
 * Call once on app startup to wire the API client's token getter.
 */
export function initAuthClient() {
  setTokenGetter(getValidAccessToken);
}
