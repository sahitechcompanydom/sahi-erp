"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ProfileOption = { id: string; label: string };
export type TeamOption = { id: string; label: string; memberIds: string[] };

type MultiSelectProfileProps = {
  value: string[];
  onChange: (ids: string[]) => void;
  profiles: ProfileOption[];
  teams?: TeamOption[];
  placeholder?: string;
  label?: string;
  className?: string;
};

/** Multi-select for profile IDs. Supports optional "Teams" group: selecting a team adds all memberIds. */
export function MultiSelectProfile({
  value,
  onChange,
  profiles,
  teams = [],
  placeholder = "Select…",
  label,
  className,
}: MultiSelectProfileProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleProfile(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((x) => x !== id));
    } else {
      onChange([...value, id]);
    }
  }

  function toggleTeam(team: TeamOption) {
    const allIn = team.memberIds.every((id) => value.includes(id));
    if (allIn) {
      onChange(value.filter((id) => !team.memberIds.includes(id)));
    } else {
      const added = new Set(value);
      team.memberIds.forEach((id) => added.add(id));
      onChange([...added]);
    }
  }

  const teamSelected = (team: TeamOption) => team.memberIds.length > 0 && team.memberIds.every((id) => value.includes(id));

  return (
    <div ref={ref} className={cn("relative", className)}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex min-h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        )}
      >
        <span className={cn("truncate", value.length === 0 && "text-muted-foreground")}>
          {value.length === 0 ? placeholder : `${value.length} selected`}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-popover p-1 shadow-md">
          {teams.length > 0 && (
            <div className="mb-2">
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Teams</p>
              {teams.map((team) => (
                <label
                  key={team.id}
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <input
                    type="checkbox"
                    checked={teamSelected(team)}
                    onChange={() => toggleTeam(team)}
                    className="h-4 w-4 rounded border-input"
                  />
                  {team.label} ({team.memberIds.length})
                </label>
              ))}
            </div>
          )}
          <div>
            <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
              {teams.length ? "People" : "Select"}
            </p>
            {profiles.map((p) => (
              <label
                key={p.id}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              >
                <input
                  type="checkbox"
                  checked={value.includes(p.id)}
                  onChange={() => toggleProfile(p.id)}
                  className="h-4 w-4 rounded border-input"
                />
                {p.label}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Chips display for selected profiles with remove. */
export function SelectedProfilesChips({
  profileIds,
  profileLabels,
  onRemove,
  maxShow = 3,
}: {
  profileIds: string[];
  profileLabels: Map<string, string>;
  onRemove: (id: string) => void;
  maxShow?: number;
}) {
  const show = profileIds.slice(0, maxShow);
  const rest = profileIds.length - maxShow;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {show.map((id) => (
        <span
          key={id}
          className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs"
        >
          {profileLabels.get(id) ?? id.slice(0, 8)}
          <button type="button" onClick={() => onRemove(id)} className="hover:text-destructive">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {rest > 0 && <span className="text-xs text-muted-foreground">+{rest}</span>}
    </div>
  );
}
