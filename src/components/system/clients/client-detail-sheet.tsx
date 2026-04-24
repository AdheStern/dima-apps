// src/components/system/clients/client-detail-sheet.tsx

"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Loader2,
  MailCheck,
  MoreHorizontal,
  Package,
  Pencil,
  Phone,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  deleteClientContact,
  getClientDetail,
} from "@/lib/actions/client-actions";
import type {
  ClientContactWithRelations,
  ClientDetail,
} from "@/lib/actions/types/client-types";
import { ClientStatsCard } from "./client-stats-card";
import { ContactFormDrawer } from "./contact-form-drawer";
import { HourPackageFormDrawer } from "./hour-package-form-drawer";

interface ClientDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string | null;
  clientName: string;
}

export function ClientDetailSheet({
  open,
  onOpenChange,
  clientId,
  clientName,
}: ClientDetailSheetProps) {
  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  const [isHoursFormOpen, setIsHoursFormOpen] = useState(false);
  const [selectedContact, setSelectedContact] =
    useState<ClientContactWithRelations | null>(null);
  const [contactToDelete, setContactToDelete] =
    useState<ClientContactWithRelations | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  async function loadDetail() {
    if (!clientId) return;
    setIsLoading(true);
    try {
      const result = await getClientDetail(clientId);
      if (result.success && result.data) {
        setDetail(result.data);
      } else {
        toast.error(result.error ?? "Error al cargar detalle");
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (open && clientId) {
      loadDetail();
    } else if (!open) {
      setDetail(null);
    }
  }, [open, clientId]);

  const handleDeleteContact = async () => {
    if (!contactToDelete) return;
    const result = await deleteClientContact(contactToDelete.id);
    if (result.success) {
      toast.success("Contacto eliminado");
      loadDetail();
    } else {
      toast.error(result.error ?? "Error al eliminar contacto");
    }
    setIsDeleteOpen(false);
    setContactToDelete(null);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{clientName}</SheetTitle>
            <SheetDescription>
              Contactos y paquetes de horas del cliente
            </SheetDescription>
          </SheetHeader>

          {isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && detail && (
            <div className="mt-6 space-y-4">
              <ClientStatsCard
                totalHours={detail.totalPurchasedHours}
                consumedHours={detail.totalConsumedHours}
                availableHours={detail.availableHours}
              />

              <Tabs defaultValue="contacts">
                <TabsList className="w-full">
                  <TabsTrigger value="contacts" className="flex-1">
                    Contactos ({detail.contacts.length})
                  </TabsTrigger>
                  <TabsTrigger value="hours" className="flex-1">
                    Paquetes ({detail.hourPackages.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="contacts" className="mt-4 space-y-3">
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedContact(null);
                        setIsContactFormOpen(true);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Nuevo contacto
                    </Button>
                  </div>

                  {detail.contacts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      Sin contactos registrados
                    </p>
                  ) : (
                    detail.contacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-start justify-between rounded-lg border p-3 gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">
                              {contact.name}
                            </span>
                            {contact.isPrimary && (
                              <Badge
                                variant="secondary"
                                className="text-xs shrink-0"
                              >
                                <Star className="mr-1 h-3 w-3" />
                                Principal
                              </Badge>
                            )}
                          </div>
                          {contact.position && (
                            <p className="text-xs text-muted-foreground">
                              {contact.position}
                            </p>
                          )}
                          <div className="flex flex-col sm:flex-row gap-x-3 mt-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <MailCheck className="h-3 w-3" />
                              {contact.email}
                            </span>
                            {contact.phone && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {contact.phone}
                              </span>
                            )}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0 shrink-0"
                            >
                              <span className="sr-only">Acciones</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedContact(contact);
                                setIsContactFormOpen(true);
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => {
                                setContactToDelete(contact);
                                setIsDeleteOpen(true);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="hours" className="mt-4 space-y-3">
                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => setIsHoursFormOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar horas
                    </Button>
                  </div>

                  {detail.hourPackages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      Sin paquetes de horas registrados
                    </p>
                  ) : (
                    detail.hourPackages.map((pkg) => (
                      <div
                        key={pkg.id}
                        className="flex items-start rounded-lg border p-3 gap-3"
                      >
                        <Package className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">
                              {pkg.hours} horas
                            </span>
                            {pkg.invoiceRef && (
                              <span className="text-xs text-muted-foreground">
                                {pkg.invoiceRef}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col sm:flex-row gap-x-3 mt-1 text-xs text-muted-foreground">
                            <span>
                              Compra:{" "}
                              {format(
                                new Date(pkg.purchaseDate),
                                "dd/MM/yyyy",
                                { locale: es },
                              )}
                            </span>
                            {pkg.expiryDate && (
                              <span>
                                Vence:{" "}
                                {format(
                                  new Date(pkg.expiryDate),
                                  "dd/MM/yyyy",
                                  { locale: es },
                                )}
                              </span>
                            )}
                          </div>
                          {pkg.notes && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {pkg.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {clientId && (
        <>
          <ContactFormDrawer
            open={isContactFormOpen}
            onOpenChange={(isOpen) => {
              setIsContactFormOpen(isOpen);
              if (!isOpen) setSelectedContact(null);
            }}
            clientId={clientId}
            contact={selectedContact}
            onSuccess={loadDetail}
          />

          <HourPackageFormDrawer
            open={isHoursFormOpen}
            onOpenChange={setIsHoursFormOpen}
            clientId={clientId}
            clientName={clientName}
            onSuccess={loadDetail}
          />
        </>
      )}

      <ConfirmationDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={handleDeleteContact}
        title="¿Eliminar contacto?"
        description={`¿Eliminar al contacto "${contactToDelete?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="destructive"
      />
    </>
  );
}
