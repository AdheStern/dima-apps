// src/components/system/clients/clients-container.tsx

"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getClients } from "@/lib/actions/client-actions";
import { getAllSlaTypes } from "@/lib/actions/sla-type-actions";
import type { ClientWithRelations } from "@/lib/actions/types/client-types";
import type { SlaTypeWithRelations } from "@/lib/actions/types/sla-type-types";
import { ClientList } from "./client-list";

export function ClientsContainer() {
  const [clients, setClients] = useState<ClientWithRelations[]>([]);
  const [slaTypes, setSlaTypes] = useState<SlaTypeWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [clientsResult, slaResult] = await Promise.all([
        getClients({}, { page: 1, pageSize: 500 }),
        getAllSlaTypes(),
      ]);

      if (clientsResult.success && clientsResult.data) {
        setClients(clientsResult.data.data);
      } else {
        toast.error("Error al cargar clientes");
      }

      if (slaResult.success && slaResult.data) {
        setSlaTypes(slaResult.data);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <ClientList clients={clients} slaTypes={slaTypes} onRefresh={loadData} />;
}
