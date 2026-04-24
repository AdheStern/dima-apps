// src/lib/actions/support-ticket-actions.ts

"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type {
  ActionResult,
  PaginatedResult,
  PaginationParams,
} from "./types/action-types";
import type {
  ClientConformityWithRelations,
  CreateSupportDocumentDTO,
  CreateSupportTicketDTO,
  SupportDocumentWithRelations,
  SupportTicketFilters,
  SupportTicketSummary,
  SupportTicketWithRelations,
  UpdateSupportTicketDTO,
} from "./types/support-ticket-types";

// biome-ignore lint/suspicious/noExplicitAny: Prisma.Decimal no disponible hasta prisma generate
const decimalToNumber = (d: any): number | null =>
  d != null ? Number(d.toString()) : null;

// ---- Cálculo de horas con horario laboral Bolivia (UTC-4, L-S 8:30–16:30) ----

const BOLIVIA_OFFSET_MS = -4 * 60 * 60 * 1000;
const OFFICE_OPEN_MIN = 8 * 60 + 30;   // 510 min desde medianoche
const OFFICE_CLOSE_MIN = 16 * 60 + 30; // 990 min desde medianoche

function toBoliviaDate(utcDate: Date): Date {
  return new Date(utcDate.getTime() + BOLIVIA_OFFSET_MS);
}

function ceilToHalfHour(minutes: number): number {
  if (minutes <= 0) return 0;
  return Math.ceil(minutes / 30) * 0.5;
}

function splitIntervalBolivia(
  startBol: Date,
  endBol: Date,
): { officeMin: number; extraMin: number } {
  if (startBol >= endBol) return { officeMin: 0, extraMin: 0 };

  const breakpoints: Date[] = [startBol];

  const cursor = new Date(startBol);
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= endBol) {
    const open = new Date(cursor);
    open.setHours(8, 30, 0, 0);
    if (open > startBol && open < endBol) breakpoints.push(new Date(open));

    const close = new Date(cursor);
    close.setHours(16, 30, 0, 0);
    if (close > startBol && close < endBol) breakpoints.push(new Date(close));

    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(0, 0, 0, 0);
    if (cursor > startBol && cursor < endBol) breakpoints.push(new Date(cursor));
  }

  breakpoints.push(endBol);
  breakpoints.sort((a, b) => a.getTime() - b.getTime());

  let officeMin = 0;
  let extraMin = 0;

  for (let i = 0; i < breakpoints.length - 1; i++) {
    const seg = breakpoints[i];
    const segEnd = breakpoints[i + 1];
    const durationMin = (segEnd.getTime() - seg.getTime()) / 60000;
    if (durationMin <= 0) continue;

    const midMs = (seg.getTime() + segEnd.getTime()) / 2;
    const mid = new Date(midMs);
    const day = mid.getDay();
    const minOfDay = mid.getHours() * 60 + mid.getMinutes();
    const inOffice =
      day >= 1 && day <= 6 && minOfDay >= OFFICE_OPEN_MIN && minOfDay < OFFICE_CLOSE_MIN;

    if (inOffice) officeMin += durationMin;
    else extraMin += durationMin;
  }

  return { officeMin, extraMin };
}

function calcHoursBreakdown(
  startTime: Date,
  endTime: Date,
  pauseLogs: { pausedAt: Date; resumedAt: Date | null }[],
): { totalHours: number; officeHours: number; extraHours: number } {
  const sorted = [...pauseLogs].sort(
    (a, b) => a.pausedAt.getTime() - b.pausedAt.getTime(),
  );

  const activeIntervals: [Date, Date][] = [];
  let current = new Date(startTime);

  for (const pause of sorted) {
    if (pause.pausedAt > current && pause.pausedAt <= endTime) {
      activeIntervals.push([current, pause.pausedAt]);
    }
    if (pause.resumedAt && pause.resumedAt > current) {
      current = pause.resumedAt;
    } else if (!pause.resumedAt) {
      current = new Date(endTime);
      break;
    }
  }

  if (current < endTime) activeIntervals.push([current, endTime]);

  let totalOfficeMin = 0;
  let totalExtraMin = 0;

  for (const [iStart, iEnd] of activeIntervals) {
    const { officeMin, extraMin } = splitIntervalBolivia(
      toBoliviaDate(iStart),
      toBoliviaDate(iEnd),
    );
    totalOfficeMin += officeMin;
    totalExtraMin += extraMin;
  }

  const officeHours = ceilToHalfHour(totalOfficeMin);
  const extraHours = ceilToHalfHour(totalExtraMin);
  return { totalHours: officeHours + extraHours, officeHours, extraHours };
}

