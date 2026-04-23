// src/lib/actions/department-actions.ts

"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type {
  ActionResult,
  CreateDepartmentDTO,
  DepartmentDetail,
  DepartmentNode,
  DepartmentWithRelations,
  UpdateDepartmentDTO,
} from "./types/action-types";

class DepartmentRepository {
  private readonly include = {
    parent: { select: { id: true, name: true } },
    children: { select: { id: true, name: true } },
    _count: { select: { users: true } },
  };

  async create(data: CreateDepartmentDTO) {
    return db.department.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        parentId: data.parentId ?? null,
      },
      include: this.include,
    });
  }

  async update(id: string, data: Partial<UpdateDepartmentDTO>) {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.parentId !== undefined) updateData.parentId = data.parentId;

    return db.department.update({
      where: { id },
      data: updateData,
      include: this.include,
    });
  }

  async findById(id: string) {
    return db.department.findUnique({
      where: { id },
      include: {
        ...this.include,
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  async findAll() {
    return db.department.findMany({
      include: this.include,
      orderBy: { name: "asc" },
    });
  }

  async delete(id: string) {
    return db.department.delete({ where: { id } });
  }

  async getHierarchy(): Promise<DepartmentNode[]> {
    const departments = await db.department.findMany({
      include: {
        _count: { select: { users: true } },
      },
    });

    const departmentMap = new Map<string, DepartmentNode>();

    for (const dept of departments) {
      departmentMap.set(dept.id, {
        id: dept.id,
        name: dept.name,
        description: dept.description,
        parentId: dept.parentId,
        children: [],
        userCount: dept._count.users,
      });
    }

    const rootDepartments: DepartmentNode[] = [];

    for (const dept of departments) {
      const node = departmentMap.get(dept.id);
      if (!node) continue;

      if (dept.parentId) {
        const parentNode = departmentMap.get(dept.parentId);
        if (parentNode) {
          parentNode.children.push(node);
        }
      } else {
        rootDepartments.push(node);
      }
    }

    return rootDepartments;
  }
}

interface ValidationStrategy {
  validate(data: unknown): Promise<ActionResult<void>>;
}

class CircularHierarchyValidationStrategy implements ValidationStrategy {
  async validate(data: {
    departmentId: string;
    parentId: string;
  }): Promise<ActionResult<void>> {
    let currentParentId: string | null = data.parentId;
    const visitedIds = new Set<string>([data.departmentId]);

    while (currentParentId) {
      if (visitedIds.has(currentParentId)) {
        return {
          success: false,
          error: "Se detectó una referencia circular en la jerarquía",
          code: "CIRCULAR_HIERARCHY",
        };
      }

      visitedIds.add(currentParentId);

      const parentDept: { parentId: string | null } | null =
        await db.department.findUnique({
          where: { id: currentParentId },
          select: { parentId: true },
        });

      currentParentId = parentDept?.parentId ?? null;
    }

    return { success: true };
  }
}

class ParentExistenceValidationStrategy implements ValidationStrategy {
  async validate(parentId: string): Promise<ActionResult<void>> {
    const parentDept = await db.department.findUnique({
      where: { id: parentId },
    });

    if (!parentDept) {
      return {
        success: false,
        error: "El departamento padre no existe",
        code: "PARENT_NOT_FOUND",
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

    if (!result.success) {
      return result;
    }

    if (this.next) {
      return this.next.handle(data);
    }

    return { success: true };
  }

  protected abstract validate(data: unknown): Promise<ActionResult<void>>;
}

class RequiredNameHandler extends ValidationHandler {
  protected async validate(
    data: CreateDepartmentDTO | UpdateDepartmentDTO,
  ): Promise<ActionResult<void>> {
    if ("name" in data && (!data.name || !data.name.trim())) {
      return {
        success: false,
        error: "El nombre del departamento es requerido",
        code: "REQUIRED_NAME",
      };
    }

    return { success: true };
  }
}

class ParentExistenceHandler extends ValidationHandler {
  private strategy = new ParentExistenceValidationStrategy();

  protected async validate(
    data: CreateDepartmentDTO | UpdateDepartmentDTO,
  ): Promise<ActionResult<void>> {
    if (!data.parentId) {
      return { success: true };
    }

    return this.strategy.validate(data.parentId);
  }
}

class CircularHierarchyHandler extends ValidationHandler {
  private strategy = new CircularHierarchyValidationStrategy();

  protected async validate(
    data: UpdateDepartmentDTO,
  ): Promise<ActionResult<void>> {
    if (!data.parentId) {
      return { success: true };
    }

    return this.strategy.validate({
      departmentId: data.id,
      parentId: data.parentId,
    });
  }
}

class DepartmentService {
  private repository = new DepartmentRepository();

  async createDepartment(
    dto: CreateDepartmentDTO,
  ): Promise<ActionResult<DepartmentWithRelations>> {
    try {
      const validationChain = new RequiredNameHandler();
      validationChain.setNext(new ParentExistenceHandler());

      const validationResult = await validationChain.handle(dto);

      if (!validationResult.success) {
        return validationResult as ActionResult<DepartmentWithRelations>;
      }

      const department = await this.repository.create(dto);

      revalidatePath("/dashboard/admin/departments");

      return {
        success: true,
        data: department as DepartmentWithRelations,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al crear departamento",
        code: "CREATE_ERROR",
      };
    }
  }

  async updateDepartment(
    dto: UpdateDepartmentDTO,
  ): Promise<ActionResult<DepartmentWithRelations>> {
    try {
      const validationChain = new RequiredNameHandler();
      validationChain
        .setNext(new ParentExistenceHandler())
        .setNext(new CircularHierarchyHandler());

      const validationResult = await validationChain.handle(dto);

      if (!validationResult.success) {
        return validationResult as ActionResult<DepartmentWithRelations>;
      }

      const department = await this.repository.update(dto.id, dto);

      revalidatePath("/dashboard/admin/departments");

      return {
        success: true,
        data: department as DepartmentWithRelations,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al actualizar departamento",
        code: "UPDATE_ERROR",
      };
    }
  }

  async getDepartmentById(id: string): Promise<ActionResult<DepartmentDetail>> {
    try {
      const department = await this.repository.findById(id);

      if (!department) {
        return {
          success: false,
          error: "Departamento no encontrado",
          code: "NOT_FOUND",
        };
      }

      return {
        success: true,
        data: department as DepartmentDetail,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al obtener departamento",
        code: "FETCH_ERROR",
      };
    }
  }

  async getAllDepartments(): Promise<ActionResult<DepartmentWithRelations[]>> {
    try {
      const departments = await this.repository.findAll();

      return {
        success: true,
        data: departments as DepartmentWithRelations[],
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al obtener departamentos",
        code: "FETCH_ERROR",
      };
    }
  }

  async getDepartmentHierarchy(): Promise<ActionResult<DepartmentNode[]>> {
    try {
      const hierarchy = await this.repository.getHierarchy();

      return {
        success: true,
        data: hierarchy,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Error al obtener jerarquía",
        code: "FETCH_ERROR",
      };
    }
  }

  async deleteDepartment(id: string): Promise<ActionResult> {
    try {
      const department = await this.repository.findById(id);

      if (!department) {
        return {
          success: false,
          error: "Departamento no encontrado",
          code: "NOT_FOUND",
        };
      }

      if (department._count.users > 0) {
        return {
          success: false,
          error: "No se puede eliminar un departamento con usuarios asignados",
          code: "HAS_USERS",
        };
      }

      if (department.children.length > 0) {
        return {
          success: false,
          error: "No se puede eliminar un departamento con subdepartamentos",
          code: "HAS_CHILDREN",
        };
      }

      await this.repository.delete(id);

      revalidatePath("/dashboard/admin/departments");

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al eliminar departamento",
        code: "DELETE_ERROR",
      };
    }
  }
}

const departmentService = new DepartmentService();

export async function createDepartment(dto: CreateDepartmentDTO) {
  return departmentService.createDepartment(dto);
}

export async function updateDepartment(dto: UpdateDepartmentDTO) {
  return departmentService.updateDepartment(dto);
}

export async function getDepartmentById(id: string) {
  return departmentService.getDepartmentById(id);
}

export async function getAllDepartments() {
  return departmentService.getAllDepartments();
}

export async function getDepartmentHierarchy() {
  return departmentService.getDepartmentHierarchy();
}

export async function deleteDepartment(id: string) {
  return departmentService.deleteDepartment(id);
}
