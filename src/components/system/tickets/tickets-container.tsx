// src/components/system/tickets/tickets-container.tsx

"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getUsers } from "@/lib/actions/user-actions";
import { getClients } from "@/lib/actions/client-actions";
import { getAllSupportTypes } from "@/lib/actions/support-type-actions";
import { getSupportTickets } from "@/lib/actions/support-ticket-actions";
import type { UserWithRelations } from "@/lib/actions/types/action-types";
import type { ClientWithRelations } from "@/lib/actions/types/client-types";
import type { SupportTypeWithRelations } from "@/lib/actions/types/support-type-types";
import type { SupportTicketSummary } from "@/lib/actions/types/support-ticket-types";
import { TicketList } from "./ticket-list";

interface TicketsContainerProps {
  currentUserId: string;
}

export function TicketsContainer({ currentUserId }: TicketsContainerProps) {
  const [tickets, setTickets] = useState<SupportTicketSummary[]>([]);
  const [clients, setClients] = useState<ClientWithRelations[]>([]);
  const [supportTypes, setSupportTypes] = useState<SupportTypeWithRelations[]>(
    [],
  );
  const [users, setUsers] = useState<UserWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ticketsResult, clientsResult, typesResult, usersResult] =
        await Promise.all([
          getSupportTickets({}, { page: 1, pageSize: 500 }),
          getClients({}, { page: 1, pageSize: 500 }),
          getAllSupportTypes(),
          getUsers({}, { page: 1, pageSize: 200 }),
        ]);

      if (ticketsResult.success && ticketsResult.data) {
        setTickets(ticketsResult.data.data);
      } else {
        toast.error("Error al cargar tickets");
      }

      if (clientsResult.success && clientsResult.data) {
        setClients(clientsResult.data.data);
      }

      if (typesResult.success && typesResult.data) {
        setSupportTypes(typesResult.data);
      }

      if (usersResult.success && usersResult.data) {
        setUsers(usersResult.data.data);
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

  return (
    <TicketList
      tickets={tickets}
      clients={clients}
      supportTypes={supportTypes}
      users={users}
      currentUserId={currentUserId}
      onRefresh={loadData}
    />
  );
}
