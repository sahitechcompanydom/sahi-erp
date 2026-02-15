"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCurrentUser } from "@/contexts/current-user-context";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { WikiArticleEditor } from "@/components/wiki/wiki-article-editor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Task } from "@/types/database";
import type { Profile } from "@/types/database";
import type { WikiArticle } from "@/types/database";
import { convertTaskToWiki } from "@/lib/convert-task-to-wiki";

function WikiNewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const fromTaskId = searchParams.get("fromTask");
  const { profile } = useCurrentUser();

  const { data: task, isLoading: taskLoading } = useQuery({
    queryKey: ["task", fromTaskId, isSupabaseConfigured()],
    queryFn: async (): Promise<Task | null> => {
      if (!fromTaskId || !isSupabaseConfigured()) return null;
      const supabase = createClient();
      const { data, error } = await supabase.from("tasks").select("*").eq("id", fromTaskId).single();
      if (error || !data) return null;
      return data as Task;
    },
    enabled: !!fromTaskId,
  });

  const assigneeId = task?.assignee_id ?? null;
  const { data: assignee } = useQuery({
    queryKey: ["profile", assigneeId, isSupabaseConfigured()],
    queryFn: async (): Promise<Profile | null> => {
      if (!assigneeId || !isSupabaseConfigured()) return null;
      const supabase = createClient();
      const { data, error } = await supabase.from("profiles").select("*").eq("id", assigneeId).single();
      if (error || !data) return null;
      return data as Profile;
    },
    enabled: !!assigneeId,
  });

  const initialFromTask: Partial<WikiArticle> | undefined = task
    ? convertTaskToWiki(task, assignee ?? undefined)
    : undefined;

  useEffect(() => {
    if (profile === null) {
      router.replace("/login");
    }
  }, [profile, router]);

  if (profile === undefined || (fromTaskId && taskLoading)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8 pl-[calc(16rem+2rem)]">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!profile) {
    return null;
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
    const { data: row, error } = await supabase
      .from("wiki_articles")
      .insert({
        title: data.title,
        content: data.content,
        category: data.category,
        author_id: profile!.id,
        media_urls: data.media_urls,
      })
      .select("id")
      .single();
    if (error) throw error;
    if (fromTaskId && row?.id) {
      await supabase.from("tasks").update({ wiki_article_id: row.id }).eq("id", fromTaskId);
      queryClient.invalidateQueries({ queryKey: ["tasks-with-profiles"] });
    }
    toast.success("Article created.");
    router.push(`/wiki/${row.id}`);
  }

  return (
    <div className="p-8 pl-[calc(16rem+2rem)]">
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {fromTaskId && task ? "Convert task to Wiki" : "New article"}
            </CardTitle>
            <CardDescription>
              {fromTaskId && task
                ? "Task title and description have been pre-filled. Edit and save as a wiki article."
                : "Create a new wiki article. Markdown and code blocks supported."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WikiArticleEditor
              initial={initialFromTask}
              authorId={profile.id}
              onSubmit={handleSubmit}
              onCancel={() => router.back()}
              submitLabel="Create article"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function WikiNewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center p-8 pl-[calc(16rem+2rem)]">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <WikiNewContent />
    </Suspense>
  );
}
