// src/components/shared/status-badge.tsx

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

interface StatusBadgeProps {
  status: UserStatus | string;
  className?: string;
}

const statusConfig: Record<
  UserStatus,
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  ACTIVE: {
    label: "Activo",
    variant: "default",
  },
  INACTIVE: {
    label: "Inactivo",
    variant: "secondary",
  },
  SUSPENDED: {
    label: "Suspendido",
    variant: "destructive",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status as UserStatus];

  if (!config) {
    return null;
  }

  return (
    <Badge variant={config.variant} className={cn("font-medium", className)}>
      {config.label}
    </Badge>
  );
}
