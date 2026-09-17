import { Share2, Server, Box, Container, Database } from "lucide-react";

const ICONS: Record<string, React.ElementType> = {
  service:   Share2,
  host:      Server,
  pod:       Box,
  container: Container,
  database:  Database,
};

export function EntityIcon({
  type,
  size = 14,
  className,
}: {
  type: string;
  size?: number;
  className?: string;
}) {
  const Icon = ICONS[type] ?? Share2;
  return <Icon size={size} strokeWidth={1.5} className={className} />;
}
