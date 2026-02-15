"use client";

import type { Profile } from "@/types/database";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function getInitials(name: string | null, email: string | null) {
  if (name?.trim()) return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  if (email) return email[0].toUpperCase();
  return "?";
}

type AssigneeAvatarsProps = {
  profileIds: string[];
  profilesMap: Map<string, Profile>;
  max?: number;
  size?: "sm" | "md";
  className?: string;
};

export function AssigneeAvatars({
  profileIds,
  profilesMap,
  max = 3,
  size = "sm",
  className,
}: AssigneeAvatarsProps) {
  const show = profileIds.slice(0, max);
  const rest = profileIds.length - max;
  const sizeClass = size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs";

  if (show.length === 0) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  return (
    <div className={cn("flex items-center", className)}>
      {show.map((id, i) => {
        const p = profilesMap.get(id);
        return (
          <Avatar
            key={id}
            className={cn(
              "border-2 border-background shrink-0",
              sizeClass,
              i > 0 && "-ml-2"
            )}
            title={p ? (p.full_name ?? p.email ?? id) : id}
          >
            <AvatarImage src={p?.avatar_url ?? undefined} alt={p?.full_name ?? ""} />
            <AvatarFallback className="bg-muted text-muted-foreground">
              {p ? getInitials(p.full_name, p.email) : "?"}
            </AvatarFallback>
          </Avatar>
        );
      })}
      {rest > 0 && (
        <span
          className={cn(
            "ml-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] text-muted-foreground",
            size === "md" && "h-8 w-8 text-xs",
            show.length > 0 && "-ml-2"
          )}
        >
          +{rest}
        </span>
      )}
    </div>
  );
}
