// src/lib/actions/organization-actions.ts

"use server";

import type { Prisma } from "@prisma/client";
import { InvitationStatus, OrgRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type {
  ActionResult,
  AddMemberDTO,
  CreateOrganizationDTO,
  InviteMemberDTO,
  OrganizationDetail,
  OrganizationInvitation,
  OrganizationMemberWithUser,
  OrganizationWithRelations,
  UpdateOrganizationDTO,
} from "./types/action-types";

const OrganizationDataFactory = {
  prepareCreateData(
    data: CreateOrganizationDTO,
  ): Omit<Prisma.OrganizationCreateInput, "id" | "members"> {
    return {
      name: data.name,
      slug: data.slug,
      logo: data.logo ?? null,
      metadata: (data.metadata as Prisma.InputJsonValue) ?? null,
    };
  },

  prepareUpdateData(
    data: Partial<UpdateOrganizationDTO>,
  ): Prisma.OrganizationUpdateInput {
    const updateData: Prisma.OrganizationUpdateInput = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.logo !== undefined) updateData.logo = data.logo;
    if (data.metadata !== undefined) {
      updateData.metadata = data.metadata as Prisma.InputJsonValue;
    }

    return updateData;
  },
};

class OrganizationRepository {
  private readonly include = {
    members: {
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    },
    _count: { select: { members: true } },
  };

  async create(data: CreateOrganizationDTO, ownerId: string) {
    const organizationData = OrganizationDataFactory.prepareCreateData(data);

    return db.organization.create({
      data: {
        id: crypto.randomUUID(),
        ...organizationData,
        members: {
          create: {
            id: crypto.randomUUID(),
            userId: ownerId,
            role: OrgRole.OWNER,
          },
        },
      },
      include: this.include,
    });
  }

  async update(id: string, data: Partial<UpdateOrganizationDTO>) {
    const updateData = OrganizationDataFactory.prepareUpdateData(data);

    return db.organization.update({
      where: { id },
      data: updateData,
      include: this.include,
    });
  }

  async findById(id: string) {
    return db.organization.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
              },
            },
          },
        },
        invitations: {
          where: { status: InvitationStatus.PENDING },
          include: {
            inviter: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: { select: { members: true } },
      },
    });
  }

  async findBySlug(slug: string) {
    return db.organization.findUnique({
      where: { slug },
    });
  }

  async findAll() {
    return db.organization.findMany({
      include: this.include,
      orderBy: { createdAt: "desc" },
    });
  }

  async delete(id: string) {
    return db.organization.delete({ where: { id } });
  }

  async addMember(data: AddMemberDTO) {
    return db.organizationMember.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: data.organizationId,
        userId: data.userId,
        role: data.role ?? OrgRole.MEMBER,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });
  }

  async removeMember(organizationId: string, userId: string) {
    return db.organizationMember.delete({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });
  }

  async updateMemberRole(
    organizationId: string,
    userId: string,
    role: OrgRole,
  ) {
    return db.organizationMember.update({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
      data: { role, updatedAt: new Date() },
    });
  }

  async findMember(organizationId: string, userId: string) {
    return db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });
  }

  async createInvitation(data: InviteMemberDTO) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    return db.organizationInvitation.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: data.organizationId,
        email: data.email.toLowerCase(),
        role: data.role ?? OrgRole.MEMBER,
        inviterId: data.inviterId,
        expiresAt,
        status: InvitationStatus.PENDING,
      },
    });
  }

  async findInvitation(organizationId: string, email: string) {
    return db.organizationInvitation.findUnique({
      where: {
        organizationId_email: {
          organizationId,
          email: email.toLowerCase(),
        },
      },
    });
  }
}

interface ValidationStrategy {
  validate(data: unknown): Promise<ActionResult<void>>;
}

class SlugValidationStrategy implements ValidationStrategy {
  async validate(slug: string): Promise<ActionResult<void>> {
    const slugRegex = /^[a-z0-9-]+$/;

    if (!slugRegex.test(slug)) {
      return {
        success: false,
        error:
          "El slug solo puede contener letras minúsculas, números y guiones",
        code: "INVALID_SLUG",
      };
    }

    return { success: true };
  }
}

class UniqueSlugValidationStrategy implements ValidationStrategy {
  async validate(slug: string): Promise<ActionResult<void>> {
    const existingOrg = await db.organization.findUnique({
      where: { slug },
    });

    if (existingOrg) {
      return {
        success: false,
        error: "El slug ya está en uso",
        code: "SLUG_EXISTS",
      };
    }

    return { success: true };
  }
}

