// src/lib/actions/types/action-types.ts

import type {
  InvitationStatus,
  OrgRole,
  UserRole,
  UserStatus,
} from "@prisma/client";

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UserFilters {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  departmentId?: string;
  managerId?: string;
}

export interface CreateUserDTO {
  name: string;
  email: string;
  password: string;
  phone?: string | null;
  birthDate?: Date | null;
  image?: string | null;
  role?: UserRole;
  status?: UserStatus;
  departmentId?: string | null;
  managerId?: string | null;
}

export interface UpdateUserDTO {
  id: string;
  name?: string;
  email?: string;
  phone?: string | null;
  birthDate?: Date | null;
  image?: string | null;
  role?: UserRole;
  status?: UserStatus;
  departmentId?: string | null;
  managerId?: string | null;
  banned?: boolean;
  banReason?: string | null;
  banExpires?: Date | null;
}

export interface UserWithRelations {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  phone: string | null;
  birthDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  banned: boolean | null;
  banReason: string | null;
  banExpires: Date | null;
  role: UserRole;
  status: UserStatus;
  departmentId: string | null;
  managerId: string | null;
  department?: {
    id: string;
    name: string;
  } | null;
  manager?: {
    id: string;
    name: string;
    role: UserRole;
  } | null;
  subordinates: {
    id: string;
    name: string;
    role: UserRole;
  }[];
}

export interface CreateDepartmentDTO {
  name: string;
  description?: string | null;
  parentId?: string | null;
}

export interface UpdateDepartmentDTO {
  id: string;
  name?: string;
  description?: string | null;
  parentId?: string | null;
}

export interface DepartmentWithRelations {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  parent?: {
    id: string;
    name: string;
  } | null;
  children: {
    id: string;
    name: string;
  }[];
  _count: {
    users: number;
  };
}

export interface DepartmentDetail extends DepartmentWithRelations {
  users: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  }[];
}

export interface DepartmentNode {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  children: DepartmentNode[];
  userCount: number;
}

