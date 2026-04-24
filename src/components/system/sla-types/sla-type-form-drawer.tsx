// src/components/system/sla-types/sla-type-form-drawer.tsx

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
import { createSlaType, updateSlaType } from "@/lib/actions/sla-type-actions";
import type { SlaTypeWithRelations } from "@/lib/actions/types/sla-type-types";

const schema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(50),
  description: z.string().max(200).optional(),
  hoursPerDay: z.coerce
    .number()
    .int()
    .min(1, "Mínimo 1")
    .max(24, "Máximo 24"),
  daysPerWeek: z.coerce
    .number()
    .int()
    .min(1, "Mínimo 1")
    .max(7, "Máximo 7"),
  responseTimeHours: z.coerce.number().int().min(1, "Mínimo 1 hora"),
});

type FormValues = z.infer<typeof schema>;

interface SlaTypeFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slaType?: SlaTypeWithRelations | null;
  onSuccess: () => void;
}

export function SlaTypeFormDrawer({
  open,
  onOpenChange,
  slaType,
  onSuccess,
}: SlaTypeFormDrawerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isEdit = !!slaType;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      hoursPerDay: 8,
      daysPerWeek: 5,
      responseTimeHours: 4,
    },
  });

  useEffect(() => {
    if (open) {
      if (slaType) {
        form.reset({
          name: slaType.name,
          description: slaType.description ?? "",
          hoursPerDay: slaType.hoursPerDay,
          daysPerWeek: slaType.daysPerWeek,
          responseTimeHours: slaType.responseTimeHours,
        });
      } else {
        form.reset({
          name: "",
          description: "",
          hoursPerDay: 8,
          daysPerWeek: 5,
          responseTimeHours: 4,
        });
      }
    }
  }, [slaType, form, open]);

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    try {
      const result = isEdit && slaType
        ? await updateSlaType({ id: slaType.id, ...values, description: values.description || null })
        : await createSlaType({ ...values, description: values.description || null });

      if (result.success) {
        toast.success(isEdit ? "SLA actualizado" : "SLA creado");
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
          <SheetTitle>{isEdit ? "Editar SLA" : "Nuevo tipo de SLA"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Modifica los datos del tipo de SLA"
              : "Define la cobertura y tiempo de respuesta"}
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
                    <Input placeholder="24x7, 8x5..." {...field} />
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
                      placeholder="Descripción del SLA..."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Opcional</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="hoursPerDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horas / día</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={24} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="daysPerWeek"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Días / semana</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={7} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="responseTimeHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tiempo de respuesta (horas)</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} {...field} />
                  </FormControl>
                  <FormDescription>
                    Tiempo máximo comprometido de primera respuesta
                  </FormDescription>
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
