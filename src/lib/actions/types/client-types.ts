// src/lib/actions/types/client-types.ts

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
