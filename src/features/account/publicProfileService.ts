import { getPostBySlug } from '../../core/data/catalogService.ts';
import { getLanguage } from '../../core/i18n/i18nService.ts';
import { getFirebaseIdToken, getSavedProfile, saveLocalProfile } from './accountService.ts';

export const PUBLIC_PROFILE_UPDATED_EVENT = 'vne:public-profile-updated';
const PROFILE_STORAGE_KEY = 'vne_public_profiles_v1';

export interface UserPublicProfileConfig {
  original_handle: string;
  custom_handle: string;
  display_name: string;
  bio: string;
  location: string;
  specialty_tag: string;
  avatar_url?: string;
  has_edited_once: boolean;
  edited_at?: string;
}

export const RESERVED_VNE_ROUTES = [
  'kinh-te-so',
  'blockchain-tai-san-so',
  'ai-cong-nghe',
  'digital-marketing',
  'nghien-cuu-khoa-hoc',
  'thu-vien-sach',
  'tu-sach-cua-toi',
  'product',
  'hoc-vien',
  'course',
  'tu-dien',
  'ai-skills',
  'tin-quoc-te',
  'thi-truong',
  'gia-vang',
  'gia-crypto',
  'ty-gia-ngoai-te',
  'lai-suat-ngan-hang',
  'lai-suat-vay-ngan-hang',
  'gia-chung-khoan',
  'learn-and-earn',
  'mo-phong',
  'luyen-tap',
  'tai-khoan',
  'cardano-hub',
  'verify',
  'ai-lab',
  'admin',
  'u',
  'api',
  've-chung-toi',
  'contact',
  'hop-tac-dang-bai',
  'bao-gia-quang-cao',
  'terms-of-use',
  'privacy-and-cookie-policy',
  'shop',
  'blog',
];

/**
 * Rút gọn & chuẩn hóa username từ email để ẩn email bảo mật (kế thừa từ yeutrongcay).
 * VD: tranthanhtung37@gmail.com -> tranthanhtung37
 */
export function getUsernameFromEmail(email?: string | null): string {
  if (!email || !email.includes('@')) return '';
  return email.split('@')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '');
}

export function normalizeHandle(raw?: string | null): string {
  return (raw || '')
    .replace(/^@/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');
}

export function getAllPublicProfiles(): Record<string, UserPublicProfileConfig> {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, UserPublicProfileConfig>) : {};
  } catch {
    return {};
  }
}

export function hasPublicProfile(handleOrUsername: string): boolean {
  const clean = normalizeHandle(handleOrUsername);
  if (!clean) return false;
  const map = getAllPublicProfiles();
  if (map[clean]) return true;
  return Object.values(map).some(
    (cfg) => cfg.original_handle.toLowerCase() === clean || cfg.custom_handle.toLowerCase() === clean,
  );
}

export function getCurrentUserOriginalHandle(): string {
  const profile = getSavedProfile();
  if (!profile) return '';
  const fromEmail = getUsernameFromEmail(profile.email);
  if (fromEmail && fromEmail.length >= 3) return fromEmail;
  const fromName = normalizeHandle(profile.displayName);
  return fromName.length >= 3 ? fromName : normalizeHandle(profile.uid);
}

export function getCurrentUserPublicHandle(): string {
  const raw = getCurrentUserOriginalHandle();
  if (!raw) return '';
  const cfg = getPublicProfile(raw);
  return cfg.custom_handle || raw;
}

export function getPublicProfileUrl(handle: string): string {
  const clean = normalizeHandle(handle);
  if (!clean) return '';
  return `https://vneconomics.com/${clean}`;
}

export function getPublicProfile(handleOrUsername: string): UserPublicProfileConfig {
  const clean = normalizeHandle(handleOrUsername);
  const map = getAllPublicProfiles();

  const found =
    map[clean] ||
    Object.values(map).find(
      (cfg) => cfg.original_handle.toLowerCase() === clean || cfg.custom_handle.toLowerCase() === clean,
    );
  if (found) return found;

  const isEn = getLanguage() === 'en';
  const saved = getSavedProfile();
  const isMe = saved && (getCurrentUserOriginalHandle() === clean || normalizeHandle(saved.uid) === clean);

  return {
    original_handle: clean || 'vne-member',
    custom_handle: clean || 'vne-member',
    display_name: isMe && saved?.displayName ? saved.displayName : clean || 'VNEconomics Member',
    bio: isEn
      ? 'Welcome to my public VNEconomics knowledge profile! Explore my 1-of-1 Exclusive Book NFT collection and digital economy reading journey.'
      : 'Chào mừng bạn đến với hồ sơ tri thức công khai trên VNEconomics! Khám phá bộ sưu tập NFT Sách Độc bản 1/1 và hành trình đọc sách Kinh tế số của tôi.',
    location: isEn ? 'Vietnam' : 'Việt Nam',
    specialty_tag: isEn ? 'Verified VNEconomics Reader' : 'Độc giả & Nhà Sưu tầm Tri thức VNE',
    has_edited_once: false,
  };
}

