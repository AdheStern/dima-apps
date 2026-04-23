// src/lib/actions/user-actions.ts

"use server";

import { UserRole, UserStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type {
  ActionResult,
  CreateUserDTO,
  PaginatedResult,
  PaginationParams,
  UpdateUserDTO,
  UserFilters,
  UserWithRelations,
} from "./types/action-types";

const UserDataFactory = {
  prepareCreateData(dto: CreateUserDTO): Record<string, unknown> {
    return {
      role: dto.role ?? UserRole.USER,
      status: dto.status ?? UserStatus.ACTIVE,
      departmentId: dto.departmentId ?? null,
      managerId: dto.managerId ?? null,
      image: dto.image ?? null,
      birthDate: dto.birthDate ?? null,
      phone: dto.phone ?? null,
      banned: false,
      banReason: null,
      banExpires: null,
    };
  },

  prepareUpdateData(dto: UpdateUserDTO): Record<string, unknown> {
    const data: Record<string, unknown> = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.departmentId !== undefined) data.departmentId = dto.departmentId;
    if (dto.managerId !== undefined) data.managerId = dto.managerId;
    if (dto.image !== undefined) data.image = dto.image;
    if (dto.birthDate !== undefined) data.birthDate = dto.birthDate;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.banned !== undefined) data.banned = dto.banned;
    if (dto.banReason !== undefined) data.banReason = dto.banReason;
    if (dto.banExpires !== undefined) data.banExpires = dto.banExpires;

    return data;
  },
};

interface ValidationStrategy {
  validate(data: unknown): Promise<ActionResult<void>>;
}

class EmailValidationStrategy implements ValidationStrategy {
  async validate(email: string): Promise<ActionResult<void>> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return {
        success: false,
        error: "Email inválido",
        code: "INVALID_EMAIL",
      };
    }

    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return {
        success: false,
        error: "El email ya está registrado",
        code: "EMAIL_EXISTS",
      };
    }

    return { success: true };
  }
}

class HierarchyValidationStrategy implements ValidationStrategy {
  async validate(data: {
    userId: string;
    managerId?: string | null;
  }): Promise<ActionResult<void>> {
    if (!data.managerId) {
      return { success: true };
    }

    if (data.userId === data.managerId) {
      return {
        success: false,
        error: "Un usuario no puede ser su propio manager",
        code: "CIRCULAR_REFERENCE",
      };
    }

    const hasCircularReference = await this.checkCircularReference(
      data.userId,
      data.managerId,
    );

    if (hasCircularReference) {
      return {
        success: false,
        error: "Se detectó una referencia circular en la jerarquía",
        code: "CIRCULAR_HIERARCHY",
      };
    }

    return { success: true };
  }

  private async checkCircularReference(
    userId: string,
    managerId: string,
  ): Promise<boolean> {
    let currentManagerId: string | null = managerId;
    const visitedIds = new Set<string>([userId]);

    while (currentManagerId) {
      if (visitedIds.has(currentManagerId)) {
        return true;
      }

      visitedIds.add(currentManagerId);

      const manager: { managerId: string | null } | null =
        await db.user.findUnique({
          where: { id: currentManagerId },
          select: { managerId: true },
        });

      if (!manager) break;

      currentManagerId = manager.managerId;
    }

    return false;
  }
}

class PasswordValidationStrategy implements ValidationStrategy {
  async validate(password: string): Promise<ActionResult<void>> {
    if (!password) {
      return {
        success: false,
        error: "La contraseña es requerida",
        code: "REQUIRED_PASSWORD",
      };
    }

    if (password.length < 8) {
      return {
        success: false,
        error: "La contraseña debe tener al menos 8 caracteres",
        code: "PASSWORD_TOO_SHORT",
      };
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      return {
        success: false,
        error: "La contraseña debe contener mayúsculas, minúsculas y números",
        code: "PASSWORD_WEAK",
      };
    }

    return { success: true };
  }
}

class UserRepository {
  private readonly include = {
    department: { select: { id: true, name: true } },
    manager: { select: { id: true, name: true, role: true } },
    subordinates: { select: { id: true, name: true, role: true } },
  };

