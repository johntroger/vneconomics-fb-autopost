export interface UnlockCartItem {
  key: string;
  slug: string;
  title: string;
  categoryName: string;
  pointsCost: number;
  coverImage: string | null;
}

const STORAGE_KEY_CART = 'vne_unlock_cart';
export const CART_UPDATED_EVENT = 'vne:cart-updated';

export function getUnlockCart(): UnlockCartItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_CART) || '[]') as UnlockCartItem[];
  } catch {
    return [];
  }
}

export function addToUnlockCart(item: UnlockCartItem): UnlockCartItem[] {
  const current = getUnlockCart();
  if (current.some((x) => x.key === item.key)) return current;
  const next = [item, ...current];
  try {
    localStorage.setItem(STORAGE_KEY_CART, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT));
  } catch {
    // Ignore
  }
  return next;
}

export function removeFromUnlockCart(key: string): UnlockCartItem[] {
  const next = getUnlockCart().filter((x) => x.key !== key);
  try {
    localStorage.setItem(STORAGE_KEY_CART, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT));
  } catch {
    // Ignore
  }
  return next;
}

export function clearUnlockCart(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_CART);
    window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT));
  } catch {
    // Ignore
  }
}