const ticketInclude = {
  client: {
    select: {
      id: true,
      name: true,
      slaType: { select: { name: true, responseTimeHours: true } },
    },
  },
  supportType: { select: { id: true, name: true } },
  documents: {
    orderBy: { createdAt: "desc" as const },
  },
  pauseLogs: {
    orderBy: { pausedAt: "asc" as const },
    select: {
      id: true,
      pausedAt: true,
      resumedAt: true,
      reason: true,
    },
  },
  conformity: {
    include: {
      contact: { select: { id: true, name: true, email: true } },
    },
  },
};

class SupportTicketRepository {
  async generateTicketNumber(
    tx: typeof db,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `DIMA-${year}-`;

    const last = await tx.supportTicket.findFirst({
      where: { ticketNumber: { startsWith: prefix } },
      orderBy: { ticketNumber: "desc" },
      select: { ticketNumber: true },
    });

    const lastNum = last
      ? Number.parseInt(last.ticketNumber.replace(prefix, ""), 10)
      : 0;

    return `${prefix}${String(lastNum + 1).padStart(5, "0")}`;
  }

  async create(data: CreateSupportTicketDTO) {
    return db.$transaction(async (tx) => {
      const ticketNumber = await this.generateTicketNumber(tx as typeof db);

      return tx.supportTicket.create({
        data: {
          ticketNumber,
          clientId: data.clientId,
          supportTypeId: data.supportTypeId,
          assignedById: data.assignedById,
          assignedToId: data.assignedToId,
          shortDescription: data.shortDescription,
          observations: data.observations ?? null,
          startTime: data.startTime ?? null,
          endTime: data.endTime ?? null,
          manualHours: data.manualHours ?? null,
          status: data.status ?? "PENDING",
        },
        include: ticketInclude,
      });
    });
  }

  async update(id: string, data: Partial<UpdateSupportTicketDTO>) {
    const updateData: Record<string, unknown> = {};

    if (data.clientId !== undefined) updateData.clientId = data.clientId;
    if (data.supportTypeId !== undefined)
      updateData.supportTypeId = data.supportTypeId;
    if (data.assignedById !== undefined)
      updateData.assignedById = data.assignedById;
    if (data.assignedToId !== undefined)
      updateData.assignedToId = data.assignedToId;
    if (data.shortDescription !== undefined)
      updateData.shortDescription = data.shortDescription;
    if (data.observations !== undefined)
      updateData.observations = data.observations;
    if (data.startTime !== undefined) updateData.startTime = data.startTime;
    if (data.endTime !== undefined) updateData.endTime = data.endTime;
    if (data.manualHours !== undefined) updateData.manualHours = data.manualHours;
    if (data.status !== undefined) updateData.status = data.status;

    return db.supportTicket.update({
      where: { id },
      data: updateData,
      include: ticketInclude,
    });
  }

  async findById(id: string) {
    return db.supportTicket.findUnique({ where: { id }, include: ticketInclude });
  }

