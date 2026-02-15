"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { WikiArticle } from "@/types/database";
import type { Profile } from "@/types/database";
import { WikiArticleContent } from "@/components/wiki/wiki-article-content";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { BookOpen, Loader2, Pencil, Trash2 } from "lucide-react";
import { useCurrentUser } from "@/contexts/current-user-context";
import { toast } from "sonner";
import { useState } from "react";

function getInitials(name: string | null, email: string | null) {
  if (name?.trim()) return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  if (email) return email[0].toUpperCase();
  return "?";
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function WikiArticlePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { profile: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);

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

  const { data: author } = useQuery({
    queryKey: ["profile", article?.author_id],
    queryFn: async (): Promise<Profile | null> => {
      if (!article?.author_id || !isSupabaseConfigured()) return null;
      const supabase = createClient();
      const { data, error: e } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", article.author_id)
        .single();
      if (e || !data) return null;
      return data as Profile;
    },
    enabled: !!article?.author_id,
  });

  const isAdmin = currentUser?.role === "admin";

  async function handleDelete() {
    if (!id || !isSupabaseConfigured()) return;
    const supabase = createClient();
    const { error } = await supabase.from("wiki_articles").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Article deleted.");
    queryClient.invalidateQueries({ queryKey: ["wiki_articles"] });
    setDeleteOpen(false);
    router.push("/wiki");
  }

  if (isLoading || !id) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8 pl-[calc(16rem+2rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="p-8 pl-[calc(16rem+2rem)]">
        <div className="mx-auto max-w-3xl rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
          Article not found.
        </div>
        <div className="mt-4 text-center">
          <Link href="/wiki">
            <Button variant="outline">Back to Wiki</Button>
          </Link>
        </div>
      </div>
    );
  }

  const mediaUrls = Array.isArray(article.media_urls) ? article.media_urls : [];

  return (
    <div className="p-8 pl-[calc(16rem+2rem)]">
      <div className="mx-auto max-w-3xl space-y-6">
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  {article.title}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Category: {article.category}
                </p>
              </div>
              <div className="flex gap-2">
                <Link href={`/wiki/${article.id}/edit`}>
                  <Button variant="outline" size="sm">
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </Link>
                {isAdmin && (
                  <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete article?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarImage src={author?.avatar_url ?? undefined} alt={author?.full_name ?? ""} />
                <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                  {getInitials(author?.full_name ?? null, author?.email ?? null)}
                </AvatarFallback>
              </Avatar>
              <span>{author?.full_name ?? author?.email ?? "Unknown"}</span>
              <span>·</span>
              <span>Last updated {formatDate(article.updated_at)}</span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <WikiArticleContent content={article.content} mediaUrls={mediaUrls} />
          </CardContent>
        </Card>
        <div className="flex justify-start">
          <Link href="/wiki">
            <Button variant="ghost">← Back to Wiki</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
