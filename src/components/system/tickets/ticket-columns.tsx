// src/components/system/tickets/ticket-columns.tsx

"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CheckCircle,
  Eye,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  RotateCcw,
} from "lucide-react";
import { SupportStatusBadge } from "@/components/shared/support-status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SupportTicketSummary } from "@/lib/actions/types/support-ticket-types";

interface TicketActionsProps {
  ticket: SupportTicketSummary;
  usersMap: Record<string, string>;
  onEdit: (ticket: SupportTicketSummary) => void;
  onViewDetail: (ticket: SupportTicketSummary) => void;
  onStart: (ticket: SupportTicketSummary) => void;
  onPause: (ticket: SupportTicketSummary) => void;
  onResume: (ticket: SupportTicketSummary) => void;
  onComplete: (ticket: SupportTicketSummary) => void;
}

function TicketActions({
  ticket,
  onEdit,
  onViewDetail,
  onStart,
  onPause,
  onResume,
  onComplete,
}: TicketActionsProps) {
  const { status } = ticket;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Abrir menú</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onViewDetail(ticket)}>
          <Eye className="mr-2 h-4 w-4" />
          Ver detalles
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onEdit(ticket)}
          disabled={status === "COMPLETED"}
        >
          <Pencil className="mr-2 h-4 w-4" />
          Editar
        </DropdownMenuItem>

        {(status === "PENDING" ||
          status === "REVIEW" ||
          status === "PAUSED") && <DropdownMenuSeparator />}

        {status === "PENDING" && (
          <DropdownMenuItem onClick={() => onStart(ticket)}>
            <Play className="mr-2 h-4 w-4" />
            Iniciar
          </DropdownMenuItem>
        )}
        {status === "PENDING" && ticket.startTime && ticket.endTime && (
          <DropdownMenuItem onClick={() => onComplete(ticket)}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Completar
          </DropdownMenuItem>
        )}
        {status === "REVIEW" && (
          <DropdownMenuItem onClick={() => onPause(ticket)}>
            <Pause className="mr-2 h-4 w-4" />
            Pausar
          </DropdownMenuItem>
        )}
        {status === "PAUSED" && (
          <DropdownMenuItem onClick={() => onResume(ticket)}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reanudar
          </DropdownMenuItem>
        )}
        {(status === "REVIEW" || status === "PAUSED") && (
          <DropdownMenuItem onClick={() => onComplete(ticket)}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Completar
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function createTicketColumns(
  onEdit: (ticket: SupportTicketSummary) => void,
  onViewDetail: (ticket: SupportTicketSummary) => void,
  onStart: (ticket: SupportTicketSummary) => void,
  onPause: (ticket: SupportTicketSummary) => void,
  onResume: (ticket: SupportTicketSummary) => void,
  onComplete: (ticket: SupportTicketSummary) => void,
  usersMap: Record<string, string>,
): ColumnDef<SupportTicketSummary>[] {
  return [
    {
      accessorKey: "ticketNumber",
      header: "Ticket",
      cell: ({ row }) => (
        <span className="font-mono text-sm font-medium whitespace-nowrap">
          {row.original.ticketNumber}
        </span>
      ),
    },
    {
      accessorKey: "shortDescription",
      header: "Descripción",
      cell: ({ row }) => (
        <div className="max-w-[200px]">
          <p className="text-sm truncate">{row.original.shortDescription}</p>
          <p className="text-xs text-muted-foreground">
            {row.original.client.name}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "supportType",
      header: "Tipo",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.supportType.name}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => <SupportStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "assignedToId",
      header: "Asignado a",
      cell: ({ row }) => (
        <span className="text-sm">
          {usersMap[row.original.assignedToId] ??
            row.original.assignedToId.slice(0, 8) + "…"}
        </span>
      ),
    },
    {
      accessorKey: "startTime",
      header: "Inicio",
      cell: ({ row }) =>
        row.original.startTime ? (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {format(new Date(row.original.startTime), "dd/MM/yy HH:mm", {
              locale: es,
            })}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "totalHours",
      header: "Horas",
      cell: ({ row }) => {
        const { totalHours, officeHours, extraHours } = row.original;
        if (totalHours == null) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium">{Number(totalHours).toFixed(1)}h</span>
            {(officeHours != null || extraHours != null) && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {officeHours != null && `${Number(officeHours).toFixed(1)}of`}
                {officeHours != null && extraHours != null && " · "}
                {extraHours != null && extraHours > 0 && `${Number(extraHours).toFixed(1)}ex`}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <TicketActions
          ticket={row.original}
          usersMap={usersMap}
          onEdit={onEdit}
          onViewDetail={onViewDetail}
          onStart={onStart}
          onPause={onPause}
          onResume={onResume}
          onComplete={onComplete}
        />
      ),
    },
  ];
}
