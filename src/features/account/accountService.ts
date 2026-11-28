import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type Auth,
  type User,
} from 'firebase/auth';
import { getLanguage } from '../../core/i18n/i18nService.ts';

const isEnLang = () => getLanguage() === 'en';

export const ACCOUNT_UPDATED_EVENT = 'vne:account-updated';

const KEY_LOCAL_PROFILE = 'vne_local_user_profile_v1';
const KEY_MASTERED_SLUGS = 'vne_mastered_slugs_v1';

export type LearnerRole = 'Sinh viên' | 'Nghiên cứu sinh' | 'Giảng viên' | 'Nhà phát triển / Đầu tư';

export interface UserAccountProfile {
  uid: string;
  displayName: string;
  email: string;
  role: LearnerRole;
  targetGoal: string;
  provider: 'firebase' | 'local';
  createdAt: string;
}

const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env || {};

const firebaseConfig = {
  apiKey: viteEnv.VITE_FIREBASE_API_KEY || '',
  authDomain: viteEnv.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: viteEnv.VITE_FIREBASE_PROJECT_ID || '',
};

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

function getFirebaseAuth(): Auth | null {
  if (!isFirebaseConfigured()) return null;
  if (!cachedApp) {
    cachedApp = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  }
  if (!cachedAuth) {
    cachedAuth = getAuth(cachedApp);
  }
  return cachedAuth;
}

function notifyAccountUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ACCOUNT_UPDATED_EVENT));
  }
}

export function getSavedProfile(): UserAccountProfile | null {
  try {
    const raw = localStorage.getItem(KEY_LOCAL_PROFILE);
    return raw ? (JSON.parse(raw) as UserAccountProfile) : null;
  } catch {
    return null;
  }
}

export function saveLocalProfile(profile: Partial<UserAccountProfile>): UserAccountProfile {
  const existing = getSavedProfile();
  const next: UserAccountProfile = {
    uid: existing?.uid || `local_${Date.now()}`,
    displayName: profile.displayName?.trim() || existing?.displayName || 'Học viên VNEconomics',
    email: profile.email?.trim() || existing?.email || 'learner@vneconomics.local',
    role: profile.role || existing?.role || 'Sinh viên',
    targetGoal: profile.targetGoal?.trim() || existing?.targetGoal || 'Làm chủ Kinh tế số, Blockchain & AI',
    provider: profile.provider || existing?.provider || 'local',
    createdAt: existing?.createdAt || new Date().toISOString(),
  };
  try {
    localStorage.setItem(KEY_LOCAL_PROFILE, JSON.stringify(next));
  } catch {
    // Ignore
  }
  notifyAccountUpdated();
  return next;
}

function syncFirebaseUserToProfile(user: User): UserAccountProfile {
  const existing = getSavedProfile();
  return saveLocalProfile({
    uid: user.uid,
    displayName: user.displayName || existing?.displayName || user.email?.split('@')[0] || 'Học viên',
    email: user.email || existing?.email || '',
    provider: 'firebase',
  });
}

export function subscribeAccountAuth(cb: (profile: UserAccountProfile | null) => void): () => void {
  const auth = getFirebaseAuth();
  if (!auth) {
    cb(getSavedProfile());
    return () => {};
  }
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      cb(syncFirebaseUserToProfile(user));
    } else {
      const local = getSavedProfile();
      cb(local?.provider === 'local' ? local : null);
    }
  });
}

export async function loginWithEmail(email: string, password: string): Promise<UserAccountProfile> {
  const auth = getFirebaseAuth();
  if (!auth) {
    return saveLocalProfile({
      displayName: email.split('@')[0],
      email,
      provider: 'local',
    });
  }
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return syncFirebaseUserToProfile(cred.user);
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string,
): Promise<UserAccountProfile> {
  const auth = getFirebaseAuth();
  if (!auth) {
    return saveLocalProfile({
      displayName: displayName || email.split('@')[0],
      email,
      provider: 'local',
    });
  }
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (displayName.trim()) {
    await updateProfile(cred.user, { displayName: displayName.trim() });
  }
  return syncFirebaseUserToProfile(cred.user);
}

export async function loginWithGoogleAccount(): Promise<UserAccountProfile> {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error(
      isEnLang()
        ? 'Firebase is not configured in this environment. Use Quick Create Local Profile below.'
        : 'Firebase chưa được cấu hình trên môi trường này. Hãy dùng đăng nhập nhanh Local Profile bên dưới.',
    );
  }
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  return syncFirebaseUserToProfile(cred.user);
}

export async function getFirebaseIdToken(): Promise<string | null> {
  const auth = getFirebaseAuth();
  if (!auth?.currentUser) return null;
  try {
    return await auth.currentUser.getIdToken();
  } catch {
    return null;
  }
}

export async function signOutAccount(): Promise<void> {
  const auth = getFirebaseAuth();
  if (auth) {
    await signOut(auth).catch(() => {});
  }
  try {
    localStorage.removeItem(KEY_LOCAL_PROFILE);
  } catch {
    // Ignore
  }
  notifyAccountUpdated();
}

export function getMasteredSlugs(): string[] {
  try {
    const raw = localStorage.getItem(KEY_MASTERED_SLUGS);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function markTermMastered(slug: string): string[] {
  const list = getMasteredSlugs();
  if (!list.includes(slug)) {
    const next = [slug, ...list].slice(0, 500);
    try {
      localStorage.setItem(KEY_MASTERED_SLUGS, JSON.stringify(next));
    } catch {
      // Ignore
    }
    notifyAccountUpdated();
    return next;
  }
  return list;
}

export function exportFullLearnerBackup(): string {
  const keys = [
    KEY_LOCAL_PROFILE,
    KEY_MASTERED_SLUGS,
    'vne_points_total',
    'vne_point_events',
    'vne_daily_streak',
    'vne_unlocked_items',
    'vne_lexicon_bookmarks',
    'vne_srs_progress_v1',
    'vne_mistake_vault_v1',
    'vne_practice_history_v1',
  ];
  const dump: Record<string, unknown> = { exportedAt: new Date().toISOString(), app: 'VNEconomics' };
  for (const k of keys) {
    try {
      const val = localStorage.getItem(k);
      if (val !== null) dump[k] = JSON.parse(val);
    } catch {
      const val = localStorage.getItem(k);
      if (val !== null) dump[k] = val;
    }
  }
  return JSON.stringify(dump, null, 2);
}

export function importLearnerBackup(jsonText: string): { ok: boolean; message: string } {
  const en = isEnLang();
  try {
    const parsed = JSON.parse(jsonText) as Record<string, unknown>;
    if (parsed.app !== 'VNEconomics') {
      return {
        ok: false,
        message: en ? 'Backup file does not match VNEconomics format.' : 'Tệp sao lưu không đúng định dạng VNEconomics.',
      };
    }
    for (const [k, v] of Object.entries(parsed)) {
      if (k.startsWith('vne_')) {
        localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
      }
    }
    notifyAccountUpdated();
    return {
      ok: true,
      message: en ? 'Learning progress restored successfully!' : 'Khôi phục dữ liệu học tập thành công!',
    };
  } catch {
    return {
      ok: false,
      message: en ? 'Failed to parse backup JSON file.' : 'Lỗi đọc tệp JSON sao lưu.',
    };
  }
}
