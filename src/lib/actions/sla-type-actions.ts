// src/lib/actions/sla-type-actions.ts

"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type {
  ActionResult,
  CreateSlaTypeDTO,
  SlaTypeWithRelations,
  UpdateSlaTypeDTO,
} from "./types/action-types";

class SlaTypeRepository {
  private readonly include = {
    _count: { select: { clients: true } },
  };

  async create(data: CreateSlaTypeDTO) {
    return db.slaType.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        hoursPerDay: data.hoursPerDay,
        daysPerWeek: data.daysPerWeek,
        responseTimeHours: data.responseTimeHours,
      },
      include: this.include,
    });
  }

  async update(id: string, data: Partial<UpdateSlaTypeDTO>) {
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.hoursPerDay !== undefined) updateData.hoursPerDay = data.hoursPerDay;
    if (data.daysPerWeek !== undefined) updateData.daysPerWeek = data.daysPerWeek;
    if (data.responseTimeHours !== undefined)
      updateData.responseTimeHours = data.responseTimeHours;

    return db.slaType.update({
      where: { id },
      data: updateData,
      include: this.include,
    });
  }

  async findById(id: string) {
    return db.slaType.findUnique({ where: { id }, include: this.include });
  }

  async findByName(name: string) {
    return db.slaType.findUnique({ where: { name } });
  }

  async findAll() {
    return db.slaType.findMany({
      include: this.include,
      orderBy: { name: "asc" },
    });
  }

  async delete(id: string) {
    return db.slaType.delete({ where: { id } });
  }
}

interface ValidationStrategy {
  validate(data: unknown): Promise<ActionResult<void>>;
}

class UniqueNameValidationStrategy implements ValidationStrategy {
  async validate(data: {
    name: string;
    excludeId?: string;
  }): Promise<ActionResult<void>> {
    const existing = await db.slaType.findUnique({
      where: { name: data.name },
    });

    if (existing && existing.id !== data.excludeId) {
      return {
        success: false,
        error: `Ya existe un tipo de SLA con el nombre "${data.name}"`,
        code: "DUPLICATE_NAME",
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
    data: CreateSlaTypeDTO,
  ): Promise<ActionResult<void>> {
    if (!data.name?.trim()) {
      return {
        success: false,
        error: "El nombre del tipo de SLA es requerido",
        code: "REQUIRED_NAME",
      };
    }
    if (!data.hoursPerDay || data.hoursPerDay < 1 || data.hoursPerDay > 24) {
      return {
        success: false,
        error: "Las horas por día deben estar entre 1 y 24",
        code: "INVALID_HOURS_PER_DAY",
      };
    }
    if (!data.daysPerWeek || data.daysPerWeek < 1 || data.daysPerWeek > 7) {
      return {
        success: false,
        error: "Los días por semana deben estar entre 1 y 7",
        code: "INVALID_DAYS_PER_WEEK",
      };
    }
    return { success: true };
  }
}

class UniqueNameHandler extends ValidationHandler {
  private strategy = new UniqueNameValidationStrategy();

  protected async validate(
    data: CreateSlaTypeDTO | UpdateSlaTypeDTO,
  ): Promise<ActionResult<void>> {
    if (!data.name) return { success: true };
    return this.strategy.validate({
      name: data.name,
      excludeId: "id" in data ? data.id : undefined,
    });
  }
}

class SlaTypeService {
  private repository = new SlaTypeRepository();

  async createSlaType(
    dto: CreateSlaTypeDTO,
  ): Promise<ActionResult<SlaTypeWithRelations>> {
    try {
      const chain = new RequiredFieldsHandler();
      chain.setNext(new UniqueNameHandler());

      const validation = await chain.handle(dto);
      if (!validation.success)
        return validation as ActionResult<SlaTypeWithRelations>;

      const slaType = await this.repository.create(dto);

      revalidatePath("/dashboard/administration/sla-types");

      return { success: true, data: slaType as SlaTypeWithRelations };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Error al crear tipo de SLA",
        code: "CREATE_ERROR",
      };
    }
  }

  async updateSlaType(
    dto: UpdateSlaTypeDTO,
  ): Promise<ActionResult<SlaTypeWithRelations>> {
    try {
      const existing = await this.repository.findById(dto.id);
      if (!existing) {
        return {
          success: false,
          error: "Tipo de SLA no encontrado",
          code: "NOT_FOUND",
        };
      }

      const chain = new UniqueNameHandler();
      const validation = await chain.handle(dto);
      if (!validation.success)
        return validation as ActionResult<SlaTypeWithRelations>;

      const slaType = await this.repository.update(dto.id, dto);

      revalidatePath("/dashboard/administration/sla-types");

      return { success: true, data: slaType as SlaTypeWithRelations };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al actualizar tipo de SLA",
        code: "UPDATE_ERROR",
      };
    }
  }

  async getSlaTypeById(id: string): Promise<ActionResult<SlaTypeWithRelations>> {
    try {
      const slaType = await this.repository.findById(id);
      if (!slaType) {
        return {
          success: false,
          error: "Tipo de SLA no encontrado",
          code: "NOT_FOUND",
        };
      }
      return { success: true, data: slaType as SlaTypeWithRelations };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al obtener tipo de SLA",
        code: "FETCH_ERROR",
      };
    }
  }

  async getAllSlaTypes(): Promise<ActionResult<SlaTypeWithRelations[]>> {
    try {
      const slaTypes = await this.repository.findAll();
      return { success: true, data: slaTypes as SlaTypeWithRelations[] };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al obtener tipos de SLA",
        code: "FETCH_ERROR",
      };
    }
  }

  async deleteSlaType(id: string): Promise<ActionResult> {
    try {
      const slaType = await this.repository.findById(id);
      if (!slaType) {
        return {
          success: false,
          error: "Tipo de SLA no encontrado",
          code: "NOT_FOUND",
        };
      }

      if (slaType._count.clients > 0) {
        return {
          success: false,
          error: "No se puede eliminar un tipo de SLA asignado a clientes",
          code: "HAS_CLIENTS",
        };
      }

      await this.repository.delete(id);

      revalidatePath("/dashboard/administration/sla-types");

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al eliminar tipo de SLA",
        code: "DELETE_ERROR",
      };
    }
  }
}

const slaTypeService = new SlaTypeService();

export async function createSlaType(dto: CreateSlaTypeDTO) {
  return slaTypeService.createSlaType(dto);
}

export async function updateSlaType(dto: UpdateSlaTypeDTO) {
  return slaTypeService.updateSlaType(dto);
}

export async function getSlaTypeById(id: string) {
  return slaTypeService.getSlaTypeById(id);
}

export async function getAllSlaTypes() {
  return slaTypeService.getAllSlaTypes();
}

export async function deleteSlaType(id: string) {
  return slaTypeService.deleteSlaType(id);
}
