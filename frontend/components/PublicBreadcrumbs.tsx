import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PublicBreadcrumbItem = {
  label: ReactNode;
  href?: string;
};

type PublicBreadcrumbsProps = {
  items: PublicBreadcrumbItem[];
  className?: string;
  variant?: "light" | "dark";
};

export default function PublicBreadcrumbs({
  items,
  className,
  variant = "light",
}: PublicBreadcrumbsProps) {
  if (items.length === 0) return null;

  const isDark = variant === "dark";
  const linkClassName = isDark
    ? "text-white/80 hover:text-white"
    : "text-slate-500 hover:text-[#0D2B52]";
  const currentClassName = isDark ? "text-white" : "text-[#0D2B52]";
  const separatorClassName = isDark ? "text-[#D4AF37]" : "text-[#B68D40]";

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("text-sm font-semibold", className)}
    >
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex min-w-0 items-center gap-2">
              {item.href && !isLast ? (
                <Link className={cn("transition", linkClassName)} href={item.href}>
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    "max-w-full truncate",
                    isLast ? currentClassName : linkClassName
                  )}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast && (
                <ChevronRight
                  aria-hidden="true"
                  className={cn("h-4 w-4 shrink-0", separatorClassName)}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
