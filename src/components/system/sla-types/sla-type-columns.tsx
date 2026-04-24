// src/components/system/sla-types/sla-type-columns.tsx

"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
import type { SlaTypeWithRelations } from "@/lib/actions/types/sla-type-types";

interface SlaTypeActionsProps {
  slaType: SlaTypeWithRelations;
  onEdit: (slaType: SlaTypeWithRelations) => void;
  onDelete: (slaType: SlaTypeWithRelations) => void;
}

function SlaTypeActions({ slaType, onEdit, onDelete }: SlaTypeActionsProps) {
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
        <DropdownMenuItem onClick={() => onEdit(slaType)}>
          <Pencil className="mr-2 h-4 w-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onDelete(slaType)}
          className="text-destructive focus:text-destructive"
          disabled={slaType._count.clients > 0}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function createSlaTypeColumns(
  onEdit: (slaType: SlaTypeWithRelations) => void,
  onDelete: (slaType: SlaTypeWithRelations) => void,
): ColumnDef<SlaTypeWithRelations>[] {
  return [
    {
      accessorKey: "name",
      header: "Nombre",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "coverage",
      header: "Cobertura",
      cell: ({ row }) => {
        const { hoursPerDay, daysPerWeek } = row.original;
        return (
          <Badge variant="secondary">
            {hoursPerDay}h × {daysPerWeek}d
          </Badge>
        );
      },
    },
    {
      accessorKey: "responseTimeHours",
      header: "Resp. máx.",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.responseTimeHours}h</span>
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
      accessorKey: "_count",
      header: "Clientes",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original._count.clients}</Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <SlaTypeActions
          slaType={row.original}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ),
    },
  ];
}
