import AsyncStorage from '@react-native-async-storage/async-storage';

const K_ONBOARDING_DONE = 'viaway:onboarding:done';
const K_AUTH_DONE = 'viaway:auth:done';
const K_PROFILE = 'viaway:profile';
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

export type ViawayProfile = {
  nome: string;
  email: string;
  viagensAno: '1-2' | '3-5' | '6+';
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

export function saveProfile(profile: ViawayProfile) {
  return storageSet(K_PROFILE, JSON.stringify(profile));
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

