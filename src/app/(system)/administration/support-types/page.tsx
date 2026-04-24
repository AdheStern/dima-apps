// src/app/(system)/administration/support-types/page.tsx

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SupportTypeList } from "@/components/system/support-types/support-type-list";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAllSupportTypes } from "@/lib/actions/support-type-actions";

const ALLOWED_ROLES = ["SUPER_ADMIN", "ADMIN"] as const;

export default async function SupportTypesPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) redirect("/sign-in");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || !ALLOWED_ROLES.includes(user.role as (typeof ALLOWED_ROLES)[number])) {
    redirect("/dashboard");
  }

  const result = await getAllSupportTypes();
  const supportTypes = result.success ? (result.data ?? []) : [];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Tipos de Soporte</h2>
        <p className="text-muted-foreground">
          Catálogo de categorías para clasificar los tickets de soporte
        </p>
      </div>
      <SupportTypeList initialData={supportTypes} />
    </div>
  );
}
