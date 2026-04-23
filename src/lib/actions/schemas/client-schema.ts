// src/lib/actions/schemas/client-schema.ts

import { z } from "zod";

export const createClientSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre del cliente es requerido")
    .max(150, "El nombre no debe exceder 150 caracteres"),
  ruc: z
    .string()
    .max(20, "El RUC no debe exceder 20 caracteres")
    .nullable()
    .optional(),
  email: z
    .string()
    .email("Formato de email inválido")
    .nullable()
    .optional(),
  phone: z
    .string()
    .max(20, "El teléfono no debe exceder 20 caracteres")
    .nullable()
    .optional(),
  address: z
    .string()
    .max(300, "La dirección no debe exceder 300 caracteres")
    .nullable()
    .optional(),
  slaTypeId: z.string().min(1, "El tipo de SLA es requerido"),
});

export const updateClientSchema = createClientSchema.partial().extend({
  id: z.string().min(1, "El ID es requerido"),
  active: z.boolean().optional(),
});

export const createClientContactSchema = z.object({
  clientId: z.string().min(1, "El cliente es requerido"),
  name: z
    .string()
    .min(1, "El nombre del contacto es requerido")
    .max(100, "El nombre no debe exceder 100 caracteres"),
  position: z
    .string()
    .max(100, "El cargo no debe exceder 100 caracteres")
    .nullable()
    .optional(),
  email: z.string().email("Formato de email inválido"),
  phone: z
    .string()
    .max(20, "El teléfono no debe exceder 20 caracteres")
    .nullable()
    .optional(),
  isPrimary: z.boolean().optional(),
});

export const updateClientContactSchema = createClientContactSchema
  .omit({ clientId: true })
  .partial()
  .extend({
    id: z.string().min(1, "El ID es requerido"),
  });

export const createHourPackageSchema = z.object({
  clientId: z.string().min(1, "El cliente es requerido"),
  hours: z
    .number({ message: "Debe ser un número" })
    .positive("Las horas deben ser mayores a 0")
    .max(9999, "El paquete no puede exceder 9999 horas"),
  purchaseDate: z.date().optional(),
  expiryDate: z.date().nullable().optional(),
  invoiceRef: z
    .string()
    .max(100, "La referencia no debe exceder 100 caracteres")
    .nullable()
    .optional(),
  notes: z
    .string()
    .max(500, "Las notas no deben exceder 500 caracteres")
    .nullable()
    .optional(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type CreateClientContactInput = z.infer<typeof createClientContactSchema>;
export type UpdateClientContactInput = z.infer<typeof updateClientContactSchema>;
export type CreateHourPackageInput = z.infer<typeof createHourPackageSchema>;
