// src/app/(system)/administration/sla-types/page.tsx

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SlaTypeList } from "@/components/system/sla-types/sla-type-list";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAllSlaTypes } from "@/lib/actions/sla-type-actions";

const ALLOWED_ROLES = ["SUPER_ADMIN", "ADMIN"] as const;

export default async function SlaTypesPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) redirect("/sign-in");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || !ALLOWED_ROLES.includes(user.role as (typeof ALLOWED_ROLES)[number])) {
    redirect("/dashboard");
  }

  const result = await getAllSlaTypes();
  const slaTypes = result.success ? (result.data ?? []) : [];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Tipos de SLA</h2>
        <p className="text-muted-foreground">
          Gestiona los niveles de acuerdo de servicio disponibles
        </p>
      </div>
      <SlaTypeList initialData={slaTypes} />
    </div>
  );
}
