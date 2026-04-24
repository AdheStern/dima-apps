// src/components/system/clients/client-stats-card.tsx

import { Card, CardContent } from "@/components/ui/card";

interface ClientStatsCardProps {
  totalHours: number;
  consumedHours: number;
  availableHours: number;
}

export function ClientStatsCard({
  totalHours,
  consumedHours,
  availableHours,
}: ClientStatsCardProps) {
  const availableColor =
    availableHours < 0
      ? "text-destructive"
      : availableHours < 10
        ? "text-yellow-600"
        : "text-green-600";

  return (
    <div className="grid grid-cols-3 gap-3">
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="text-2xl font-bold">{totalHours.toFixed(1)}</div>
          <div className="text-xs text-muted-foreground">Compradas</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="text-2xl font-bold">{consumedHours.toFixed(1)}</div>
          <div className="text-xs text-muted-foreground">Usadas</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className={`text-2xl font-bold ${availableColor}`}>
            {availableHours.toFixed(1)}
          </div>
          <div className="text-xs text-muted-foreground">Disponibles</div>
        </CardContent>
      </Card>
    </div>
  );
}
