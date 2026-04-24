// src/lib/actions/schemas/support-ticket-schema.ts

import { z } from "zod";

const SupportStatusEnum = z.enum(["PENDING", "REVIEW", "PAUSED", "COMPLETED"]);

export const createSupportTicketSchema = z
  .object({
    clientId: z.string().min(1, "El cliente es requerido"),
    supportTypeId: z.string().min(1, "El tipo de soporte es requerido"),
    assignedById: z.string().min(1, "El asignador es requerido"),
    assignedToId: z.string().min(1, "El ingeniero encargado es requerido"),
    shortDescription: z
      .string()
      .min(1, "La descripción es requerida")
      .max(500, "La descripción no debe exceder 500 caracteres"),
    observations: z
      .string()
      .max(2000, "Las observaciones no deben exceder 2000 caracteres")
      .nullable()
      .optional(),
    startTime: z.date().nullable().optional(),
    endTime: z.date().nullable().optional(),
    manualHours: z
      .number()
      .positive("Las horas deben ser mayores a 0")
      .max(999, "Las horas no pueden exceder 999")
      .nullable()
      .optional(),
    status: SupportStatusEnum.optional(),
  })
  .refine(
    (data) =>
      !data.startTime || !data.endTime || data.endTime > data.startTime,
    {
      message: "La hora de fin debe ser posterior a la hora de inicio",
      path: ["endTime"],
    },
  );

export const updateSupportTicketSchema = createSupportTicketSchema
  .innerType()
  .partial()
  .extend({
    id: z.string().min(1, "El ID es requerido"),
  })
  .refine(
    (data) =>
      !data.startTime || !data.endTime || data.endTime > data.startTime,
    {
      message: "La hora de fin debe ser posterior a la hora de inicio",
      path: ["endTime"],
    },
  );

export const supportTicketFiltersSchema = z.object({
  search: z.string().optional(),
  clientId: z.string().optional(),
  supportTypeId: z.string().optional(),
  assignedToId: z.string().optional(),
  assignedById: z.string().optional(),
  status: SupportStatusEnum.optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
});

export const addDocumentSchema = z.object({
  supportTicketId: z.string().min(1),
  fileName: z
    .string()
    .min(1, "El nombre del archivo es requerido")
    .max(255),
  fileUrl: z.string().min(1, "La URL del archivo es requerida"),
  mimeType: z.string().nullable().optional(),
  fileSizeBytes: z
    .number()
    .int()
    .positive()
    .nullable()
    .optional(),
  uploadedById: z.string().min(1),
});

export type CreateSupportTicketInput = z.infer<typeof createSupportTicketSchema>;
export type UpdateSupportTicketInput = z.infer<typeof updateSupportTicketSchema>;
export type SupportTicketFiltersInput = z.infer<typeof supportTicketFiltersSchema>;
export type AddDocumentInput = z.infer<typeof addDocumentSchema>;
