// src/lib/actions/types/support-ticket-types.ts

export type SupportStatus = "PENDING" | "REVIEW" | "PAUSED" | "COMPLETED";
export type ConformityStatus = "PENDING" | "APPROVED" | "REJECTED";

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
