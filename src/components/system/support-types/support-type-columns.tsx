// src/components/system/support-types/support-type-columns.tsx

"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react";
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
import type { SupportTypeWithRelations } from "@/lib/actions/types/support-type-types";

interface SupportTypeActionsProps {
  supportType: SupportTypeWithRelations;
  onEdit: (supportType: SupportTypeWithRelations) => void;
  onToggleActive: (supportType: SupportTypeWithRelations) => void;
  onDelete: (supportType: SupportTypeWithRelations) => void;
}

function SupportTypeActions({
  supportType,
  onEdit,
  onToggleActive,
  onDelete,
}: SupportTypeActionsProps) {
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
        <DropdownMenuItem onClick={() => onEdit(supportType)}>
          <Pencil className="mr-2 h-4 w-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onToggleActive(supportType)}>
          <Power className="mr-2 h-4 w-4" />
          {supportType.active ? "Desactivar" : "Activar"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onDelete(supportType)}
          className="text-destructive focus:text-destructive"
          disabled={supportType._count.tickets > 0}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function createSupportTypeColumns(
  onEdit: (supportType: SupportTypeWithRelations) => void,
  onToggleActive: (supportType: SupportTypeWithRelations) => void,
  onDelete: (supportType: SupportTypeWithRelations) => void,
): ColumnDef<SupportTypeWithRelations>[] {
  return [
    {
      accessorKey: "name",
      header: "Nombre",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "description",
      header: "Descripción",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground line-clamp-1">
          {row.original.description ?? "—"}
        </span>
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
      accessorKey: "_count",
      header: "Tickets",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original._count.tickets}</Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <SupportTypeActions
          supportType={row.original}
          onEdit={onEdit}
          onToggleActive={onToggleActive}
          onDelete={onDelete}
        />
      ),
    },
  ];
}
