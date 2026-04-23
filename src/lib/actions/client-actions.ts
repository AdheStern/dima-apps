// src/lib/actions/client-actions.ts

"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type {
  ActionResult,
  ClientContactWithRelations,
  ClientDetail,
  ClientFilters,
  ClientHourPackageWithRelations,
  ClientWithRelations,
  CreateClientContactDTO,
  CreateClientDTO,
  CreateClientHourPackageDTO,
  PaginatedResult,
  PaginationParams,
  UpdateClientContactDTO,
  UpdateClientDTO,
} from "./types/action-types";

// biome-ignore lint/suspicious/noExplicitAny: Prisma.Decimal no disponible hasta prisma generate
const decimalToNumber = (d: any): number | null =>
  d != null ? Number(d.toString()) : null;

class ClientRepository {
  private readonly include = {
    slaType: { select: { id: true, name: true, responseTimeHours: true } },
    _count: { select: { contacts: true, supportTickets: true } },
  };

  async create(data: CreateClientDTO) {
    return db.client.create({
      data: {
        name: data.name,
        ruc: data.ruc ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        address: data.address ?? null,
        slaTypeId: data.slaTypeId,
      },
      include: this.include,
    });
  }

  async update(id: string, data: Partial<UpdateClientDTO>) {
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.ruc !== undefined) updateData.ruc = data.ruc;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.slaTypeId !== undefined) updateData.slaTypeId = data.slaTypeId;
    if (data.active !== undefined) updateData.active = data.active;

    return db.client.update({
      where: { id },
      data: updateData,
      include: this.include,
    });
  }

  async findById(id: string) {
    return db.client.findUnique({ where: { id }, include: this.include });
  }

  async findDetail(id: string) {
    return db.client.findUnique({
      where: { id },
      include: {
        ...this.include,
        contacts: { orderBy: [{ isPrimary: "desc" }, { name: "asc" }] },
        hourPackages: { orderBy: { purchaseDate: "desc" } },
      },
    });
  }

  async findMany(
    filters: ClientFilters,
    pagination: PaginationParams,
  ) {
    const { page = 1, pageSize = 20, sortBy = "name", sortOrder = "asc" } =
      pagination;

    const where = {
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: "insensitive" as const } },
          { ruc: { contains: filters.search, mode: "insensitive" as const } },
          { email: { contains: filters.search, mode: "insensitive" as const } },
        ],
      }),
      ...(filters.slaTypeId && { slaTypeId: filters.slaTypeId }),
      ...(filters.active !== undefined && { active: filters.active }),
    };

    const [data, total] = await db.$transaction([
      db.client.findMany({
        where,
        include: this.include,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.client.count({ where }),
    ]);

    return { data, total };
  }

  async delete(id: string) {
    return db.client.delete({ where: { id } });
  }
}

class ClientContactRepository {
  async create(data: CreateClientContactDTO) {
    return db.clientContact.create({ data });
  }