export async function syncPublicProfilesFromCloud(): Promise<void> {
  try {
    const res = await fetch('/api/profiles.php', { headers: { Accept: 'application/json' } });
    if (!res.ok) return;
    const data = await res.json();
    if (data?.profiles && typeof data.profiles === 'object') {
      const map = getAllPublicProfiles();
      Object.entries(data.profiles).forEach(([k, val]) => {
        if (val && typeof val === 'object') {
          map[k.toLowerCase()] = val as UserPublicProfileConfig;
        }
      });
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(map));
      window.dispatchEvent(new CustomEvent(PUBLIC_PROFILE_UPDATED_EVENT));
    }
  } catch {
    // Fallback to localStorage offline
  }
}

/**
 * Lưu chỉnh sửa URL & Hồ sơ cá nhân (Mỗi tài khoản chỉ được sửa duy nhất 1 lần - kế thừa yeutrongcay).
 */
export function saveOneTimeProfileEdit(
  handleOrUsername: string,
  updates: {
    custom_handle: string;
    display_name: string;
    bio: string;
    location: string;
    specialty_tag: string;
    avatar_url?: string;
  },
): {
  success: boolean;
  error?: string;
  profile?: UserPublicProfileConfig;
} {
  const isEn = getLanguage() === 'en';
  const current = getPublicProfile(handleOrUsername);

  if (current.has_edited_once) {
    return {
      success: false,
      error: isEn
        ? 'You have already used your 1/1 one-time profile & URL edit. Your identity handle is now permanently locked.'
        : 'Bạn đã sử dụng 1/1 lượt chỉnh sửa hồ sơ & URL duy nhất! Thông tin định danh hiện đã được khóa vĩnh viễn.',
    };
  }

  const cleanCustomHandle = normalizeHandle(updates.custom_handle);
  if (cleanCustomHandle.length < 3 || cleanCustomHandle.length > 32) {
    return {
      success: false,
      error: isEn
        ? 'Handle (@username) must be 3 to 32 characters (lowercase letters, numbers, hyphens, or underscores).'
        : 'Mã định danh URL phải từ 3 đến 32 ký tự (chữ thường, số, gạch ngang hoặc gạch dưới).',
    };
  }

  if (RESERVED_VNE_ROUTES.includes(cleanCustomHandle) || Boolean(getPostBySlug(cleanCustomHandle))) {
    return {
      success: false,
      error: isEn
        ? 'This URL handle conflicts with an existing system route or article. Please choose another handle.'
        : 'Đường dẫn này trùng với route hệ thống hoặc bài viết có sẵn. Vui lòng chọn tên khác!',
    };
  }

  const map = getAllPublicProfiles();
  const conflict = Object.values(map).find(
    (cfg) =>
      cfg.original_handle !== current.original_handle &&
      (cfg.custom_handle.toLowerCase() === cleanCustomHandle ||
        cfg.original_handle.toLowerCase() === cleanCustomHandle),
  );
  if (conflict) {
    return {
      success: false,
      error: isEn
        ? `Handle @${cleanCustomHandle} is already claimed by another member.`
        : `Đường dẫn @${cleanCustomHandle} đã thuộc về thành viên khác!`,
    };
  }

  const cleanDisplayName = updates.display_name.trim();
  if (cleanDisplayName.length < 2) {
    return {
      success: false,
      error: isEn ? 'Display name must be at least 2 characters.' : 'Tên hiển thị phải có ít nhất 2 ký tự.',
    };
  }

  const updatedProfile: UserPublicProfileConfig = {
    original_handle: current.original_handle,
    custom_handle: cleanCustomHandle,
    display_name: cleanDisplayName,
    bio: updates.bio.trim() || current.bio,
    location: updates.location.trim() || (isEn ? 'Vietnam' : 'Việt Nam'),
    specialty_tag: updates.specialty_tag.trim() || current.specialty_tag,
    avatar_url: updates.avatar_url?.trim() || current.avatar_url,
    has_edited_once: true,
    edited_at: new Date().toISOString().slice(0, 10),
  };

  map[current.original_handle.toLowerCase()] = updatedProfile;
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(map));
    if (getSavedProfile()) {
      saveLocalProfile({ displayName: cleanDisplayName });
    }
    window.dispatchEvent(new CustomEvent(PUBLIC_PROFILE_UPDATED_EVENT));
  } catch {
    // Ignore storage quota errors
  }

  // Non-blocking authenticated sync to Plesk PHP API
  void getFirebaseIdToken().then((token) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch('/api/profiles.php', {
      method: 'POST',
      headers,
      body: JSON.stringify(updatedProfile),
    });
  }).catch(() => {});

  return { success: true, profile: updatedProfile };
}
