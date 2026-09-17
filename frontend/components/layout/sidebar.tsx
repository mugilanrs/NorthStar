"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Share2,
  BarChart2,
  Flame,
  ScrollText,
  Boxes,
  Bell,
  AlertTriangle,
  GitPullRequest,
  Bug,
  Database,
  BookOpen,
  FlaskConical,
  Bot,
  Gauge,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, group: "observe" },
  { label: "Services", href: "/services", icon: Share2, group: "observe" },
  { label: "Metrics", href: "/metrics", icon: BarChart2, group: "observe" },
  { label: "Traces", href: "/traces", icon: Flame, group: "observe" },
  { label: "Logs", href: "/logs", icon: ScrollText, group: "observe" },
  { label: "Kubernetes", href: "/kubernetes", icon: Boxes, group: "observe" },
  { label: "Alerts", href: "/alerts", icon: Bell, group: "itsm" },
  { label: "Incidents", href: "/incidents", icon: AlertTriangle, group: "itsm" },
  { label: "Changes", href: "/changes", icon: GitPullRequest, group: "itsm" },
  { label: "Problems", href: "/problems", icon: Bug, group: "itsm" },
  { label: "CMDB", href: "/cmdb", icon: Database, group: "itsm" },
  { label: "Knowledge Base", href: "/knowledge-base", icon: BookOpen, group: "itsm" },
  { label: "Synthetic", href: "/synthetic", icon: FlaskConical, group: "more" },
  { label: "SLA", href: "/sla", icon: Gauge, group: "more" },
  { label: "AI Copilot", href: "/copilot", icon: Bot, group: "more" },
];

const GROUP_LABELS: Record<string, string> = {
  observe: "Observability",
  itsm: "ITSM",
  more: "More",
};

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const groups = ["observe", "itsm", "more"];

  return (
    <aside
      className={cn(
        "flex flex-col h-screen border-r border-border bg-sidebar transition-all duration-200",
        collapsed ? "w-12" : "w-[220px]"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center h-12 px-3 border-b border-border shrink-0",
        collapsed ? "justify-center" : "gap-2"
      )}>
        <div className="w-5 h-5 rounded bg-primary shrink-0" />
        {!collapsed && (
          <span className="text-[13px] font-semibold tracking-tight text-foreground">
            NorthStar
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {groups.map((group) => {
          const items = NAV_ITEMS.filter((i) => i.group === group);
          return (
            <div key={group} className="mb-1">
              {!collapsed && (
                <p className="text-micro text-muted-foreground px-3 py-1.5">
                  {GROUP_LABELS[group]}
                </p>
              )}
              {items.map((item) => {
                const active = pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));
                const link = (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-1.5 mx-1 rounded text-[13px] font-[450] transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <item.icon
                      size={14}
                      strokeWidth={1.5}
                      className={cn("shrink-0", active && "text-primary")}
                    />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );

                if (collapsed) {
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger render={<span />}>{link}</TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  );
                }
                return link;
              })}
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center justify-center h-9 border-t border-border text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
}
