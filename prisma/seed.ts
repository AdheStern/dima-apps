// prisma/seed.ts

import { UserRole } from "@prisma/client";
import { db } from "@/lib/db";

async function createUserWithAuth(
  name: string,
  email: string,
  password: string,
  role: UserRole = UserRole.USER,
): Promise<unknown> {
  try {
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      console.log(`   ⏭️  ${name} ya existe`);
      return existing;
    }

    const response = await fetch(
      "http://localhost:3000/api/auth/sign-up/email",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      },
    );

    if (!response.ok) {
      throw new Error(`Error al crear ${name}`);
    }

    const user = await db.user.update({
      where: { email },
      data: {
        role,
        status: "ACTIVE",
        emailVerified: true,
      },
    });

    console.log(`   ✓ ${name} (${role})`);
    return user;
  } catch (error) {
    console.error(`   ❌ Error creando ${name}:`, error);
    return null;
  }
}

async function main() {
  console.log("🌱 Iniciando seed de la base de datos...\n");
  console.log("⏳ Esperando a que el servidor esté disponible...");

  let serverReady = false;
  let attempts = 0;

  while (!serverReady && attempts < 10) {
    try {
      const response = await fetch(
        "http://localhost:3000/api/auth/get-session",
      );
      serverReady = response.status === 401 || response.ok;
    } catch {
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  if (!serverReady) {
    console.error("❌ El servidor no está disponible en http://localhost:3000");
    console.log(
      "\n💡 Asegúrate de ejecutar 'pnpm dev' en otra terminal primero\n",
    );
    process.exit(1);
  }

  console.log("✅ Servidor disponible\n");
  console.log("👥 Creando usuario super admin...");

  await createUserWithAuth(
    "Super Admin",
    "admin@alpaca.com",
    "Admin123!",
    UserRole.SUPER_ADMIN,
  );

  console.log("\n═══════════════════════════════════════════");
  console.log("✨ Seed completado exitosamente");
  console.log("═══════════════════════════════════════════");
  console.log("\n📋 CREDENCIALES:\n");
  console.log("Super Admin:");
  console.log("  Email:    admin@alpaca.com");
  console.log("  Password: Admin123!\n");
  console.log("═══════════════════════════════════════════\n");
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Error:", e);
    await db.$disconnect();
    process.exit(1);
  });