  async create(userData: CreateUserDTO) {
    const preparedData = UserDataFactory.prepareCreateData(userData);

    const result = await auth.api.signUpEmail({
      body: {
        email: userData.email.toLowerCase(),
        password: userData.password,
        name: userData.name,
      },
    });

    if (!result?.user) {
      throw new Error("Error al crear usuario con Better Auth");
    }

    const updatedUser = await db.user.update({
      where: { id: result.user.id },
      data: {
        ...preparedData,
        emailVerified: true,
        updatedAt: new Date(),
      },
      include: this.include,
    });

    return updatedUser;
  }

  async update(id: string, data: Partial<UpdateUserDTO>) {
    const preparedData = UserDataFactory.prepareUpdateData(
      data as UpdateUserDTO,
    );

    return db.user.update({
      where: { id },
      data: {
        ...preparedData,
        updatedAt: new Date(),
      },
      include: this.include,
    });
  }

  async findById(id: string) {
    return db.user.findUnique({
      where: { id },
      include: this.include,
    });
  }

  async findMany(
    filters: UserFilters,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<UserWithRelations>> {
    const {
      page = 1,
      pageSize = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = pagination;
    const skip = (page - 1) * pageSize;

    const where = {
      ...(filters.role && { role: filters.role }),
      ...(filters.status && { status: filters.status }),
      ...(filters.departmentId && { departmentId: filters.departmentId }),
      ...(filters.managerId && { managerId: filters.managerId }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: "insensitive" as const } },
          { email: { contains: filters.search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        include: this.include,
      }),
      db.user.count({ where }),
    ]);

    return {
      data: data as UserWithRelations[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async delete(id: string) {
    await db.account.deleteMany({
      where: { userId: id },
    });

    return db.user.delete({ where: { id } });
  }

  async updateStatus(id: string, status: UserStatus) {
    return this.update(id, { id, status });
  }

  async findAllManagers() {
    return db.user.findMany({
      where: {
        role: {
          in: [
            UserRole.SUPER_ADMIN,
            UserRole.ADMIN,
            UserRole.MANAGER,
            UserRole.SUPERVISOR,
          ],
        },
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });
  }

  async banUser(id: string, reason: string, expiresAt?: Date) {
    return this.update(id, {
      id,
      banned: true,
      banReason: reason,
      banExpires: expiresAt ?? null,
      status: UserStatus.SUSPENDED,
    });
  }

  async unbanUser(id: string) {
    return this.update(id, {
      id,
      banned: false,
      banReason: null,
      banExpires: null,
      status: UserStatus.ACTIVE,
    });
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

class RequiredFieldsHandler extends ValidationHandler {
  protected async validate(data: CreateUserDTO): Promise<ActionResult<void>> {
    if (!data.name?.trim()) {
      return {
        success: false,
        error: "El nombre es requerido",
        code: "REQUIRED_NAME",
      };
    }

    if (!data.email?.trim()) {
      return {
        success: false,
        error: "El email es requerido",
        code: "REQUIRED_EMAIL",
      };
    }

    return { success: true };
  }
}

class EmailValidationHandler extends ValidationHandler {
  private strategy = new EmailValidationStrategy();

  protected async validate(data: CreateUserDTO): Promise<ActionResult<void>> {
    return this.strategy.validate(data.email);
  }
}

class HierarchyValidationHandler extends ValidationHandler {
  private strategy = new HierarchyValidationStrategy();

  protected async validate(data: UpdateUserDTO): Promise<ActionResult<void>> {
    return this.strategy.validate({
      userId: data.id,
      managerId: data.managerId,
    });
  }
}

class PasswordValidationHandler extends ValidationHandler {
  private strategy = new PasswordValidationStrategy();

  protected async validate(data: CreateUserDTO): Promise<ActionResult<void>> {
    return this.strategy.validate(data.password);
  }
}

class UserService {
  private repository = new UserRepository();

  async createUser(
    dto: CreateUserDTO,
  ): Promise<ActionResult<UserWithRelations>> {
    try {
      const validationChain = new RequiredFieldsHandler();
      validationChain
        .setNext(new EmailValidationHandler())
        .setNext(new PasswordValidationHandler());

      const validationResult = await validationChain.handle(dto);

      if (!validationResult.success) {
        return validationResult as ActionResult<UserWithRelations>;
      }

      const user = await this.repository.create(dto);

      revalidatePath("/dashboard/admin/users");

      return {
        success: true,
        data: user as UserWithRelations,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Error al crear usuario",
        code: "CREATE_ERROR",
      };
    }
  }

  async updateUser(
    dto: UpdateUserDTO,
  ): Promise<ActionResult<UserWithRelations>> {
    try {
      const validationChain = new HierarchyValidationHandler();
      const validationResult = await validationChain.handle(dto);

      if (!validationResult.success) {
        return validationResult as ActionResult<UserWithRelations>;
      }

      const user = await this.repository.update(dto.id, dto);

      revalidatePath("/dashboard/admin/users");

      return {
        success: true,
        data: user as UserWithRelations,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al actualizar usuario",
        code: "UPDATE_ERROR",
      };
    }
  }

  async getUserById(id: string): Promise<ActionResult<UserWithRelations>> {
    try {
      const user = await this.repository.findById(id);

      if (!user) {
        return {
          success: false,
          error: "Usuario no encontrado",
          code: "NOT_FOUND",
        };
      }

      return {
        success: true,
        data: user as UserWithRelations,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Error al obtener usuario",
        code: "FETCH_ERROR",
      };
    }
  }

  async getUsers(
    filters: UserFilters = {},
    pagination: PaginationParams = {},
  ): Promise<ActionResult<PaginatedResult<UserWithRelations>>> {
    try {
      const result = await this.repository.findMany(filters, pagination);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Error al obtener usuarios",
        code: "FETCH_ERROR",
      };
    }
  }

  async deleteUser(id: string): Promise<ActionResult> {
    try {
      const user = await this.repository.findById(id);

      if (!user) {
        return {
          success: false,
          error: "Usuario no encontrado",
          code: "NOT_FOUND",
        };
      }

      if (user.subordinates.length > 0) {
        return {
          success: false,
          error: "No se puede eliminar un usuario con subordinados",
          code: "HAS_SUBORDINATES",
        };
      }

      await this.repository.delete(id);

      revalidatePath("/dashboard/admin/users");

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Error al eliminar usuario",
        code: "DELETE_ERROR",
      };
    }
  }

  async updateUserStatus(
    id: string,
    status: UserStatus,
  ): Promise<ActionResult> {
    try {
      await this.repository.updateStatus(id, status);

      revalidatePath("/dashboard/admin/users");

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Error al actualizar estado",
        code: "UPDATE_STATUS_ERROR",
      };
    }
  }

  async getAllManagers(): Promise<ActionResult<UserWithRelations[]>> {
    try {
      const managers = await this.repository.findAllManagers();

      return {
        success: true,
        data: managers as UserWithRelations[],
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Error al obtener managers",
        code: "FETCH_ERROR",
      };
    }
  }

  async banUser(
    id: string,
    reason: string,
    expiresAt?: Date,
  ): Promise<ActionResult<UserWithRelations>> {
    try {
      const user = await this.repository.banUser(id, reason, expiresAt);

      revalidatePath("/dashboard/admin/users");

      return {
        success: true,
        data: user as UserWithRelations,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Error al banear usuario",
        code: "BAN_ERROR",
      };
    }
  }

  async unbanUser(id: string): Promise<ActionResult<UserWithRelations>> {
    try {
      const user = await this.repository.unbanUser(id);

      revalidatePath("/dashboard/admin/users");

      return {
        success: true,
        data: user as UserWithRelations,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Error al desbanear usuario",
        code: "UNBAN_ERROR",
      };
    }
  }
}

const userService = new UserService();

export async function createUser(dto: CreateUserDTO) {
  return userService.createUser(dto);
}

export async function updateUser(dto: UpdateUserDTO) {
  return userService.updateUser(dto);
}

export async function getUserById(id: string) {
  return userService.getUserById(id);
}

export async function getUsers(
  filters?: UserFilters,
  pagination?: PaginationParams,
) {
  return userService.getUsers(filters, pagination);
}

export async function deleteUser(id: string) {
  return userService.deleteUser(id);
}

export async function updateUserStatus(id: string, status: UserStatus) {
  return userService.updateUserStatus(id, status);
}

export async function getAllManagers() {
  return userService.getAllManagers();
}

export async function banUser(id: string, reason: string, expiresAt?: Date) {
  return userService.banUser(id, reason, expiresAt);
}

export async function unbanUser(id: string) {
  return userService.unbanUser(id);
}
