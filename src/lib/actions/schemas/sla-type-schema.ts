// src/lib/actions/schemas/sla-type-schema.ts

import { z } from "zod";

export const createSlaTypeSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(50, "El nombre no debe exceder 50 caracteres"),
  description: z
    .string()
    .max(200, "La descripción no debe exceder 200 caracteres")
    .nullable()
    .optional(),
  hoursPerDay: z
    .number({ message: "Debe ser un número" })
    .int("Debe ser un número entero")
    .min(1, "Mínimo 1 hora por día")
    .max(24, "Máximo 24 horas por día"),
  daysPerWeek: z
    .number({ message: "Debe ser un número" })
    .int("Debe ser un número entero")
    .min(1, "Mínimo 1 día por semana")
    .max(7, "Máximo 7 días por semana"),
  responseTimeHours: z
    .number({ message: "Debe ser un número" })
    .int("Debe ser un número entero")
    .min(1, "El tiempo de respuesta debe ser al menos 1 hora"),
});

export const updateSlaTypeSchema = createSlaTypeSchema.partial().extend({
  id: z.string().min(1, "El ID es requerido"),
});

export type CreateSlaTypeInput = z.infer<typeof createSlaTypeSchema>;
export type UpdateSlaTypeInput = z.infer<typeof updateSlaTypeSchema>;
