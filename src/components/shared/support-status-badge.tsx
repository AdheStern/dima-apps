// src/components/shared/support-status-badge.tsx

import { Badge } from "@/components/ui/badge";
import type {
  ConformityStatus,
  SupportStatus,
} from "@/lib/actions/types/support-ticket-types";

const supportStatusConfig: Record<
  SupportStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pendiente",
    className:
      "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  REVIEW: {
    label: "En revisión",
    className:
      "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
  },
  PAUSED: {
    label: "Pausado",
    className:
      "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400",
  },
  COMPLETED: {
    label: "Completado",
    className:
      "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400",
  },
};

const conformityStatusConfig: Record<
  ConformityStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pendiente",
    className:
      "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  APPROVED: {
    label: "Aprobado",
    className:
      "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400",
  },
  REJECTED: {
    label: "Rechazado",
    className:
      "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400",
  },
};

export function SupportStatusBadge({ status }: { status: SupportStatus }) {
  const config = supportStatusConfig[status] ?? { label: status, className: "" };
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}

export function ConformityStatusBadge({
  status,
}: {
  status: ConformityStatus;
}) {
  const config = conformityStatusConfig[status] ?? {
    label: status,
    className: "",
  };
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
