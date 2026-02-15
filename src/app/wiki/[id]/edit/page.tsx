"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { WikiArticle } from "@/types/database";
import { WikiArticleEditor } from "@/components/wiki/wiki-article-editor";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Loader2 } from "lucide-react";
import { useCurrentUser } from "@/contexts/current-user-context";
import { toast } from "sonner";
import { useEffect } from "react";

export default function WikiEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { profile } = useCurrentUser();

  const { data: article, isLoading, error } = useQuery({
    queryKey: ["wiki_article", id, isSupabaseConfigured()],
    queryFn: async (): Promise<WikiArticle | null> => {
      if (!id || !isSupabaseConfigured()) return null;
      const supabase = createClient();
      const { data, error: e } = await supabase
        .from("wiki_articles")
        .select("*")
        .eq("id", id)
        .single();
      if (e || !data) return null;
      return data as WikiArticle;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (profile === null) router.replace("/login");
  }, [profile, router]);

  if (profile === undefined || isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8 pl-[calc(16rem+2rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile || error || !article) {
    return (
      <div className="p-8 pl-[calc(16rem+2rem)]">
        <div className="mx-auto max-w-3xl rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
          Article not found or you are not signed in.
        </div>
        <Link href="/wiki" className="mt-4 block text-center">
          <Button variant="outline">Back to Wiki</Button>
        </Link>
      </div>
    );
  }

  async function handleSubmit(data: {
    title: string;
    content: string;
    category: "Network" | "Server" | "Software" | "Electrical";
    media_urls: string[];
  }) {
    if (!isSupabaseConfigured()) {
      toast.error("Supabase not configured.");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase
      .from("wiki_articles")
      .update({
        title: data.title,
        content: data.content,
        category: data.category,
        media_urls: data.media_urls,
      })
      .eq("id", id);
    if (error) throw error;
    toast.success("Article updated.");
    router.push(`/wiki/${id}`);
  }

  return (
    <div className="p-8 pl-[calc(16rem+2rem)]">
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardHeader>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Edit article
            </h1>
          </CardHeader>
          <CardContent>
            <WikiArticleEditor
              initial={article}
              authorId={article.author_id}
              onSubmit={handleSubmit}
              onCancel={() => router.back()}
              submitLabel="Save changes"
            />
          </CardContent>
        </Card>
        <div className="mt-4">
          <Link href={`/wiki/${id}`}>
            <Button variant="ghost">← Back to article</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