  async findMany(filters: SupportTicketFilters, pagination: PaginationParams) {
    const {
      page = 1,
      pageSize = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = pagination;

    const where = {
      ...(filters.search && {
        OR: [
          {
            shortDescription: {
              contains: filters.search,
              mode: "insensitive" as const,
            },
          },
          {
            ticketNumber: {
              contains: filters.search,
              mode: "insensitive" as const,
            },
          },
        ],
      }),
      ...(filters.clientId && { clientId: filters.clientId }),
      ...(filters.supportTypeId && { supportTypeId: filters.supportTypeId }),
      ...(filters.assignedToId && { assignedToId: filters.assignedToId }),
      ...(filters.assignedById && { assignedById: filters.assignedById }),
      ...(filters.status && { status: filters.status }),
      ...(filters.dateFrom || filters.dateTo
        ? {
            startTime: {
              ...(filters.dateFrom && { gte: filters.dateFrom }),
              ...(filters.dateTo && { lte: filters.dateTo }),
            },
          }
        : {}),
    };

    const summaryInclude = {
      client: { select: { id: true, name: true } },
      supportType: { select: { id: true, name: true } },
    };

    const [data, total] = await db.$transaction([
      db.supportTicket.findMany({
        where,
        include: summaryInclude,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.supportTicket.count({ where }),
    ]);

    return { data, total };
  }
}

class SupportDocumentRepository {
  async create(data: CreateSupportDocumentDTO) {
    return db.supportDocument.create({ data });
  }

  async findById(id: string) {
    return db.supportDocument.findUnique({ where: { id } });
  }

  async delete(id: string) {
    return db.supportDocument.delete({ where: { id } });
  }
}


class ConformityRepository {
  async create(supportTicketId: string, contactId?: string | null) {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

    return db.clientConformity.create({
      data: {
        supportTicketId,
        contactId: contactId ?? null,
        approvalToken: token,
        tokenExpiresAt: expiresAt,
        status: "PENDING",
      },
      include: {
        contact: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async findByTicketId(supportTicketId: string) {
    return db.clientConformity.findUnique({
      where: { supportTicketId },
      include: { contact: { select: { id: true, name: true, email: true } } },
    });
  }

  async findByToken(token: string) {
    return db.clientConformity.findUnique({
      where: { approvalToken: token },
      include: {
        supportTicket: {
          select: { id: true, ticketNumber: true, shortDescription: true },
        },
        contact: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async approve(token: string, notes?: string | null) {
    return db.clientConformity.update({
      where: { approvalToken: token },
      data: {
        status: "APPROVED",
        conformityDate: new Date(),
        approvalToken: null,
        tokenExpiresAt: null,
        notes: notes ?? null,
      },
    });
  }

  async reject(token: string, notes?: string | null) {
    return db.clientConformity.update({
      where: { approvalToken: token },
      data: {
        status: "REJECTED",
        conformityDate: new Date(),
        approvalToken: null,
        tokenExpiresAt: null,
        notes: notes ?? null,
      },
    });
  }
}

interface ValidationStrategy {
  validate(data: unknown): Promise<ActionResult<void>>;
}

class ClientExistsValidationStrategy implements ValidationStrategy {
  async validate(clientId: string): Promise<ActionResult<void>> {
    const client = await db.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return {
        success: false,
        error: "El cliente seleccionado no existe",
        code: "CLIENT_NOT_FOUND",
      };
    }
    if (!client.active) {
      return {
        success: false,
        error: "El cliente está inactivo",
        code: "CLIENT_INACTIVE",
      };
    }
    return { success: true };
  }
}

class SupportTypeExistsValidationStrategy implements ValidationStrategy {
  async validate(supportTypeId: string): Promise<ActionResult<void>> {
    const st = await db.supportType.findUnique({
      where: { id: supportTypeId },
    });
    if (!st) {
      return {
        success: false,
        error: "El tipo de soporte seleccionado no existe",
        code: "SUPPORT_TYPE_NOT_FOUND",
      };
    }
    if (!st.active) {
      return {
        success: false,
        error: "El tipo de soporte está inactivo",
        code: "SUPPORT_TYPE_INACTIVE",
      };
    }
    return { success: true };
  }
}

abstract class ValidationHandler {
  protected next: ValidationHandler | null = null;

  setNext(handler: ValidationHandler): ValidationHandler {
    this.next = handler;
    return handler;
  }

  async handle(data: unknown): Promise<ActionResult<void>> {
    const result = await this.validate(data);
    if (!result.success) return result;
    if (this.next) return this.next.handle(data);
    return { success: true };
  }

  protected abstract validate(data: unknown): Promise<ActionResult<void>>;
}

class RequiredFieldsHandler extends ValidationHandler {
  protected async validate(
    data: CreateSupportTicketDTO,
  ): Promise<ActionResult<void>> {
    if (!data.clientId)
      return {
        success: false,
        error: "El cliente es requerido",
        code: "REQUIRED_CLIENT",
      };
    if (!data.supportTypeId)
      return {
        success: false,
        error: "El tipo de soporte es requerido",
        code: "REQUIRED_SUPPORT_TYPE",
      };
    if (!data.assignedById)
      return {
        success: false,
        error: "El asignador es requerido",
        code: "REQUIRED_ASSIGNED_BY",
      };
    if (!data.assignedToId)
      return {
        success: false,
        error: "El ingeniero encargado es requerido",
        code: "REQUIRED_ASSIGNED_TO",
      };
    if (!data.shortDescription?.trim())
      return {
        success: false,
        error: "La descripción es requerida",
        code: "REQUIRED_DESCRIPTION",
      };
    return { success: true };
  }
}

class DateRangeHandler extends ValidationHandler {
  protected async validate(
    data: CreateSupportTicketDTO | UpdateSupportTicketDTO,
  ): Promise<ActionResult<void>> {
    if (data.startTime && data.endTime && data.endTime <= data.startTime) {
      return {
        success: false,
        error: "La hora de fin debe ser posterior a la hora de inicio",
        code: "INVALID_DATE_RANGE",
      };
    }
    return { success: true };
  }
}

class ClientExistsHandler extends ValidationHandler {
  private strategy = new ClientExistsValidationStrategy();

  protected async validate(
    data: CreateSupportTicketDTO | UpdateSupportTicketDTO,
  ): Promise<ActionResult<void>> {
    if (!data.clientId) return { success: true };
    return this.strategy.validate(data.clientId);
  }
}

class SupportTypeExistsHandler extends ValidationHandler {
  private strategy = new SupportTypeExistsValidationStrategy();

  protected async validate(
    data: CreateSupportTicketDTO | UpdateSupportTicketDTO,
  ): Promise<ActionResult<void>> {
    if (!data.supportTypeId) return { success: true };
    return this.strategy.validate(data.supportTypeId);
  }
}

class SupportTicketService {
  private ticketRepo = new SupportTicketRepository();
  private documentRepo = new SupportDocumentRepository();
  private conformityRepo = new ConformityRepository();

  // biome-ignore lint/suspicious/noExplicitAny: Prisma.Decimal no disponible hasta prisma generate
  private mapTicket(ticket: any) {
    if (!ticket) return ticket;
    return {
      ...ticket,
      manualHours: decimalToNumber(ticket.manualHours),
      calculatedHours: decimalToNumber(ticket.calculatedHours),
      totalHours: decimalToNumber(ticket.totalHours),
      officeHours: decimalToNumber(ticket.officeHours),
      extraHours: decimalToNumber(ticket.extraHours),
    };
  }

  async createSupportTicket(
    dto: CreateSupportTicketDTO,
  ): Promise<ActionResult<SupportTicketWithRelations>> {
    try {
      const chain = new RequiredFieldsHandler();
      chain
        .setNext(new DateRangeHandler())
        .setNext(new ClientExistsHandler())
        .setNext(new SupportTypeExistsHandler());

      const validation = await chain.handle(dto);
      if (!validation.success)
        return validation as ActionResult<SupportTicketWithRelations>;

      const ticket = await this.ticketRepo.create(dto);

      revalidatePath("/dashboard/tickets");

      // biome-ignore lint/suspicious/noExplicitAny: Prisma types pending generate
      return { success: true, data: this.mapTicket(ticket as any) as unknown as SupportTicketWithRelations };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Error al crear el soporte",
        code: "CREATE_ERROR",
      };
    }
  }

  async updateSupportTicket(
    dto: UpdateSupportTicketDTO,
  ): Promise<ActionResult<SupportTicketWithRelations>> {
    try {
      const existing = await this.ticketRepo.findById(dto.id);
      if (!existing) {
        return {
          success: false,
          error: "Soporte no encontrado",
          code: "NOT_FOUND",
        };
      }

      if (existing.status === "COMPLETED") {
        return {
          success: false,
          error: "No se puede modificar un soporte completado",
          code: "TICKET_COMPLETED",
        };
      }

      const chain = new DateRangeHandler();
      chain.setNext(new ClientExistsHandler()).setNext(new SupportTypeExistsHandler());

      const validation = await chain.handle(dto);
      if (!validation.success)
        return validation as ActionResult<SupportTicketWithRelations>;

      const ticket = await this.ticketRepo.update(dto.id, dto);

      revalidatePath("/dashboard/tickets");
      revalidatePath(`/dashboard/tickets/${dto.id}`);

      // biome-ignore lint/suspicious/noExplicitAny: Prisma types pending generate
      return { success: true, data: this.mapTicket(ticket as any) as unknown as SupportTicketWithRelations };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al actualizar el soporte",
        code: "UPDATE_ERROR",
      };
    }
  }

  async startTicket(
    id: string,
    startTime?: Date,
  ): Promise<ActionResult<SupportTicketWithRelations>> {
    try {
      const ticket = await this.ticketRepo.findById(id);
      if (!ticket) {
        return {
          success: false,
          error: "Soporte no encontrado",
          code: "NOT_FOUND",
        };
      }

      if (ticket.status !== "PENDING") {
        return {
          success: false,
          error: "Solo se pueden iniciar soportes en estado pendiente",
          code: "INVALID_STATUS",
        };
      }

      const updated = await this.ticketRepo.update(id, {
        startTime: startTime ?? new Date(),
        status: "REVIEW",
      });

      revalidatePath("/dashboard/tickets");
      revalidatePath(`/dashboard/tickets/${id}`);

      // biome-ignore lint/suspicious/noExplicitAny: Prisma types pending generate
      return { success: true, data: this.mapTicket(updated as any) as unknown as SupportTicketWithRelations };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Error al iniciar el soporte",
        code: "UPDATE_ERROR",
      };
    }
  }

  async pauseTicket(
    id: string,
    reason?: string,
  ): Promise<ActionResult<SupportTicketWithRelations>> {
    try {
      const ticket = await this.ticketRepo.findById(id);
      if (!ticket) {
        return {
          success: false,
          error: "Soporte no encontrado",
          code: "NOT_FOUND",
        };
      }

      if (ticket.status !== "REVIEW") {
        return {
          success: false,
          error: "Solo se pueden pausar soportes en estado de revisión",
          code: "INVALID_STATUS",
        };
      }

      await db.supportPauseLog.create({
        data: { supportTicketId: id, pausedAt: new Date(), reason: reason ?? null },
      });

      const updated = await this.ticketRepo.update(id, { status: "PAUSED" });

      revalidatePath("/dashboard/tickets");
      revalidatePath(`/dashboard/tickets/${id}`);

      // biome-ignore lint/suspicious/noExplicitAny: Prisma types pending generate
      return { success: true, data: this.mapTicket(updated as any) as unknown as SupportTicketWithRelations };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Error al pausar el soporte",
        code: "UPDATE_ERROR",
      };
    }
  }

  async resumeTicket(id: string): Promise<ActionResult<SupportTicketWithRelations>> {
    try {
      const ticket = await this.ticketRepo.findById(id);
      if (!ticket) {
        return {
          success: false,
          error: "Soporte no encontrado",
          code: "NOT_FOUND",
        };
      }

      if (ticket.status !== "PAUSED") {
        return {
          success: false,
          error: "Solo se pueden reanudar soportes pausados",
          code: "INVALID_STATUS",
        };
      }

      // Cierra el último log de pausa activo
      await db.supportPauseLog.updateMany({
        where: { supportTicketId: id, resumedAt: null },
        data: { resumedAt: new Date() },
      });

      const updated = await this.ticketRepo.update(id, { status: "REVIEW" });

      revalidatePath("/dashboard/tickets");
      revalidatePath(`/dashboard/tickets/${id}`);

      // biome-ignore lint/suspicious/noExplicitAny: Prisma types pending generate
      return { success: true, data: this.mapTicket(updated as any) as unknown as SupportTicketWithRelations };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al reanudar el soporte",
        code: "UPDATE_ERROR",
      };
    }
  }

  async completeTicket(id: string): Promise<ActionResult<SupportTicketWithRelations>> {
    try {
      const ticket = await this.ticketRepo.findById(id);
      if (!ticket) {
        return { success: false, error: "Soporte no encontrado", code: "NOT_FOUND" };
      }

      if (ticket.status === "COMPLETED") {
        return { success: false, error: "El soporte ya está completado", code: "ALREADY_COMPLETED" };
      }

      const now = new Date();

      // Cierra cualquier pausa activa
      await db.supportPauseLog.updateMany({
        where: { supportTicketId: id, resumedAt: null },
        data: { resumedAt: now },
      });

      const effectiveEndTime = ticket.endTime ?? now;

      const pauseLogs = await db.supportPauseLog.findMany({
        where: { supportTicketId: id },
        select: { pausedAt: true, resumedAt: true },
      });

      // biome-ignore lint/suspicious/noExplicitAny: Prisma.Decimal no disponible hasta prisma generate
      const existingManualHours = decimalToNumber((ticket as any).manualHours);

      let totalHours: number;
      let officeHours: number | null = null;
      let extraHours: number | null = null;
      let calculatedHours: number | null = null;

      if (existingManualHours != null) {
        // Horas manuales ya fijadas: úsalas directamente (sin desglose oficina/extra)
        totalHours = existingManualHours;
      } else if (ticket.startTime) {
        const breakdown = calcHoursBreakdown(ticket.startTime, effectiveEndTime, pauseLogs);
        totalHours = breakdown.totalHours;
        officeHours = breakdown.officeHours;
        extraHours = breakdown.extraHours;
        calculatedHours = breakdown.totalHours;
      } else {
        return {
          success: false,
          error: "El ticket no tiene tiempo de inicio. Use 'Iniciar' antes de completar.",
          code: "NO_START_TIME",
        };
      }

      const updated = await db.supportTicket.update({
        where: { id },
        data: {
          endTime: effectiveEndTime,
          status: "COMPLETED",
          calculatedHours: calculatedHours ?? undefined,
          totalHours,
          officeHours: officeHours ?? undefined,
          extraHours: extraHours ?? undefined,
        },
        include: ticketInclude,
      });

      revalidatePath("/dashboard/tickets");
      revalidatePath(`/dashboard/tickets/${id}`);

      // biome-ignore lint/suspicious/noExplicitAny: Prisma types pending generate
      return { success: true, data: this.mapTicket(updated as any) as unknown as SupportTicketWithRelations };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al completar el soporte",
        code: "UPDATE_ERROR",
      };
    }
  }

  async addDocument(
    dto: CreateSupportDocumentDTO,
  ): Promise<ActionResult<SupportDocumentWithRelations>> {
    try {
      const ticket = await db.supportTicket.findUnique({
        where: { id: dto.supportTicketId },
        select: { id: true },
      });
      if (!ticket) {
        return {
          success: false,
          error: "Soporte no encontrado",
          code: "NOT_FOUND",
        };
      }

      const doc = await this.documentRepo.create(dto);

      revalidatePath(`/dashboard/tickets/${dto.supportTicketId}`);

      return { success: true, data: doc as SupportDocumentWithRelations };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Error al adjuntar documento",
        code: "CREATE_ERROR",
      };
    }
  }

  async removeDocument(id: string): Promise<ActionResult> {
    try {
      const doc = await this.documentRepo.findById(id);
      if (!doc) {
        return {
          success: false,
          error: "Documento no encontrado",
          code: "NOT_FOUND",
        };
      }

      await this.documentRepo.delete(id);

      revalidatePath(`/dashboard/tickets/${doc.supportTicketId}`);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Error al eliminar documento",
        code: "DELETE_ERROR",
      };
    }
  }

  async requestConformity(
    supportTicketId: string,
    contactId?: string | null,
  ): Promise<ActionResult<ClientConformityWithRelations>> {
    try {
      const ticket = await db.supportTicket.findUnique({
        where: { id: supportTicketId },
        select: { id: true, status: true },
      });

      if (!ticket) {
        return {
          success: false,
          error: "Soporte no encontrado",
          code: "NOT_FOUND",
        };
      }

      if (ticket.status !== "COMPLETED") {
        return {
          success: false,
          error: "Solo se puede solicitar conformidad de soportes completados",
          code: "TICKET_NOT_COMPLETED",
        };
      }

      const existing = await this.conformityRepo.findByTicketId(supportTicketId);
      if (existing?.status === "APPROVED") {
        return {
          success: false,
          error: "El soporte ya tiene conformidad aprobada",
          code: "ALREADY_APPROVED",
        };
      }

      // Si ya existe, regenera el token actualizando el registro
      if (existing) {
        const token = randomBytes(32).toString("hex");
        const updated = await db.clientConformity.update({
          where: { supportTicketId },
          data: {
            contactId: contactId ?? existing.contactId,
            approvalToken: token,
            tokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            status: "PENDING",
          },
          include: {
            contact: { select: { id: true, name: true, email: true } },
          },
        });
        return {
          success: true,
          data: updated as unknown as ClientConformityWithRelations,
        };
      }

      const conformity = await this.conformityRepo.create(
        supportTicketId,
        contactId,
      );

      revalidatePath(`/dashboard/tickets/${supportTicketId}`);

      return {
        success: true,
        data: conformity as unknown as ClientConformityWithRelations,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al solicitar conformidad",
        code: "CREATE_ERROR",
      };
    }
  }

  async approveConformity(
    token: string,
    notes?: string | null,
  ): Promise<ActionResult> {
    try {
      const conformity = await this.conformityRepo.findByToken(token);

      if (!conformity) {
        return {
          success: false,
          error: "Token de conformidad inválido o no encontrado",
          code: "INVALID_TOKEN",
        };
      }

      if (conformity.tokenExpiresAt && conformity.tokenExpiresAt < new Date()) {
        return {
          success: false,
          error: "El token de conformidad ha expirado",
          code: "TOKEN_EXPIRED",
        };
      }

      await this.conformityRepo.approve(token, notes);

      revalidatePath(`/dashboard/tickets/${conformity.supportTicketId}`);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al aprobar conformidad",
        code: "UPDATE_ERROR",
      };
    }
  }

  async rejectConformity(
    token: string,
    notes?: string | null,
  ): Promise<ActionResult> {
    try {
      const conformity = await this.conformityRepo.findByToken(token);

      if (!conformity) {
        return {
          success: false,
          error: "Token de conformidad inválido o no encontrado",
          code: "INVALID_TOKEN",
        };
      }

      if (conformity.tokenExpiresAt && conformity.tokenExpiresAt < new Date()) {
        return {
          success: false,
          error: "El token de conformidad ha expirado",
          code: "TOKEN_EXPIRED",
        };
      }

      await this.conformityRepo.reject(token, notes);

      revalidatePath(`/dashboard/tickets/${conformity.supportTicketId}`);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al rechazar conformidad",
        code: "UPDATE_ERROR",
      };
    }
  }

