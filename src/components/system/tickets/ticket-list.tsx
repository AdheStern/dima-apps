// src/components/system/tickets/ticket-list.tsx

"use client";

import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  completeTicket,
  pauseTicket,
  resumeTicket,
  startTicket,
} from "@/lib/actions/support-ticket-actions";
import type { UserWithRelations } from "@/lib/actions/types/action-types";
import type { ClientWithRelations } from "@/lib/actions/types/client-types";
import type { SupportTypeWithRelations } from "@/lib/actions/types/support-type-types";
import type { SupportTicketWithRelations } from "@/lib/actions/types/support-ticket-types";
import { createTicketColumns } from "./ticket-columns";
import { TicketFormDrawer } from "./ticket-form-drawer";
import { TicketStatsCard } from "./ticket-stats-card";

interface TicketListProps {
  tickets: SupportTicketWithRelations[];
  clients: ClientWithRelations[];
  supportTypes: SupportTypeWithRelations[];
  users: UserWithRelations[];
  currentUserId: string;
  onRefresh: () => void;
}

const STATUS_TABS = [
  { value: "all", label: "Todos" },
  { value: "PENDING", label: "Pendientes" },
  { value: "REVIEW", label: "En revisión" },
  { value: "PAUSED", label: "Pausados" },
  { value: "COMPLETED", label: "Completados" },
] as const;

export function TicketList({
  tickets,
  clients,
  supportTypes,
  users,
  currentUserId,
  onRefresh,
}: TicketListProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] =
    useState<SupportTicketWithRelations | null>(null);

  const usersMap = Object.fromEntries(users.map((u) => [u.id, u.name]));

  const getFiltered = (statusFilter: string) => {
    let result = tickets;
    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.ticketNumber.toLowerCase().includes(q) ||
          t.shortDescription.toLowerCase().includes(q) ||
          t.client.name.toLowerCase().includes(q),
      );
    }
    return result;
  };

  const handleEdit = (ticket: SupportTicketWithRelations) => {
    setSelectedTicket(ticket);
    setIsFormOpen(true);
  };

  const handleViewDetail = (ticket: SupportTicketWithRelations) => {
    setSelectedTicket(ticket);
    setIsFormOpen(true);
  };

  const handleStart = async (ticket: SupportTicketWithRelations) => {
    const result = await startTicket(ticket.id);
    if (result.success) {
      toast.success("Ticket iniciado");
      onRefresh();
    } else {
      toast.error(result.error ?? "Error al iniciar ticket");
    }
  };

  const handlePause = async (ticket: SupportTicketWithRelations) => {
    const result = await pauseTicket(ticket.id);
    if (result.success) {
      toast.success("Ticket pausado");
      onRefresh();
    } else {
      toast.error(result.error ?? "Error al pausar ticket");
    }
  };

  const handleResume = async (ticket: SupportTicketWithRelations) => {
    const result = await resumeTicket(ticket.id);
    if (result.success) {
      toast.success("Ticket reanudado");
      onRefresh();
    } else {
      toast.error(result.error ?? "Error al reanudar ticket");
    }
  };

  const handleComplete = async (ticket: SupportTicketWithRelations) => {
    const result = await completeTicket(ticket.id);
    if (result.success) {
      toast.success("Ticket completado");
      onRefresh();
    } else {
      toast.error(result.error ?? "Error al completar ticket");
    }
  };

  const columns = createTicketColumns(
    handleEdit,
    handleViewDetail,
    handleStart,
    handlePause,
    handleResume,
    handleComplete,
    usersMap,
  );

  return (
    <>
      <TicketStatsCard tickets={tickets} />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Tickets de soporte</CardTitle>
            <Button
              size="sm"
              onClick={() => {
                setSelectedTicket(null);
                setIsFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuevo ticket
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, descripción o cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 flex w-full overflow-x-auto sm:w-auto">
              {STATUS_TABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="text-xs sm:text-sm shrink-0"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {STATUS_TABS.map((tab) => (
              <TabsContent key={tab.value} value={tab.value}>
                <DataTable columns={columns} data={getFiltered(tab.value)} />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <TicketFormDrawer
        open={isFormOpen}
        onOpenChange={(isOpen) => {
          setIsFormOpen(isOpen);
          if (!isOpen) setSelectedTicket(null);
        }}
        ticket={selectedTicket}
        clients={clients}
        supportTypes={supportTypes}
        users={users}
        currentUserId={currentUserId}
        onSuccess={() => {
          onRefresh();
          setIsFormOpen(false);
          setSelectedTicket(null);
        }}
      />
    </>
  );
}
