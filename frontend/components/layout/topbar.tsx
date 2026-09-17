"use client";

import { Bell, Search, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Topbar({ title }: { title?: string }) {
  return (
    <header className="flex items-center justify-between h-12 px-4 border-b border-border bg-background shrink-0">
      <h1 className="text-[13px] font-medium text-foreground">
        {title ?? "NorthStar"}
      </h1>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-muted-foreground hover:text-foreground text-xs gap-1.5"
        >
          <Search size={13} strokeWidth={1.5} />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden sm:inline text-[10px] font-mono bg-muted px-1 rounded">⌘K</kbd>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
        >
          <Bell size={13} strokeWidth={1.5} />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-primary"
          title="AI Copilot (⌘⇧A)"
        >
          <Bot size={13} strokeWidth={1.5} />
        </Button>
      </div>
    </header>
  );
}
