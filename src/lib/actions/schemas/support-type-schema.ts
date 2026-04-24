// src/lib/actions/schemas/support-type-schema.ts

import { z } from "zod";

export const createSupportTypeSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(100, "El nombre no debe exceder 100 caracteres"),
  description: z
    .string()
    .max(300, "La descripción no debe exceder 300 caracteres")
    .nullable()
    .optional(),
});

export const updateSupportTypeSchema = createSupportTypeSchema.partial().extend({
  id: z.string().min(1, "El ID es requerido"),
  active: z.boolean().optional(),
});

export type CreateSupportTypeInput = z.infer<typeof createSupportTypeSchema>;
export type UpdateSupportTypeInput = z.infer<typeof updateSupportTypeSchema>;
