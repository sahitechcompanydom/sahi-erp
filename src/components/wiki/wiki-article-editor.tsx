"use client";

import { useState, useRef } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { validateWikiFile, uploadWikiFile } from "@/lib/wiki-upload";
import type { WikiArticle, WikiCategory } from "@/types/database";
import { ImagePlus, Video, Loader2 } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES: WikiCategory[] = ["Network", "Server", "Software", "Electrical"];

type WikiArticleEditorProps = {
  initial?: Partial<WikiArticle> | null;
  authorId: string;
  onSubmit: (data: { title: string; content: string; category: WikiCategory; media_urls: string[] }) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
};

export function WikiArticleEditor({
  initial,
  authorId,
  onSubmit,
  onCancel,
  submitLabel = "Save",
}: WikiArticleEditorProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [category, setCategory] = useState<WikiCategory>(initial?.category ?? "Software");
  const [mediaUrls, setMediaUrls] = useState<string[]>(Array.isArray(initial?.media_urls) ? initial.media_urls : []);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(type: "image" | "video") {
    const input = type === "image" ? imageInputRef.current : videoInputRef.current;
    const file = input?.files?.[0];
    if (!file) return;
    const validated = validateWikiFile(file);
    if (!validated.ok) {
      toast.error(validated.error);
      input.value = "";
      return;
    }
    if (!isSupabaseConfigured()) {
      toast.error("Supabase not configured.");
      return;
    }
    setUploadProgress(0);
    try {
      const supabase = createClient();
      const url = await uploadWikiFile(supabase, file, {
        onProgress: setUploadProgress,
        pathPrefix: "wiki",
      });
      setMediaUrls((prev) => [...prev, url]);
      if (type === "image") {
        const markdown = `\n\n![${file.name}](${url})\n\n`;
        setContent((prev) => prev + markdown);
      }
      toast.success(type === "image" ? "Image added." : "Video added.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploadProgress(null);
      input.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) {
      toast.error("Title is required.");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ title: t, content: content.trim(), category, media_urls: mediaUrls });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="wiki-title">Title</Label>
        <Input
          id="wiki-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Article title"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="wiki-category">Category</Label>
        <Select value={category} onValueChange={(v) => setCategory(v as WikiCategory)}>
          <SelectTrigger id="wiki-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="wiki-content">Content (Markdown supported, code blocks allowed)</Label>
        <Textarea
          id="wiki-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your article in Markdown. Use ``` for code blocks."
          rows={16}
          className="font-mono text-sm resize-y min-h-[240px]"
        />
      </div>
      <div className="space-y-2">
        <Label>Media</Label>
        <div className="flex flex-wrap gap-2">
          <input
            ref={imageInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            className="hidden"
            onChange={() => handleFile("image")}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept=".mp4,video/mp4"
            className="hidden"
            onChange={() => handleFile("video")}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => imageInputRef.current?.click()}
            disabled={uploadProgress !== null}
          >
            <ImagePlus className="h-4 w-4 mr-2" />
            Image (.jpg, .png)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => videoInputRef.current?.click()}
            disabled={uploadProgress !== null}
          >
            <Video className="h-4 w-4 mr-2" />
            Video (.mp4, max 50MB)
          </Button>
        </div>
        {uploadProgress !== null && (
          <div className="mt-2 space-y-1">
            <Progress value={uploadProgress} />
            <p className="text-xs text-muted-foreground">Uploading… {uploadProgress}%</p>
          </div>
        )}
        {mediaUrls.length > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            {mediaUrls.length} file(s) attached. Images are also inserted into content.
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
