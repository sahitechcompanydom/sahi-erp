import type { SupabaseClient } from "@supabase/supabase-js";

const WIKI_BUCKET = "wiki-content";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB per image
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const ALLOWED_VIDEO_TYPES = ["video/mp4"];

export type WikiMediaKind = "image" | "video";

export function validateWikiFile(file: File): { ok: true } | { ok: false; error: string } {
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
  if (!isImage && !isVideo) {
    return { ok: false, error: "Only .jpg, .png images and .mp4 videos are allowed." };
  }
  if (isImage && file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Image must be 10MB or smaller." };
  }
  if (isVideo && file.size > MAX_VIDEO_BYTES) {
    return { ok: false, error: "Video must be 50MB or smaller." };
  }
  return { ok: true };
}

/**
 * Upload a file to wiki-content bucket and return public URL.
 * onProgress(0-100) is called; Supabase does not expose upload progress so we simulate.
 */
export async function uploadWikiFile(
  supabase: SupabaseClient,
  file: File,
  options: {
    onProgress?: (percent: number) => void;
    pathPrefix?: string;
  } = {}
): Promise<string> {
  const { onProgress, pathPrefix = "" } = options;
  const ext = file.name.split(".").pop()?.toLowerCase() || (file.type.includes("video") ? "mp4" : "jpg");
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
  const path = pathPrefix ? `${pathPrefix}/${safeName}` : safeName;

  const runUpload = async () => {
    const { error } = await supabase.storage.from(WIKI_BUCKET).upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    if (error) throw error;
  };

  if (onProgress) {
    onProgress(10);
    const t1 = setTimeout(() => { onProgress(30); }, 200);
    const t2 = setTimeout(() => { onProgress(50); }, 500);
    try {
      await runUpload();
      onProgress(100);
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
    }
  } else {
    await runUpload();
  }

  const { data } = supabase.storage.from(WIKI_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
