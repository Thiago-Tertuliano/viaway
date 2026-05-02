import AsyncStorage from '@react-native-async-storage/async-storage';

const K_ONBOARDING_DONE = 'viaway:onboarding:done';
const K_AUTH_DONE = 'viaway:auth:done';
const K_PROFILE = 'viaway:profile';
const K_ACCESS_TOKEN = 'viaway:access_token';
const K_REFRESH_TOKEN = 'viaway:refresh_token';
const K_USER_DATA = 'viaway:user_data';
const K_LOCAL_PASSWORD = 'viaway:local_password';
const memoryStore = new Map<string, string>();

let warnedStorageFallback = false;

async function storageGet(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    if (!warnedStorageFallback) {
      warnedStorageFallback = true;
      console.warn(
        '[ViaWay] AsyncStorage indisponível no runtime atual. Usando fallback em memória.',
      );
    }
    return memoryStore.get(key) ?? null;
  }
}

async function storageSet(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
    return;
  } catch {
    if (!warnedStorageFallback) {
      warnedStorageFallback = true;
      console.warn(
        '[ViaWay] AsyncStorage indisponível no runtime atual. Usando fallback em memória.',
      );
    }
    memoryStore.set(key, value);
  }
}

async function storageRemove(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    memoryStore.delete(key);
  }
}

export type ViawayProfile = {
  nome: string;
  email: string;
  telefone: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  pais: string;
  viagensAno: '1-2' | '3-5' | '6+';
  duracaoMedia: 'fim-de-semana' | '3-7-dias' | '8+-dias';
  orcamentoFaixa: 'economico' | 'moderado' | 'alto';
  estilo: 'economico' | 'conforto' | 'premium';
  acompanhantes: 'solo' | 'casal' | 'familia' | 'grupo';
  objetivo: 'descanso' | 'aventura' | 'gastronomia' | 'misto';
};

export async function getBootState() {
  const [onboardingDone, authDone, profileRaw] = await Promise.all([
    storageGet(K_ONBOARDING_DONE),
    storageGet(K_AUTH_DONE),
    storageGet(K_PROFILE),
  ]);
  return {
    onboardingDone: onboardingDone === '1',
    authDone: authDone === '1',
    hasProfile: Boolean(profileRaw),
  };
}

export function setOnboardingDone() {
  return storageSet(K_ONBOARDING_DONE, '1');
}

export function setAuthDone() {
  return storageSet(K_AUTH_DONE, '1');
}

// --- Token Management ---

export async function getAccessToken(): Promise<string | null> {
  return storageGet(K_ACCESS_TOKEN);
}

export async function getRefreshToken(): Promise<string | null> {
  return storageGet(K_REFRESH_TOKEN);
}

export async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  await Promise.all([
    storageSet(K_ACCESS_TOKEN, accessToken),
    storageSet(K_REFRESH_TOKEN, refreshToken),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    storageRemove(K_ACCESS_TOKEN),
    storageRemove(K_REFRESH_TOKEN),
    storageRemove(K_USER_DATA),
  ]);
}

/** Encerra sessão da API e o flag local de autenticação (mantém onboarding e perfil de viagem). */
export async function logoutSession(): Promise<void> {
  await clearTokens();
  await storageRemove(K_AUTH_DONE);
}

export type UserData = {
  id: string;
  nome: string;
  email: string;
  plano: string;
  fotoUrl?: string | null;
};

export async function getUserData(): Promise<UserData | null> {
  const raw = await storageGet(K_USER_DATA);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserData;
  } catch {
    return null;
  }
}

export async function saveUserData(user: UserData): Promise<void> {
  return storageSet(K_USER_DATA, JSON.stringify(user));
}

export function saveProfile(profile: ViawayProfile) {
  return storageSet(K_PROFILE, JSON.stringify(profile));
}

export function saveLocalPassword(password: string) {
  return storageSet(K_LOCAL_PASSWORD, password);
}

export async function getLocalPassword(): Promise<string | null> {
  return storageGet(K_LOCAL_PASSWORD);
}

export async function getProfile(): Promise<ViawayProfile | null> {
  const raw = await storageGet(K_PROFILE);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ViawayProfile;
  } catch {
    return null;
  }
}

