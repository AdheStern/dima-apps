// src/components/system/clients/client-columns.tsx

"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ClientWithRelations } from "@/lib/actions/types/client-types";

interface ClientActionsProps {
  client: ClientWithRelations;
  onEdit: (client: ClientWithRelations) => void;
  onViewDetail: (client: ClientWithRelations) => void;
  onDelete: (client: ClientWithRelations) => void;
}

function ClientActions({
  client,
  onEdit,
  onViewDetail,
  onDelete,
}: ClientActionsProps) {
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
        <DropdownMenuItem onClick={() => onViewDetail(client)}>
          <Eye className="mr-2 h-4 w-4" />
          Ver detalles
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(client)}>
          <Pencil className="mr-2 h-4 w-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onDelete(client)}
          className="text-destructive focus:text-destructive"
          disabled={client._count.supportTickets > 0}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function createClientColumns(
  onEdit: (client: ClientWithRelations) => void,
  onViewDetail: (client: ClientWithRelations) => void,
  onDelete: (client: ClientWithRelations) => void,
): ColumnDef<ClientWithRelations>[] {
  return [
    {
      accessorKey: "name",
      header: "Cliente",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.name}</span>
          {row.original.ruc && (
            <span className="text-xs text-muted-foreground">
              RUC: {row.original.ruc}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "slaType",
      header: "SLA",
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.slaType.name}</Badge>
      ),
    },
    {
      accessorKey: "contacts",
      header: "Contactos",
      cell: ({ row }) => (
        <span className="text-sm">{row.original._count.contacts}</span>
      ),
    },
    {
      accessorKey: "supportTickets",
      header: "Tickets",
      cell: ({ row }) => (
        <span className="text-sm">{row.original._count.supportTickets}</span>
      ),
    },
    {
      accessorKey: "active",
      header: "Estado",
      cell: ({ row }) =>
        row.original.active ? (
          <Badge variant="default">Activo</Badge>
        ) : (
          <Badge variant="secondary">Inactivo</Badge>
        ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <ClientActions
          client={row.original}
          onEdit={onEdit}
          onViewDetail={onViewDetail}
          onDelete={onDelete}
        />
      ),
    },
  ];
}
