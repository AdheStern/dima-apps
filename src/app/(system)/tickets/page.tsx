// src/app/(system)/tickets/page.tsx

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { TicketsContainer } from "@/components/system/tickets/tickets-container";
import { auth } from "@/lib/auth";

export default async function TicketsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in");

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Tickets de Soporte</h2>
        <p className="text-muted-foreground">
          Gestiona y da seguimiento a los tickets de soporte técnico
        </p>
      </div>
      <TicketsContainer currentUserId={session.user.id} />
    </div>
  );
}
