// src/app/(system)/administration/page.tsx

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdministrationContainer } from "@/components/administration/administration-container";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const ALLOWED_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER"] as const;

export default async function AdministrationPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/sign-in");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (
    !user ||
    !ALLOWED_ROLES.includes(user.role as (typeof ALLOWED_ROLES)[number])
  ) {
    redirect("/dashboard");
  }

  return <AdministrationContainer userId={session.user.id} />;
}
