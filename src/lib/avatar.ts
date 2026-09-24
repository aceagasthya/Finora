/**
 * Avatar generation and resolution utility for Finora users.
 * Ensures every user gets a unique, distinctive, high-quality avatar.
 */

export function generateUniqueAvatarUrl(seed: string): string {
  const cleanSeed = encodeURIComponent(seed.trim().toLowerCase());
  // DiceBear Avataaars generates unique illustrated avatars deterministically based on seed
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf,fed7aa,fbcfe8,c7d2fe`;
}

export function getUserAvatarUrl(user?: {
  id?: string | null;
  email?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
} | null): string {
  if (!user) {
    return 'https://api.dicebear.com/7.x/avataaars/svg?seed=guest&backgroundColor=c0aede';
  }

  // 1. If user explicitly has an avatarUrl saved, use it
  if (user.avatarUrl && user.avatarUrl.trim().length > 0) {
    return user.avatarUrl;
  }

  // 2. Demo account for Agasthya preserves his custom avatar photo
  const email = (user.email || '').toLowerCase().trim();
  const name = (user.name || '').toLowerCase().trim();
  if (email === 'ace.agasthya@gmail.com' || name === 'agasthya') {
    return '/agasthya-avatar.jpg';
  }

  // 3. For any other user, generate a unique deterministic avatar keyed by email, name, or id
  const seed = email || name || user.id || 'finora-user';
  return generateUniqueAvatarUrl(seed);
}
