"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { WikiArticle } from "@/types/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Loader2, PlusCircle, Search, LayoutGrid, LayoutList } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES: Array<WikiArticle["category"]> = ["Network", "Server", "Software", "Electrical"];

export function WikiView() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<WikiArticle["category"] | "">("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const queryClient = useQueryClient();

  const { data: articles = [], isLoading, error } = useQuery({
    queryKey: ["wiki_articles", isSupabaseConfigured()],
    queryFn: async (): Promise<WikiArticle[]> => {
      if (!isSupabaseConfigured()) return [];
      const supabase = createClient();
      const { data, error: e } = await supabase
        .from("wiki_articles")
        .select("*")
        .order("updated_at", { ascending: false });
      if (e) throw e;
      return (data ?? []) as WikiArticle[];
    },
  });

  const filtered = useMemo(() => {
    let list = articles;
    if (category) list = list.filter((a) => a.category === category);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q)
      );
    }
    return list;
  }, [articles, category, search]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["wiki_articles"] });

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8 pl-[calc(16rem+2rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 pl-[calc(16rem+2rem)]">
        <div className="mx-auto max-w-6xl rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
          Failed to load wiki. Ensure Supabase is configured and the wiki_articles table exists.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 pl-[calc(16rem+2rem)]">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
              <BookOpen className="h-7 w-7 text-primary" />
              Wiki
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Technical knowledge base. Search and filter by category.
            </p>
          </div>
          <Link href="/wiki/new">
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              New article
            </Button>
          </Link>
        </header>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search articles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Category:</span>
            {CATEGORIES.map((cat) => (
              <Badge
                key={cat}
                variant={category === cat ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setCategory((c) => (c === cat ? "" : cat))}
              >
                {cat}
              </Badge>
            ))}
            <div className="ml-2 flex gap-1">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {articles.length === 0
                  ? "No articles yet. Create the first one."
                  : "No articles match your search."}
              </p>
              {articles.length === 0 && (
                <Link href="/wiki/new" className="mt-4">
                  <Button>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    New article
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : viewMode === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((article) => (
              <Link key={article.id} href={`/wiki/${article.id}`}>
                <Card className="h-full transition-colors hover:bg-muted/50 cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="line-clamp-2 text-base">{article.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {article.category}
                      </Badge>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {article.content.slice(0, 120)}
                      {article.content.length > 120 ? "…" : ""}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {filtered.map((article) => (
                  <li key={article.id}>
                    <Link
                      href={`/wiki/${article.id}`}
                      className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-muted/30"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">{article.title}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {article.content.slice(0, 80)}
                          {article.content.length > 80 ? "…" : ""}
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 min-w-[5.5rem] justify-center">
                        {article.category}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
