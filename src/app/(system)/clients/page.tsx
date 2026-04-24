// src/app/(system)/clients/page.tsx

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ClientsContainer } from "@/components/system/clients/clients-container";
import { auth } from "@/lib/auth";

export default async function ClientsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in");

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Clientes</h2>
        <p className="text-muted-foreground">
          Gestiona los clientes y sus paquetes de horas de soporte
        </p>
      </div>
      <ClientsContainer />
    </div>
  );
}
