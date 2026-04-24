// src/components/system/tickets/ticket-form-drawer.tsx

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  createSupportTicket,
  updateSupportTicket,
} from "@/lib/actions/support-ticket-actions";
import type { UserWithRelations } from "@/lib/actions/types/action-types";
import type { ClientWithRelations } from "@/lib/actions/types/client-types";
import type { SupportTypeWithRelations } from "@/lib/actions/types/support-type-types";
import type { SupportTicketWithRelations } from "@/lib/actions/types/support-ticket-types";

const schema = z.object({
  clientId: z.string().min(1, "El cliente es requerido"),
  supportTypeId: z.string().min(1, "El tipo de soporte es requerido"),
  assignedById: z.string().min(1, "El ingeniero que registra es requerido"),
  assignedToId: z.string().min(1, "El ingeniero asignado es requerido"),
  shortDescription: z
    .string()
    .min(1, "La descripción es requerida")
    .max(300),
  observations: z.string().max(2000).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  manualHours: z.coerce
    .number()
    .min(0)
    .max(9999)
    .nullable()
    .optional(),
});

type FormValues = z.infer<typeof schema>;

interface TicketFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket?: SupportTicketWithRelations | null;
  clients: ClientWithRelations[];
  supportTypes: SupportTypeWithRelations[];
  users: UserWithRelations[];
  currentUserId: string;
  onSuccess: () => void;
}

function toDatetimeLocal(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TicketFormDrawer({
  open,
  onOpenChange,
  ticket,
  clients,
  supportTypes,
  users,
  currentUserId,
  onSuccess,
}: TicketFormDrawerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isEdit = !!ticket;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientId: "",
      supportTypeId: "",
      assignedById: currentUserId,
      assignedToId: "",
      shortDescription: "",
      observations: "",
      startTime: "",
      endTime: "",
      manualHours: null,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        ticket
          ? {
              clientId: ticket.clientId,
              supportTypeId: ticket.supportTypeId,
              assignedById: ticket.assignedById,
              assignedToId: ticket.assignedToId,
              shortDescription: ticket.shortDescription,
              observations: ticket.observations ?? "",
              startTime: toDatetimeLocal(ticket.startTime),
              endTime: toDatetimeLocal(ticket.endTime),
              manualHours: ticket.manualHours ?? null,
            }
          : {
              clientId: "",
              supportTypeId: "",
              assignedById: currentUserId,
              assignedToId: "",
              shortDescription: "",
              observations: "",
              startTime: "",
              endTime: "",
              manualHours: null,
            },
      );
    }
  }, [open, ticket, form, currentUserId]);

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    try {
      const startTime = values.startTime ? new Date(values.startTime) : null;
      const endTime = values.endTime ? new Date(values.endTime) : null;
      const manualHours = values.manualHours ?? null;

      const result =
        isEdit && ticket
          ? await updateSupportTicket({
              id: ticket.id,
              clientId: values.clientId,
              supportTypeId: values.supportTypeId,
              assignedById: values.assignedById,
              assignedToId: values.assignedToId,
              shortDescription: values.shortDescription,
              observations: values.observations || null,
              startTime,
              endTime,
              manualHours,
            })
          : await createSupportTicket({
              clientId: values.clientId,
              supportTypeId: values.supportTypeId,
              assignedById: values.assignedById,
              assignedToId: values.assignedToId,
              shortDescription: values.shortDescription,
              observations: values.observations || null,
              startTime,
              endTime,
              manualHours,
            });

      if (result.success) {
        toast.success(isEdit ? "Ticket actualizado" : "Ticket creado");
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(result.error ?? "Error al guardar");
      }
    } catch {
      toast.error("Ocurrió un error inesperado");
    } finally {
      setIsLoading(false);
    }
  }

  const activeClients = clients.filter((c) => c.active);
  const activeSupportTypes = supportTypes.filter((s) => s.active);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar ticket" : "Nuevo ticket"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? `Editando ${ticket?.ticketNumber}`
              : "Registra un nuevo ticket de soporte"}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5 mt-6"
          >
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activeClients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="supportTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de soporte</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activeSupportTypes.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="shortDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Resumen del soporte realizado..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detalle adicional del soporte..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Opcional</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha/hora inicio</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormDescription>Opcional</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha/hora fin</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormDescription>Opcional</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="manualHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Horas manuales</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={9999}
                      step={0.5}
                      placeholder="0.0"
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? null : e.target.value,
                        )
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Sobreescribe el cálculo automático. Opcional.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="assignedById"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registrado por</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assignedToId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asignado a</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEdit ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
