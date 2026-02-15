import type { SupabaseClient } from "@supabase/supabase-js";

const AVATARS_BUCKET = "avatars";
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png"];

export function validateAvatarFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Only JPG, JPEG and PNG images are allowed.";
  }
  if (file.size > MAX_SIZE_BYTES) {
    return "Image must be 2MB or smaller.";
  }
  return null;
}

/**
 * Upload avatar to storage and return public URL.
 * File name: profile-<profileId>.<ext> so updates overwrite the same object.
 */
export async function uploadAvatar(
  supabase: SupabaseClient,
  file: File,
  profileId: string
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = ["jpg", "jpeg", "png"].includes(ext) ? ext : "jpg";
  const path = `profile-${profileId}.${safeExt}`;

  const { error } = await supabase.storage.from(AVATARS_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Extract storage path from a public avatar URL and remove the object.
 * Handles URLs like https://xxx.supabase.co/storage/v1/object/public/avatars/profile-xxx.jpg
 */
export function getAvatarStoragePathFromUrl(publicUrl: string): string | null {
  try {
    const u = new URL(publicUrl);
    const match = u.pathname.match(/\/storage\/v1\/object\/public\/avatars\/(.+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

/**
 * Delete an avatar object from storage by its public URL (e.g. previous avatar_url).
 * No-op if URL is not from our avatars bucket.
 */
export async function deleteAvatarByUrl(
  supabase: SupabaseClient,
  publicUrl: string | null
): Promise<void> {
  if (!publicUrl) return;
  const path = getAvatarStoragePathFromUrl(publicUrl);
  if (!path) return;
  await supabase.storage.from(AVATARS_BUCKET).remove([path]);
}
