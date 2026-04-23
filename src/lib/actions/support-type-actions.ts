// src/lib/actions/support-type-actions.ts

"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type {
  ActionResult,
  CreateSupportTypeDTO,
  SupportTypeWithRelations,
  UpdateSupportTypeDTO,
} from "./types/action-types";

class SupportTypeRepository {
  private readonly include = {
    _count: { select: { tickets: true } },
  };

  async create(data: CreateSupportTypeDTO) {
    return db.supportType.create({
      data: {
        name: data.name,
        description: data.description ?? null,
      },
      include: this.include,
    });
  }

  async update(id: string, data: Partial<UpdateSupportTypeDTO>) {
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.active !== undefined) updateData.active = data.active;

    return db.supportType.update({
      where: { id },
      data: updateData,
      include: this.include,
    });
  }

  async findById(id: string) {
    return db.supportType.findUnique({ where: { id }, include: this.include });
  }

  async findAll(onlyActive = false) {
    return db.supportType.findMany({
      where: onlyActive ? { active: true } : undefined,
      include: this.include,
      orderBy: { name: "asc" },
    });
  }

  async delete(id: string) {
    return db.supportType.delete({ where: { id } });
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
    const existing = await db.supportType.findUnique({
      where: { name: data.name },
    });

    if (existing && existing.id !== data.excludeId) {
      return {
        success: false,
        error: `Ya existe un tipo de soporte con el nombre "${data.name}"`,
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

class RequiredNameHandler extends ValidationHandler {
  protected async validate(
    data: CreateSupportTypeDTO,
  ): Promise<ActionResult<void>> {
    if (!data.name?.trim()) {
      return {
        success: false,
        error: "El nombre del tipo de soporte es requerido",
        code: "REQUIRED_NAME",
      };
    }
    return { success: true };
  }
}

class UniqueNameHandler extends ValidationHandler {
  private strategy = new UniqueNameValidationStrategy();

  protected async validate(
    data: CreateSupportTypeDTO | UpdateSupportTypeDTO,
  ): Promise<ActionResult<void>> {
    if (!data.name) return { success: true };
    return this.strategy.validate({
      name: data.name,
      excludeId: "id" in data ? data.id : undefined,
    });
  }
}

class SupportTypeService {
  private repository = new SupportTypeRepository();

  async createSupportType(
    dto: CreateSupportTypeDTO,
  ): Promise<ActionResult<SupportTypeWithRelations>> {
    try {
      const chain = new RequiredNameHandler();
      chain.setNext(new UniqueNameHandler());

      const validation = await chain.handle(dto);
      if (!validation.success)
        return validation as ActionResult<SupportTypeWithRelations>;

      const supportType = await this.repository.create(dto);

      revalidatePath("/dashboard/administration/support-types");

      return { success: true, data: supportType as SupportTypeWithRelations };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al crear tipo de soporte",
        code: "CREATE_ERROR",
      };
    }
  }

  async updateSupportType(
    dto: UpdateSupportTypeDTO,
  ): Promise<ActionResult<SupportTypeWithRelations>> {
    try {
      const existing = await this.repository.findById(dto.id);
      if (!existing) {
        return {
          success: false,
          error: "Tipo de soporte no encontrado",
          code: "NOT_FOUND",
        };
      }

      const chain = new UniqueNameHandler();
      const validation = await chain.handle(dto);
      if (!validation.success)
        return validation as ActionResult<SupportTypeWithRelations>;

      const supportType = await this.repository.update(dto.id, dto);

      revalidatePath("/dashboard/administration/support-types");

      return { success: true, data: supportType as SupportTypeWithRelations };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al actualizar tipo de soporte",
        code: "UPDATE_ERROR",
      };
    }
  }

  async getSupportTypeById(
    id: string,
  ): Promise<ActionResult<SupportTypeWithRelations>> {
    try {
      const supportType = await this.repository.findById(id);
      if (!supportType) {
        return {
          success: false,
          error: "Tipo de soporte no encontrado",
          code: "NOT_FOUND",
        };
      }
      return { success: true, data: supportType as SupportTypeWithRelations };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al obtener tipo de soporte",
        code: "FETCH_ERROR",
      };
    }
  }

  async getAllSupportTypes(
    onlyActive = false,
  ): Promise<ActionResult<SupportTypeWithRelations[]>> {
    try {
      const supportTypes = await this.repository.findAll(onlyActive);
      return {
        success: true,
        data: supportTypes as SupportTypeWithRelations[],
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al obtener tipos de soporte",
        code: "FETCH_ERROR",
      };
    }
  }

  async deleteSupportType(id: string): Promise<ActionResult> {
    try {
      const supportType = await this.repository.findById(id);
      if (!supportType) {
        return {
          success: false,
          error: "Tipo de soporte no encontrado",
          code: "NOT_FOUND",
        };
      }

      if (supportType._count.tickets > 0) {
        return {
          success: false,
          error:
            "No se puede eliminar un tipo de soporte con tickets asociados. Desactívelo en su lugar.",
          code: "HAS_TICKETS",
        };
      }

      await this.repository.delete(id);

      revalidatePath("/dashboard/administration/support-types");

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al eliminar tipo de soporte",
        code: "DELETE_ERROR",
      };
    }
  }
}

const supportTypeService = new SupportTypeService();

export async function createSupportType(dto: CreateSupportTypeDTO) {
  return supportTypeService.createSupportType(dto);
}

export async function updateSupportType(dto: UpdateSupportTypeDTO) {
  return supportTypeService.updateSupportType(dto);
}

export async function getSupportTypeById(id: string) {
  return supportTypeService.getSupportTypeById(id);
}

export async function getAllSupportTypes(onlyActive = false) {
  return supportTypeService.getAllSupportTypes(onlyActive);
}

export async function deleteSupportType(id: string) {
  return supportTypeService.deleteSupportType(id);
}
