// src/components/system/tickets/ticket-stats-card.tsx

import { Card, CardContent } from "@/components/ui/card";
import type { SupportTicketWithRelations } from "@/lib/actions/types/support-ticket-types";

interface TicketStatsCardProps {
  tickets: SupportTicketWithRelations[];
}

export function TicketStatsCard({ tickets }: TicketStatsCardProps) {
  const stats = {
    total: tickets.length,
    pending: tickets.filter((t) => t.status === "PENDING").length,
    review: tickets.filter((t) => t.status === "REVIEW").length,
    paused: tickets.filter((t) => t.status === "PAUSED").length,
    completed: tickets.filter((t) => t.status === "COMPLETED").length,
  };

  const items = [
    { label: "Total", value: stats.total, color: "" },
    { label: "Pendientes", value: stats.pending, color: "text-yellow-600" },
    { label: "En revisión", value: stats.review, color: "text-blue-600" },
    { label: "Pausados", value: stats.paused, color: "text-orange-600" },
    { label: "Completados", value: stats.completed, color: "text-green-600" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="pt-4 pb-3">
            <div className={`text-2xl font-bold ${item.color}`}>
              {item.value}
            </div>
            <div className="text-xs text-muted-foreground">{item.label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
