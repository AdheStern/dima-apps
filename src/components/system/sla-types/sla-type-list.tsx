// src/components/system/sla-types/sla-type-list.tsx

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
import { deleteSlaType } from "@/lib/actions/sla-type-actions";
import type { SlaTypeWithRelations } from "@/lib/actions/types/sla-type-types";
import { createSlaTypeColumns } from "./sla-type-columns";
import { SlaTypeFormDrawer } from "./sla-type-form-drawer";

interface SlaTypeListProps {
  initialData: SlaTypeWithRelations[];
}

export function SlaTypeList({ initialData }: SlaTypeListProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SlaTypeWithRelations | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<SlaTypeWithRelations | null>(null);

  const filtered = initialData.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleEdit = (slaType: SlaTypeWithRelations) => {
    setSelected(slaType);
    setIsFormOpen(true);
  };

  const handleDelete = (slaType: SlaTypeWithRelations) => {
    setToDelete(slaType);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const result = await deleteSlaType(toDelete.id);
    if (result.success) {
      toast.success("Tipo de SLA eliminado");
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

  const columns = createSlaTypeColumns(handleEdit, handleDelete);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Tipos de SLA</CardTitle>
            <Button onClick={() => setIsFormOpen(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo SLA
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

      <SlaTypeFormDrawer
        open={isFormOpen}
        onOpenChange={handleFormClose}
        slaType={selected}
        onSuccess={() => {
          router.refresh();
          handleFormClose();
        }}
      />

      <ConfirmationDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={confirmDelete}
        title="¿Eliminar tipo de SLA?"
        description={
          toDelete?._count.clients
            ? `El SLA "${toDelete.name}" tiene ${toDelete._count.clients} cliente(s) asignado(s) y no puede eliminarse.`
            : `¿Eliminar el SLA "${toDelete?.name}"? Esta acción no se puede deshacer.`
        }
        confirmText="Eliminar"
        variant="destructive"
      />
    </>
  );
}
