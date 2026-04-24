// src/components/system/clients/client-list.tsx

"use client";

import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { deleteClient } from "@/lib/actions/client-actions";
import type { ClientWithRelations } from "@/lib/actions/types/client-types";
import type { SlaTypeWithRelations } from "@/lib/actions/types/sla-type-types";
import { createClientColumns } from "./client-columns";
import { ClientDetailSheet } from "./client-detail-sheet";
import { ClientFormDrawer } from "./client-form-drawer";

interface ClientListProps {
  clients: ClientWithRelations[];
  slaTypes: SlaTypeWithRelations[];
  onRefresh: () => void;
}

export function ClientList({ clients, slaTypes, onRefresh }: ClientListProps) {
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedClient, setSelectedClient] =
    useState<ClientWithRelations | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailClient, setDetailClient] = useState<ClientWithRelations | null>(
    null,
  );
  const [toDelete, setToDelete] = useState<ClientWithRelations | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.ruc ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const handleEdit = (client: ClientWithRelations) => {
    setSelectedClient(client);
    setIsFormOpen(true);
  };

  const handleViewDetail = (client: ClientWithRelations) => {
    setDetailClient(client);
    setIsDetailOpen(true);
  };

  const handleDelete = (client: ClientWithRelations) => {
    setToDelete(client);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const result = await deleteClient(toDelete.id);
    if (result.success) {
      toast.success("Cliente eliminado");
      onRefresh();
    } else {
      toast.error(result.error ?? "Error al eliminar");
    }
    setIsDeleteOpen(false);
    setToDelete(null);
  };

  const columns = createClientColumns(handleEdit, handleViewDetail, handleDelete);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Clientes</CardTitle>
            <Button
              size="sm"
              onClick={() => {
                setSelectedClient(null);
                setIsFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuevo cliente
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o RUC..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <DataTable columns={columns} data={filtered} />
        </CardContent>
      </Card>

      <ClientFormDrawer
        open={isFormOpen}
        onOpenChange={(isOpen) => {
          setIsFormOpen(isOpen);
          if (!isOpen) setSelectedClient(null);
        }}
        client={selectedClient}
        slaTypes={slaTypes}
        onSuccess={() => {
          onRefresh();
          setIsFormOpen(false);
          setSelectedClient(null);
        }}
      />

      <ClientDetailSheet
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        clientId={detailClient?.id ?? null}
        clientName={detailClient?.name ?? ""}
      />

      <ConfirmationDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={confirmDelete}
        title="¿Eliminar cliente?"
        description={
          toDelete?._count.supportTickets
            ? `"${toDelete.name}" tiene ${toDelete._count.supportTickets} ticket(s) y no puede eliminarse. Desactívelo en su lugar.`
            : `¿Eliminar el cliente "${toDelete?.name}"? Esta acción no se puede deshacer.`
        }
        confirmText="Eliminar"
        variant="destructive"
      />
    </>
  );
}