class PermissionValidationStrategy implements ValidationStrategy {
  async validate(data: {
    organizationId: string;
    userId: string;
    requiredRoles: OrgRole[];
  }): Promise<ActionResult<void>> {
    const member = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: data.organizationId,
          userId: data.userId,
        },
      },
    });

    if (!member || !data.requiredRoles.includes(member.role as OrgRole)) {
      return {
        success: false,
        error: "No tienes permisos para realizar esta acción",
        code: "INSUFFICIENT_PERMISSIONS",
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

class RequiredFieldsHandler extends ValidationHandler {
  protected async validate(
    data: CreateOrganizationDTO,
  ): Promise<ActionResult<void>> {
    if (!data.name?.trim()) {
      return {
        success: false,
        error: "El nombre de la organización es requerido",
        code: "REQUIRED_NAME",
      };
    }

    if (!data.slug?.trim()) {
      return {
        success: false,
        error: "El slug es requerido",
        code: "REQUIRED_SLUG",
      };
    }

    return { success: true };
  }
}

class SlugFormatHandler extends ValidationHandler {
  private strategy = new SlugValidationStrategy();

  protected async validate(
    data: CreateOrganizationDTO,
  ): Promise<ActionResult<void>> {
    return this.strategy.validate(data.slug);
  }
}

class UniqueSlugHandler extends ValidationHandler {
  private strategy = new UniqueSlugValidationStrategy();

  protected async validate(
    data: CreateOrganizationDTO,
  ): Promise<ActionResult<void>> {
    return this.strategy.validate(data.slug);
  }
}

class OrganizationService {
  private repository = new OrganizationRepository();
  private permissionValidator = new PermissionValidationStrategy();

  async createOrganization(
    dto: CreateOrganizationDTO,
    ownerId: string,
  ): Promise<ActionResult<OrganizationWithRelations>> {
    try {
      const validationChain = new RequiredFieldsHandler();
      validationChain
        .setNext(new SlugFormatHandler())
        .setNext(new UniqueSlugHandler());

      const validationResult = await validationChain.handle(dto);

      if (!validationResult.success) {
        return validationResult as ActionResult<OrganizationWithRelations>;
      }

      const organization = await this.repository.create(dto, ownerId);

      revalidatePath("/dashboard/admin/organizations");

      return {
        success: true,
        data: organization as OrganizationWithRelations,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al crear organización",
        code: "CREATE_ERROR",
      };
    }
  }

  async updateOrganization(
    dto: UpdateOrganizationDTO,
  ): Promise<ActionResult<OrganizationWithRelations>> {
    try {
      if (dto.slug) {
        const slugValidation = new SlugValidationStrategy();
        const slugResult = await slugValidation.validate(dto.slug);

        if (!slugResult.success) {
          return slugResult as ActionResult<OrganizationWithRelations>;
        }

        const existingOrg = await this.repository.findBySlug(dto.slug);

        if (existingOrg && existingOrg.id !== dto.id) {
          return {
            success: false,
            error: "El slug ya está en uso",
            code: "SLUG_EXISTS",
          };
        }
      }

      const organization = await this.repository.update(dto.id, dto);

      revalidatePath("/dashboard/admin/organizations");

      return {
        success: true,
        data: organization as OrganizationWithRelations,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al actualizar organización",
        code: "UPDATE_ERROR",
      };
    }
  }

  async getOrganizationById(
    id: string,
  ): Promise<ActionResult<OrganizationDetail>> {
    try {
      const organization = await this.repository.findById(id);

      if (!organization) {
        return {
          success: false,
          error: "Organización no encontrada",
          code: "NOT_FOUND",
        };
      }

      return {
        success: true,
        data: organization as OrganizationDetail,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al obtener organización",
        code: "FETCH_ERROR",
      };
    }
  }

  async getAllOrganizations(): Promise<
    ActionResult<OrganizationWithRelations[]>
  > {
    try {
      const organizations = await this.repository.findAll();

      return {
        success: true,
        data: organizations as OrganizationWithRelations[],
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al obtener organizaciones",
        code: "FETCH_ERROR",
      };
    }
  }

  async deleteOrganization(id: string): Promise<ActionResult> {
    try {
      await this.repository.delete(id);

      revalidatePath("/dashboard/admin/organizations");

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al eliminar organización",
        code: "DELETE_ERROR",
      };
    }
  }

  async addMember(
    dto: AddMemberDTO,
  ): Promise<ActionResult<OrganizationMemberWithUser>> {
    try {
      const existingMember = await this.repository.findMember(
        dto.organizationId,
        dto.userId,
      );

      if (existingMember) {
        return {
          success: false,
          error: "El usuario ya es miembro de esta organización",
          code: "ALREADY_MEMBER",
        };
      }

      const member = await this.repository.addMember(dto);

      revalidatePath("/dashboard/admin/organizations");

      return {
        success: true,
        data: member as OrganizationMemberWithUser,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Error al agregar miembro",
        code: "ADD_MEMBER_ERROR",
      };
    }
  }

  async removeMember(
    organizationId: string,
    userId: string,
  ): Promise<ActionResult> {
    try {
      const member = await this.repository.findMember(organizationId, userId);

      if (!member) {
        return {
          success: false,
          error: "El miembro no existe en esta organización",
          code: "MEMBER_NOT_FOUND",
        };
      }

      if (member.role === OrgRole.OWNER) {
        return {
          success: false,
          error: "No se puede eliminar al propietario de la organización",
          code: "CANNOT_REMOVE_OWNER",
        };
      }

      await this.repository.removeMember(organizationId, userId);

      revalidatePath("/dashboard/admin/organizations");

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Error al eliminar miembro",
        code: "REMOVE_MEMBER_ERROR",
      };
    }
  }

  async updateMemberRole(
    organizationId: string,
    userId: string,
    role: OrgRole,
    requesterId: string,
  ): Promise<ActionResult> {
    try {
      const permissionResult = await this.permissionValidator.validate({
        organizationId,
        userId: requesterId,
        requiredRoles: [OrgRole.OWNER, OrgRole.ADMIN],
      });

      if (!permissionResult.success) {
        return permissionResult;
      }

      const member = await this.repository.findMember(organizationId, userId);

      if (!member) {
        return {
          success: false,
          error: "El miembro no existe en esta organización",
          code: "MEMBER_NOT_FOUND",
        };
      }

      if (member.role === OrgRole.OWNER && role !== OrgRole.OWNER) {
        return {
          success: false,
          error:
            "No se puede cambiar el rol del propietario de la organización",
          code: "CANNOT_CHANGE_OWNER_ROLE",
        };
      }

      await this.repository.updateMemberRole(organizationId, userId, role);

      revalidatePath("/dashboard/admin/organizations");

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Error al actualizar rol",
        code: "UPDATE_ROLE_ERROR",
      };
    }
  }

  async inviteMember(
    dto: InviteMemberDTO,
  ): Promise<ActionResult<OrganizationInvitation>> {
    try {
      const permissionResult = await this.permissionValidator.validate({
        organizationId: dto.organizationId,
        userId: dto.inviterId,
        requiredRoles: [OrgRole.OWNER, OrgRole.ADMIN],
      });

      if (!permissionResult.success) {
        return permissionResult as ActionResult<OrganizationInvitation>;
      }

      const existingInvitation = await this.repository.findInvitation(
        dto.organizationId,
        dto.email,
      );

      if (
        existingInvitation &&
        existingInvitation.status === InvitationStatus.PENDING
      ) {
        return {
          success: false,
          error: "Ya existe una invitación pendiente para este email",
          code: "INVITATION_EXISTS",
        };
      }

      const invitation = await this.repository.createInvitation(dto);

      revalidatePath("/dashboard/admin/organizations");

      return {
        success: true,
        data: invitation as OrganizationInvitation,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Error al enviar invitación",
        code: "INVITE_ERROR",
      };
    }
  }
}

const organizationService = new OrganizationService();

export async function createOrganization(
  dto: CreateOrganizationDTO,
  ownerId: string,
) {
  return organizationService.createOrganization(dto, ownerId);
}

export async function updateOrganization(dto: UpdateOrganizationDTO) {
  return organizationService.updateOrganization(dto);
}

export async function getOrganizationById(id: string) {
  return organizationService.getOrganizationById(id);
}

export async function getAllOrganizations() {
  return organizationService.getAllOrganizations();
}

export async function deleteOrganization(id: string) {
  return organizationService.deleteOrganization(id);
}

export async function addOrganizationMember(dto: AddMemberDTO) {
  return organizationService.addMember(dto);
}

export async function removeOrganizationMember(
  organizationId: string,
  userId: string,
) {
  return organizationService.removeMember(organizationId, userId);
}

export async function updateOrganizationMemberRole(
  organizationId: string,
  userId: string,
  role: OrgRole,
  requesterId: string,
) {
  return organizationService.updateMemberRole(
    organizationId,
    userId,
    role,
    requesterId,
  );
}

export async function inviteOrganizationMember(dto: InviteMemberDTO) {
  return organizationService.inviteMember(dto);
}