  async getSupportTicketById(
    id: string,
  ): Promise<ActionResult<SupportTicketWithRelations>> {
    try {
      const ticket = await this.ticketRepo.findById(id);
      if (!ticket) {
        return {
          success: false,
          error: "Soporte no encontrado",
          code: "NOT_FOUND",
        };
      }
      // biome-ignore lint/suspicious/noExplicitAny: Prisma types pending generate
      return { success: true, data: this.mapTicket(ticket as any) as unknown as SupportTicketWithRelations };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Error al obtener el soporte",
        code: "FETCH_ERROR",
      };
    }
  }

  async getSupportTickets(
    filters: SupportTicketFilters = {},
    pagination: PaginationParams = {},
  ): Promise<ActionResult<PaginatedResult<SupportTicketSummary>>> {
    try {
      const { data, total } = await this.ticketRepo.findMany(
        filters,
        pagination,
      );
      const { page = 1, pageSize = 20 } = pagination;

      // biome-ignore lint/suspicious/noExplicitAny: Prisma.Decimal no disponible hasta prisma generate
      const mapped = data.map((t) => this.mapTicket(t as any));

      return {
        success: true,
        data: {
          data: mapped as unknown as SupportTicketSummary[],
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Error al obtener soportes",
        code: "FETCH_ERROR",
      };
    }
  }
}

