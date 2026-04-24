// src/components/system/support-types/support-type-form-drawer.tsx

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
import { Textarea } from "@/components/ui/textarea";
import {
  createSupportType,
  updateSupportType,
} from "@/lib/actions/support-type-actions";
import type { SupportTypeWithRelations } from "@/lib/actions/types/support-type-types";

const schema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(100),
  description: z.string().max(300).optional(),
});

type FormValues = z.infer<typeof schema>;

interface SupportTypeFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supportType?: SupportTypeWithRelations | null;
  onSuccess: () => void;
}

export function SupportTypeFormDrawer({
  open,
  onOpenChange,
  supportType,
  onSuccess,
}: SupportTypeFormDrawerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isEdit = !!supportType;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        supportType
          ? {
              name: supportType.name,
              description: supportType.description ?? "",
            }
          : { name: "", description: "" },
      );
    }
  }, [supportType, form, open]);

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    try {
      const result =
        isEdit && supportType
          ? await updateSupportType({
              id: supportType.id,
              ...values,
              description: values.description || null,
            })
          : await createSupportType({
              ...values,
              description: values.description || null,
            });

      if (result.success) {
        toast.success(isEdit ? "Tipo de soporte actualizado" : "Tipo de soporte creado");
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
          <SheetTitle>
            {isEdit ? "Editar tipo de soporte" : "Nuevo tipo de soporte"}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Modifica los datos del tipo de soporte"
              : "Agrega un nuevo tipo al catálogo de soportes"}
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
                    <Input placeholder="Correctivo, Preventivo..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descripción del tipo de soporte..."
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
