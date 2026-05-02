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

/**
 * “Pode entrar no app” = assistente de perfil de viagem concluído (K_PROFILE)
 * OU sessão válida com dados do usuário após login/cadastro na API (K_USER_DATA).
 * Assim quem já tem conta no servidor não é obrigado a refazer o cadastro longo só por não ter JSON local.
 */
export async function getBootState() {
  const [onboardingDone, authDone, profileRaw, userRaw] = await Promise.all([
    storageGet(K_ONBOARDING_DONE),
    storageGet(K_AUTH_DONE),
    storageGet(K_PROFILE),
    storageGet(K_USER_DATA),
  ]);
  const signedIn = authDone === '1';
  const hasTravelWizard = Boolean(profileRaw);
  const hasAccountSession = signedIn && Boolean(userRaw);
  return {
    onboardingDone: onboardingDone === '1',
    authDone: signedIn,
    hasProfile: hasTravelWizard || hasAccountSession,
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
  telefone?: string | null;
  fotoUrl?: string | null;
};

const K_NOTIFICATION_PREFS = 'viaway:notifications:prefs';

export type NotificationPrefs = {
  masterEnabled: boolean;
  tripReminders: boolean;
  checklistReminders: boolean;
  offersAndNews: boolean;
};

const defaultNotificationPrefs: NotificationPrefs = {
  masterEnabled: true,
  tripReminders: true,
  checklistReminders: true,
  offersAndNews: false,
};

export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  const raw = await storageGet(K_NOTIFICATION_PREFS);
  if (!raw) return { ...defaultNotificationPrefs };
  try {
    const p = JSON.parse(raw) as Partial<NotificationPrefs>;
    return { ...defaultNotificationPrefs, ...p };
  } catch {
    return { ...defaultNotificationPrefs };
  }
}

export async function saveNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
  return storageSet(K_NOTIFICATION_PREFS, JSON.stringify(prefs));
}

const K_INBOX = 'viaway:inbox:v1';

export type InboxNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};

function inboxSeed(): InboxNotification[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'seed-welcome',
      title: 'Bem-vindo ao ViaWay',
      body: 'Organize viagens, checklist, gastos e cotações em um só lugar. Toque em Câmbio na home para ver moedas.',
      createdAt: now,
      read: false,
    },
    {
      id: 'seed-cambio',
      title: 'Dica: câmbio e impostos',
      body: 'As taxas da tela de Câmbio são referências (ECB via Frankfurter). Para IOF e spread, consulte seu banco.',
      createdAt: now,
      read: false,
    },
  ];
}

export async function getInboxNotifications(): Promise<InboxNotification[]> {
  const raw = await storageGet(K_INBOX);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as InboxNotification[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function seedInboxIfEmpty(): Promise<InboxNotification[]> {
  let list = await getInboxNotifications();
  if (list.length === 0) {
    list = inboxSeed();
    await storageSet(K_INBOX, JSON.stringify(list));
  }
  return list;
}

export async function saveInboxNotifications(items: InboxNotification[]): Promise<void> {
  return storageSet(K_INBOX, JSON.stringify(items));
}

export async function markInboxNotificationRead(id: string): Promise<void> {
  const list = await getInboxNotifications();
  const next = list.map((n) => (n.id === id ? { ...n, read: true } : n));
  await saveInboxNotifications(next);
}

export async function markAllInboxRead(): Promise<void> {
  const list = await getInboxNotifications();
  await saveInboxNotifications(list.map((n) => ({ ...n, read: true })));
}

export async function getInboxUnreadCount(): Promise<number> {
  const list = await getInboxNotifications();
  return list.filter((n) => !n.read).length;
}

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