const supportTicketService = new SupportTicketService();

export async function createSupportTicket(dto: CreateSupportTicketDTO) {
  return supportTicketService.createSupportTicket(dto);
}

export async function updateSupportTicket(dto: UpdateSupportTicketDTO) {
  return supportTicketService.updateSupportTicket(dto);
}

export async function startTicket(id: string, startTime?: Date) {
  return supportTicketService.startTicket(id, startTime);
}

export async function pauseTicket(id: string, reason?: string) {
  return supportTicketService.pauseTicket(id, reason);
}

export async function resumeTicket(id: string) {
  return supportTicketService.resumeTicket(id);
}

export async function completeTicket(id: string) {
  return supportTicketService.completeTicket(id);
}

export async function addSupportDocument(dto: CreateSupportDocumentDTO) {
  return supportTicketService.addDocument(dto);
}

export async function removeSupportDocument(id: string) {
  return supportTicketService.removeDocument(id);
}

export async function requestConformity(
  supportTicketId: string,
  contactId?: string | null,
) {
  return supportTicketService.requestConformity(supportTicketId, contactId);
}

export async function approveConformity(token: string, notes?: string | null) {
  return supportTicketService.approveConformity(token, notes);
}

export async function rejectConformity(token: string, notes?: string | null) {
  return supportTicketService.rejectConformity(token, notes);
}

export async function getSupportTicketById(id: string) {
  return supportTicketService.getSupportTicketById(id);
}

export async function getSupportTickets(
  filters?: SupportTicketFilters,
  pagination?: PaginationParams,
) {
  return supportTicketService.getSupportTickets(filters, pagination);
}
