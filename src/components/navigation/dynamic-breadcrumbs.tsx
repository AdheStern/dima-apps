// src/components/navigation/dynamic-breadcrumbs.tsx

"use client";

import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useBreadcrumbs } from "@/hooks/use-breadcrumbs";

/**
 * Componente que renderiza breadcrumbs dinámicos basados en la ruta actual
 * Implementa el patrón Composite para estructuras jerárquicas
 */
export function DynamicBreadcrumbs() {
  const breadcrumbs = useBreadcrumbs();

  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <Breadcrumb className="hidden sm:block">
      <BreadcrumbList>
        {breadcrumbs.map((item, index) => (
          <BreadcrumbItemWrapper
            key={item.href}
            item={item}
            isLast={index === breadcrumbs.length - 1}
          />
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

/**
 * Componente wrapper para cada item del breadcrumb
 * Aplica el patrón Template Method para renderizado condicional
 */
interface BreadcrumbItemWrapperProps {
  item: {
    label: string;
    href: string;
    isCurrentPage: boolean;
  };
  isLast: boolean;
}

function BreadcrumbItemWrapper({ item, isLast }: BreadcrumbItemWrapperProps) {
  const isDimaRoot = item.label === "DIMA";

  return (
    <>
      <BreadcrumbItem>
        {item.isCurrentPage ? (
          <BreadcrumbPage>{item.label}</BreadcrumbPage>
        ) : (
          <BreadcrumbLink
            asChild
            className={
              isDimaRoot
                ? "flex items-center gap-2 font-2xl hover:text-green-500"
                : undefined
            }
            style={
              isDimaRoot ? { fontFamily: "'Audiowide', sans-serif" } : undefined
            }
          >
            <Link href={item.href}>{item.label}</Link>
          </BreadcrumbLink>
        )}
      </BreadcrumbItem>
      {!isLast && <BreadcrumbSeparator />}
    </>
  );
}