  async update(id: string, data: Partial<UpdateClientContactDTO>) {
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.position !== undefined) updateData.position = data.position;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.isPrimary !== undefined) updateData.isPrimary = data.isPrimary;

    return db.clientContact.update({ where: { id }, data: updateData });
  }

  async findById(id: string) {
    return db.clientContact.findUnique({ where: { id } });
  }

  async findByClientId(clientId: string) {
    return db.clientContact.findMany({
      where: { clientId },
      orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
    });
  }

  async clearPrimary(clientId: string) {
    return db.clientContact.updateMany({
      where: { clientId, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  async delete(id: string) {
    return db.clientContact.delete({ where: { id } });
  }
}

class ClientHourPackageRepository {
  async create(data: CreateClientHourPackageDTO) {
    return db.clientHourPackage.create({
      data: {
        clientId: data.clientId,
        hours: data.hours,
        purchaseDate: data.purchaseDate ?? new Date(),
        expiryDate: data.expiryDate ?? null,
        invoiceRef: data.invoiceRef ?? null,
        notes: data.notes ?? null,
      },
    });
  }

  async findByClientId(clientId: string) {
    return db.clientHourPackage.findMany({
      where: { clientId },
      orderBy: { purchaseDate: "desc" },
    });
  }

  async getTotalPurchasedHours(clientId: string): Promise<number> {
    const result = await db.clientHourPackage.aggregate({
      where: { clientId },
      _sum: { hours: true },
    });
    return decimalToNumber(result._sum.hours) ?? 0;
  }

  async delete(id: string) {
    return db.clientHourPackage.delete({ where: { id } });
  }
}

interface ValidationStrategy {
  validate(data: unknown): Promise<ActionResult<void>>;
}

class SlaTypeExistsValidationStrategy implements ValidationStrategy {
  async validate(slaTypeId: string): Promise<ActionResult<void>> {
    const slaType = await db.slaType.findUnique({ where: { id: slaTypeId } });
    if (!slaType) {
      return {
        success: false,
        error: "El tipo de SLA seleccionado no existe",
        code: "SLA_TYPE_NOT_FOUND",
      };
    }
    return { success: true };
  }
}

class UniqueRucValidationStrategy implements ValidationStrategy {
  async validate(data: {
    ruc: string;
    excludeId?: string;
  }): Promise<ActionResult<void>> {
    const existing = await db.client.findUnique({ where: { ruc: data.ruc } });
    if (existing && existing.id !== data.excludeId) {
      return {
        success: false,
        error: `Ya existe un cliente con el RUC "${data.ruc}"`,
        code: "DUPLICATE_RUC",
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
  protected async validate(data: CreateClientDTO): Promise<ActionResult<void>> {
    if (!data.name?.trim()) {
      return {
        success: false,
        error: "El nombre del cliente es requerido",
        code: "REQUIRED_NAME",
      };
    }
    if (!data.slaTypeId) {
      return {
        success: false,
        error: "El tipo de SLA es requerido",
        code: "REQUIRED_SLA_TYPE",
      };
    }
    return { success: true };
  }
}

class SlaTypeExistsHandler extends ValidationHandler {
  private strategy = new SlaTypeExistsValidationStrategy();

  protected async validate(
    data: CreateClientDTO | UpdateClientDTO,
  ): Promise<ActionResult<void>> {
    if (!data.slaTypeId) return { success: true };
    return this.strategy.validate(data.slaTypeId);
  }
}

class UniqueRucHandler extends ValidationHandler {
  private strategy = new UniqueRucValidationStrategy();

  protected async validate(
    data: CreateClientDTO | UpdateClientDTO,
  ): Promise<ActionResult<void>> {
    if (!data.ruc) return { success: true };
    return this.strategy.validate({
      ruc: data.ruc,
      excludeId: "id" in data ? data.id : undefined,
    });
  }
}

class ClientService {
  private clientRepo = new ClientRepository();
  private contactRepo = new ClientContactRepository();
  private packageRepo = new ClientHourPackageRepository();

  async createClient(dto: CreateClientDTO): Promise<ActionResult<ClientWithRelations>> {
    try {
      const chain = new RequiredFieldsHandler();
      chain.setNext(new SlaTypeExistsHandler()).setNext(new UniqueRucHandler());

      const validation = await chain.handle(dto);
      if (!validation.success)
        return validation as ActionResult<ClientWithRelations>;

      const client = await this.clientRepo.create(dto);

      revalidatePath("/dashboard/clients");

      return { success: true, data: client as ClientWithRelations };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Error al crear cliente",
        code: "CREATE_ERROR",
      };
    }
  }

  async updateClient(dto: UpdateClientDTO): Promise<ActionResult<ClientWithRelations>> {
    try {
      const existing = await this.clientRepo.findById(dto.id);
      if (!existing) {
        return {
          success: false,
          error: "Cliente no encontrado",
          code: "NOT_FOUND",
        };
      }

      const chain = new SlaTypeExistsHandler();
      chain.setNext(new UniqueRucHandler());

      const validation = await chain.handle(dto);
      if (!validation.success)
        return validation as ActionResult<ClientWithRelations>;

      const client = await this.clientRepo.update(dto.id, dto);

      revalidatePath("/dashboard/clients");

      return { success: true, data: client as ClientWithRelations };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al actualizar cliente",
        code: "UPDATE_ERROR",
      };
    }
  }

  async getClientById(id: string): Promise<ActionResult<ClientWithRelations>> {
    try {
      const client = await this.clientRepo.findById(id);
      if (!client) {
        return {
          success: false,
          error: "Cliente no encontrado",
          code: "NOT_FOUND",
        };
      }
      return { success: true, data: client as ClientWithRelations };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Error al obtener cliente",
        code: "FETCH_ERROR",
      };
    }
  }

  async getClientDetail(id: string): Promise<ActionResult<ClientDetail>> {
    try {
      const client = await this.clientRepo.findDetail(id);
      if (!client) {
        return {
          success: false,
          error: "Cliente no encontrado",
          code: "NOT_FOUND",
        };
      }

      const totalPurchasedHours =
        await this.packageRepo.getTotalPurchasedHours(id);

      const consumedResult = await db.supportTicket.aggregate({
        where: { clientId: id, status: "COMPLETED" },
        _sum: { totalHours: true },
      });
      const totalConsumedHours =
        decimalToNumber(consumedResult._sum.totalHours) ?? 0;

      const hourPackages = client.hourPackages.map((pkg) => ({
        ...pkg,
        hours: decimalToNumber(pkg.hours) ?? 0,
      }));

      return {
        success: true,
        data: {
          ...(client as unknown as ClientWithRelations),
          contacts: client.contacts as ClientContactWithRelations[],
          hourPackages: hourPackages as ClientHourPackageWithRelations[],
          totalPurchasedHours,
          totalConsumedHours,
          availableHours: totalPurchasedHours - totalConsumedHours,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al obtener detalle del cliente",
        code: "FETCH_ERROR",
      };
    }
  }

  async getClients(
    filters: ClientFilters = {},
    pagination: PaginationParams = {},
  ): Promise<ActionResult<PaginatedResult<ClientWithRelations>>> {
    try {
      const { data, total } = await this.clientRepo.findMany(
        filters,
        pagination,
      );
      const { page = 1, pageSize = 20 } = pagination;

      return {
        success: true,
        data: {
          data: data as ClientWithRelations[],
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
          error instanceof Error ? error.message : "Error al obtener clientes",
        code: "FETCH_ERROR",
      };
    }
  }

  async deleteClient(id: string): Promise<ActionResult> {
    try {
      const client = await this.clientRepo.findById(id);
      if (!client) {
        return {
          success: false,
          error: "Cliente no encontrado",
          code: "NOT_FOUND",
        };
      }

      if (client._count.supportTickets > 0) {
        return {
          success: false,
          error:
            "No se puede eliminar un cliente con tickets asociados. Desactívelo en su lugar.",
          code: "HAS_TICKETS",
        };
      }

      await this.clientRepo.delete(id);

      revalidatePath("/dashboard/clients");

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Error al eliminar cliente",
        code: "DELETE_ERROR",
      };
    }
  }

  // ---- Contactos ----

  async addContact(
    dto: CreateClientContactDTO,
  ): Promise<ActionResult<ClientContactWithRelations>> {
    try {
      if (!dto.name?.trim()) {
        return {
          success: false,
          error: "El nombre del contacto es requerido",
          code: "REQUIRED_NAME",
        };
      }

      const client = await this.clientRepo.findById(dto.clientId);
      if (!client) {
        return {
          success: false,
          error: "Cliente no encontrado",
          code: "CLIENT_NOT_FOUND",
        };
      }

      if (dto.isPrimary) {
        await this.contactRepo.clearPrimary(dto.clientId);
      }

      const contact = await this.contactRepo.create(dto);

      revalidatePath(`/dashboard/clients/${dto.clientId}`);

      return {
        success: true,
        data: contact as ClientContactWithRelations,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Error al agregar contacto",
        code: "CREATE_ERROR",
      };
    }
  }

  async updateContact(
    dto: UpdateClientContactDTO,
  ): Promise<ActionResult<ClientContactWithRelations>> {
    try {
      const contact = await this.contactRepo.findById(dto.id);
      if (!contact) {
        return {
          success: false,
          error: "Contacto no encontrado",
          code: "NOT_FOUND",
        };
      }

      if (dto.isPrimary) {
        await this.contactRepo.clearPrimary(contact.clientId);
      }

      const updated = await this.contactRepo.update(dto.id, dto);

      revalidatePath(`/dashboard/clients/${contact.clientId}`);

      return { success: true, data: updated as ClientContactWithRelations };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al actualizar contacto",
        code: "UPDATE_ERROR",
      };
    }
  }

  async deleteContact(id: string): Promise<ActionResult> {
    try {
      const contact = await this.contactRepo.findById(id);
      if (!contact) {
        return {
          success: false,
          error: "Contacto no encontrado",
          code: "NOT_FOUND",
        };
      }

      await this.contactRepo.delete(id);

      revalidatePath(`/dashboard/clients/${contact.clientId}`);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Error al eliminar contacto",
        code: "DELETE_ERROR",
      };
    }
  }

  // ---- Paquetes de horas ----

  async addHourPackage(
    dto: CreateClientHourPackageDTO,
  ): Promise<ActionResult<ClientHourPackageWithRelations>> {
    try {
      if (!dto.hours || dto.hours <= 0) {
        return {
          success: false,
          error: "La cantidad de horas debe ser mayor a 0",
          code: "INVALID_HOURS",
        };
      }

      const client = await this.clientRepo.findById(dto.clientId);
      if (!client) {
        return {
          success: false,
          error: "Cliente no encontrado",
          code: "CLIENT_NOT_FOUND",
        };
      }

      const pkg = await this.packageRepo.create(dto);

      revalidatePath(`/dashboard/clients/${dto.clientId}`);

      return {
        success: true,
        data: {
          ...pkg,
          hours: decimalToNumber(pkg.hours) ?? 0,
        } as ClientHourPackageWithRelations,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al agregar paquete de horas",
        code: "CREATE_ERROR",
      };
    }
  }

  async getClientBalance(
    clientId: string,
  ): Promise<ActionResult<{ total: number; consumed: number; available: number }>> {
    try {
      const client = await this.clientRepo.findById(clientId);
      if (!client) {
        return {
          success: false,
          error: "Cliente no encontrado",
          code: "NOT_FOUND",
        };
      }

      const total = await this.packageRepo.getTotalPurchasedHours(clientId);

      const consumedResult = await db.supportTicket.aggregate({
        where: { clientId, status: "COMPLETED" },
        _sum: { totalHours: true },
      });
      const consumed = decimalToNumber(consumedResult._sum.totalHours) ?? 0;

      return {
        success: true,
        data: { total, consumed, available: total - consumed },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al calcular balance de horas",
        code: "FETCH_ERROR",
      };
    }
  }
}

const clientService = new ClientService();

export async function createClient(dto: CreateClientDTO) {
  return clientService.createClient(dto);
}

export async function updateClient(dto: UpdateClientDTO) {
  return clientService.updateClient(dto);
}

export async function getClientById(id: string) {
  return clientService.getClientById(id);
}

export async function getClientDetail(id: string) {
  return clientService.getClientDetail(id);
}

export async function getClients(
  filters?: ClientFilters,
  pagination?: PaginationParams,
) {
  return clientService.getClients(filters, pagination);
}

export async function deleteClient(id: string) {
  return clientService.deleteClient(id);
}

export async function addClientContact(dto: CreateClientContactDTO) {
  return clientService.addContact(dto);
}

export async function updateClientContact(dto: UpdateClientContactDTO) {
  return clientService.updateContact(dto);
}

export async function deleteClientContact(id: string) {
  return clientService.deleteContact(id);
}

export async function addClientHourPackage(dto: CreateClientHourPackageDTO) {
  return clientService.addHourPackage(dto);
}

export async function getClientBalance(clientId: string) {
  return clientService.getClientBalance(clientId);
}
