import Constants from 'expo-constants';

function fromEnv() {
  return process.env.EXPO_PUBLIC_API_URL;
}

/**
 * Base URL da API (já com /v1). Ex.: http://localhost:3001/v1
 * Android emulator: muitas vezes http://10.0.2.2:3001/v1
 */
export function getApiBaseUrl(): string {
  const c =
    (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
    fromEnv() ??
    'http://localhost:3001/v1';
  return c.replace(/\/$/, '');
}
