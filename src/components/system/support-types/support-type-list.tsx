// src/components/system/support-types/support-type-list.tsx

"use client";

import { Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  deleteSupportType,
  updateSupportType,
} from "@/lib/actions/support-type-actions";
import type { SupportTypeWithRelations } from "@/lib/actions/types/support-type-types";
import { createSupportTypeColumns } from "./support-type-columns";
import { SupportTypeFormDrawer } from "./support-type-form-drawer";

interface SupportTypeListProps {
  initialData: SupportTypeWithRelations[];
}

export function SupportTypeList({ initialData }: SupportTypeListProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SupportTypeWithRelations | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<SupportTypeWithRelations | null>(null);

  const filtered = initialData.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleEdit = (supportType: SupportTypeWithRelations) => {
    setSelected(supportType);
    setIsFormOpen(true);
  };

  const handleToggleActive = async (supportType: SupportTypeWithRelations) => {
    const result = await updateSupportType({
      id: supportType.id,
      active: !supportType.active,
    });
    if (result.success) {
      toast.success(supportType.active ? "Tipo desactivado" : "Tipo activado");
      router.refresh();
    } else {
      toast.error(result.error ?? "Error al actualizar");
    }
  };

  const handleDelete = (supportType: SupportTypeWithRelations) => {
    setToDelete(supportType);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const result = await deleteSupportType(toDelete.id);
    if (result.success) {
      toast.success("Tipo de soporte eliminado");
      router.refresh();
    } else {
      toast.error(result.error ?? "Error al eliminar");
    }
    setIsDeleteOpen(false);
    setToDelete(null);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelected(null);
  };

  const columns = createSupportTypeColumns(
    handleEdit,
    handleToggleActive,
    handleDelete,
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Tipos de Soporte</CardTitle>
            <Button onClick={() => setIsFormOpen(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo tipo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <DataTable columns={columns} data={filtered} />
        </CardContent>
      </Card>

      <SupportTypeFormDrawer
        open={isFormOpen}
        onOpenChange={handleFormClose}
        supportType={selected}
        onSuccess={() => {
          router.refresh();
          handleFormClose();
        }}
      />

      <ConfirmationDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={confirmDelete}
        title="¿Eliminar tipo de soporte?"
        description={
          toDelete?._count.tickets
            ? `El tipo "${toDelete.name}" tiene ${toDelete._count.tickets} ticket(s) y no puede eliminarse. Desactívelo en su lugar.`
            : `¿Eliminar el tipo "${toDelete?.name}"? Esta acción no se puede deshacer.`
        }
        confirmText="Eliminar"
        variant="destructive"
      />
    </>
  );
}
