// src/components/system/clients/client-form-drawer.tsx

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
import { Switch } from "@/components/ui/switch";
import { createClient, updateClient } from "@/lib/actions/client-actions";
import type { ClientWithRelations } from "@/lib/actions/types/client-types";
import type { SlaTypeWithRelations } from "@/lib/actions/types/sla-type-types";

const schema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(150),
  ruc: z.string().max(20).optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().max(20).optional(),
  address: z.string().max(300).optional(),
  slaTypeId: z.string().min(1, "El tipo de SLA es requerido"),
  active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface ClientFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: ClientWithRelations | null;
  slaTypes: SlaTypeWithRelations[];
  onSuccess: () => void;
}

export function ClientFormDrawer({
  open,
  onOpenChange,
  client,
  slaTypes,
  onSuccess,
}: ClientFormDrawerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isEdit = !!client;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      ruc: "",
      email: "",
      phone: "",
      address: "",
      slaTypeId: "",
      active: true,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        client
          ? {
              name: client.name,
              ruc: client.ruc ?? "",
              email: client.email ?? "",
              phone: client.phone ?? "",
              address: client.address ?? "",
              slaTypeId: client.slaTypeId,
              active: client.active,
            }
          : {
              name: "",
              ruc: "",
              email: "",
              phone: "",
              address: "",
              slaTypeId: "",
              active: true,
            },
      );
    }
  }, [client, form, open]);

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    try {
      const result =
        isEdit && client
          ? await updateClient({
              id: client.id,
              name: values.name,
              ruc: values.ruc || null,
              email: values.email || null,
              phone: values.phone || null,
              address: values.address || null,
              slaTypeId: values.slaTypeId,
              active: values.active,
            })
          : await createClient({
              name: values.name,
              ruc: values.ruc || null,
              email: values.email || null,
              phone: values.phone || null,
              address: values.address || null,
              slaTypeId: values.slaTypeId,
            });

      if (result.success) {
        toast.success(isEdit ? "Cliente actualizado" : "Cliente creado");
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar cliente" : "Nuevo cliente"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Modifica los datos del cliente"
              : "Registra un nuevo cliente en el sistema"}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la empresa</FormLabel>
                  <FormControl>
                    <Input placeholder="Empresa S.A." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ruc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RUC / NIT</FormLabel>
                    <FormControl>
                      <Input placeholder="12345678901" {...field} />
                    </FormControl>
                    <FormDescription>Opcional</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input placeholder="+58 412 1234567" {...field} />
                    </FormControl>
                    <FormDescription>Opcional</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="contacto@empresa.com"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Opcional</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input placeholder="Av. Principal..." {...field} />
                  </FormControl>
                  <FormDescription>Opcional</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slaTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de SLA</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un SLA" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {slaTypes.map((sla) => (
                        <SelectItem key={sla.id} value={sla.id}>
                          {sla.name} — resp. {sla.responseTimeHours}h
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEdit && (
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>Cliente activo</FormLabel>
                      <FormDescription>
                        Los clientes inactivos no pueden recibir nuevos tickets
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

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
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
