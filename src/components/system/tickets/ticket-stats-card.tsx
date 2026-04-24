// src/components/system/tickets/ticket-stats-card.tsx

import { Card, CardContent } from "@/components/ui/card";
import type { SupportTicketSummary } from "@/lib/actions/types/support-ticket-types";

interface TicketStatsCardProps {
  tickets: SupportTicketSummary[];
}

export function TicketStatsCard({ tickets }: TicketStatsCardProps) {
  const completed = tickets.filter((t) => t.status === "COMPLETED");

  const totalOfficeHours = completed.reduce(
    (sum, t) => sum + (t.officeHours ?? 0),
    0,
  );
  const totalExtraHours = completed.reduce(
    (sum, t) => sum + (t.extraHours ?? 0),
    0,
  );

  const counts = {
    total: tickets.length,
    pending: tickets.filter((t) => t.status === "PENDING").length,
    review: tickets.filter((t) => t.status === "REVIEW").length,
    paused: tickets.filter((t) => t.status === "PAUSED").length,
    completed: completed.length,
  };

  const statusItems = [
    { label: "Total", value: counts.total, color: "" },
    { label: "Pendientes", value: counts.pending, color: "text-yellow-600" },
    { label: "En revisión", value: counts.review, color: "text-blue-600" },
    { label: "Pausados", value: counts.paused, color: "text-orange-600" },
    { label: "Completados", value: counts.completed, color: "text-green-600" },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {statusItems.map((item) => (
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

      {completed.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold text-blue-600">
                {totalOfficeHours.toFixed(1)}h
              </div>
              <div className="text-xs text-muted-foreground">
                Horas en horario laboral
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold text-orange-600">
                {totalExtraHours.toFixed(1)}h
              </div>
              <div className="text-xs text-muted-foreground">
                Horas fuera de horario
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
