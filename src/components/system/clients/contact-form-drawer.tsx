// src/components/system/clients/contact-form-drawer.tsx

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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  addClientContact,
  updateClientContact,
} from "@/lib/actions/client-actions";
import type { ClientContactWithRelations } from "@/lib/actions/types/client-types";

const schema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(100),
  position: z.string().max(100).optional(),
  email: z.string().email("Email inválido"),
  phone: z.string().max(20).optional(),
  isPrimary: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface ContactFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  contact?: ClientContactWithRelations | null;
  onSuccess: () => void;
}

export function ContactFormDrawer({
  open,
  onOpenChange,
  clientId,
  contact,
  onSuccess,
}: ContactFormDrawerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isEdit = !!contact;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      position: "",
      email: "",
      phone: "",
      isPrimary: false,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        contact
          ? {
              name: contact.name,
              position: contact.position ?? "",
              email: contact.email,
              phone: contact.phone ?? "",
              isPrimary: contact.isPrimary,
            }
          : { name: "", position: "", email: "", phone: "", isPrimary: false },
      );
    }
  }, [contact, form, open]);

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    try {
      const result =
        isEdit && contact
          ? await updateClientContact({
              id: contact.id,
              name: values.name,
              position: values.position || null,
              email: values.email,
              phone: values.phone || null,
              isPrimary: values.isPrimary,
            })
          : await addClientContact({
              clientId,
              name: values.name,
              position: values.position || null,
              email: values.email,
              phone: values.phone || null,
              isPrimary: values.isPrimary,
            });

      if (result.success) {
        toast.success(isEdit ? "Contacto actualizado" : "Contacto agregado");
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
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar contacto" : "Nuevo contacto"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Modifica los datos del contacto"
              : "Agrega un contacto para este cliente"}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Juan Pérez" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cargo</FormLabel>
                  <FormControl>
                    <Input placeholder="Gerente de TI" {...field} />
                  </FormControl>
                  <FormDescription>Opcional</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="juan@empresa.com"
                      {...field}
                    />
                  </FormControl>
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

            <FormField
              control={form.control}
              name="isPrimary"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>Contacto principal</FormLabel>
                    <FormDescription>
                      Usado por defecto para notificaciones y conformidades
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
                {isEdit ? "Actualizar" : "Agregar"}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