export interface CreateOrganizationDTO {
  name: string;
  slug: string;
  logo?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface UpdateOrganizationDTO {
  id: string;
  name?: string;
  slug?: string;
  logo?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface OrganizationWithRelations {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  members: OrganizationMemberWithUser[];
  _count: {
    members: number;
  };
}

export interface OrganizationDetail extends OrganizationWithRelations {
  invitations: OrganizationInvitation[];
}

export interface AddMemberDTO {
  organizationId: string;
  userId: string;
  role?: OrgRole;
}

export interface InviteMemberDTO {
  organizationId: string;
  email: string;
  role?: OrgRole;
  inviterId: string;
}

export interface OrganizationMemberWithUser {
  id: string;
  organizationId: string;
  userId: string;
  role: OrgRole;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

export interface OrganizationInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: OrgRole;
  status: InvitationStatus;
  inviterId: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// ENUMS — definidos aquí para no depender del cliente Prisma generado
// ============================================================

export type SupportStatus = "PENDING" | "REVIEW" | "PAUSED" | "COMPLETED";
export type ConformityStatus = "PENDING" | "APPROVED" | "REJECTED";

// ============================================================
// SLA TYPES
// ============================================================

export interface CreateSlaTypeDTO {
  name: string;
  description?: string | null;
  hoursPerDay: number;
  daysPerWeek: number;
  responseTimeHours: number;
}

export interface UpdateSlaTypeDTO {
  id: string;
  name?: string;
  description?: string | null;
  hoursPerDay?: number;
  daysPerWeek?: number;
  responseTimeHours?: number;
}

export interface SlaTypeWithRelations {
  id: string;
  name: string;
  description: string | null;
  hoursPerDay: number;
  daysPerWeek: number;
  responseTimeHours: number;
  createdAt: Date;
  updatedAt: Date;
  _count: { clients: number };
}

// ============================================================
// CLIENTS
// ============================================================

export interface CreateClientDTO {
  name: string;
  ruc?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  slaTypeId: string;
}

export interface UpdateClientDTO {
  id: string;
  name?: string;
  ruc?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  slaTypeId?: string;
  active?: boolean;
}

export interface ClientFilters {
  search?: string;
  slaTypeId?: string;
  active?: boolean;
}

export interface ClientWithRelations {
  id: string;
  name: string;
  ruc: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  active: boolean;
  slaTypeId: string;
  createdAt: Date;
  updatedAt: Date;
  slaType: { id: string; name: string; responseTimeHours: number };
  _count: { contacts: number; supportTickets: number };
}

export interface ClientDetail extends ClientWithRelations {
  contacts: ClientContactWithRelations[];
  hourPackages: ClientHourPackageWithRelations[];
  totalPurchasedHours: number;
  totalConsumedHours: number;
  availableHours: number;
}

export interface CreateClientContactDTO {
  clientId: string;
  name: string;
  position?: string | null;
  email: string;
  phone?: string | null;
  isPrimary?: boolean;
}

export interface UpdateClientContactDTO {
  id: string;
  name?: string;
  position?: string | null;
  email?: string;
  phone?: string | null;
  isPrimary?: boolean;
}

export interface ClientContactWithRelations {
  id: string;
  clientId: string;
  name: string;
  position: string | null;
  email: string;
  phone: string | null;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateClientHourPackageDTO {
  clientId: string;
  hours: number;
  purchaseDate?: Date;
  expiryDate?: Date | null;
  invoiceRef?: string | null;
  notes?: string | null;
}

export interface ClientHourPackageWithRelations {
  id: string;
  clientId: string;
  hours: number;
  purchaseDate: Date;
  expiryDate: Date | null;
  invoiceRef: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// SUPPORT TYPES (CATALOG)
// ============================================================

export interface CreateSupportTypeDTO {
  name: string;
  description?: string | null;
}

export interface UpdateSupportTypeDTO {
  id: string;
  name?: string;
  description?: string | null;
  active?: boolean;
}

export interface SupportTypeWithRelations {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { tickets: number };
}

// ============================================================
// SUPPORT TICKETS
// ============================================================

export interface CreateSupportTicketDTO {
  clientId: string;
  supportTypeId: string;
  assignedById: string;
  assignedToId: string;
  shortDescription: string;
  observations?: string | null;
  startTime?: Date | null;
  endTime?: Date | null;
  manualHours?: number | null;
  status?: SupportStatus;
}

export interface UpdateSupportTicketDTO {
  id: string;
  clientId?: string;
  supportTypeId?: string;
  assignedById?: string;
  assignedToId?: string;
  shortDescription?: string;
  observations?: string | null;
  startTime?: Date | null;
  endTime?: Date | null;
  manualHours?: number | null;
  status?: SupportStatus;
}

export interface SupportTicketFilters {
  search?: string;
  clientId?: string;
  supportTypeId?: string;
  assignedToId?: string;
  assignedById?: string;
  status?: SupportStatus;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface SupportTicketSummary {
  id: string;
  ticketNumber: string;
  shortDescription: string;
  status: SupportStatus;
  startTime: Date | null;
  endTime: Date | null;
  totalHours: number | null;
  createdAt: Date;
  updatedAt: Date;
  client: { id: string; name: string };
  supportType: { id: string; name: string };
}

export interface SupportDocumentWithRelations {
  id: string;
  supportTicketId: string;
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
  fileSizeBytes: number | null;
  uploadedById: string;
  createdAt: Date;
}

export interface CreateSupportDocumentDTO {
  supportTicketId: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  uploadedById: string;
}

export interface ClientConformityWithRelations {
  id: string;
  supportTicketId: string;
  contactId: string | null;
  status: ConformityStatus;
  approvalToken: string | null;
  tokenExpiresAt: Date | null;
  conformityDate: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  contact: { id: string; name: string; email: string } | null;
}

export interface SupportTicketWithRelations {
  id: string;
  ticketNumber: string;
  clientId: string;
  supportTypeId: string;
  assignedById: string;
  assignedToId: string;
  shortDescription: string;
  observations: string | null;
  startTime: Date | null;
  endTime: Date | null;
  manualHours: number | null;
  calculatedHours: number | null;
  totalHours: number | null;
  status: SupportStatus;
  createdAt: Date;
  updatedAt: Date;
  client: {
    id: string;
    name: string;
    slaType: { name: string; responseTimeHours: number };
  };
  supportType: { id: string; name: string };
  documents: SupportDocumentWithRelations[];
  pauseLogs: {
    id: string;
    pausedAt: Date;
    resumedAt: Date | null;
    reason: string | null;
  }[];
  conformity: ClientConformityWithRelations | null;
}
