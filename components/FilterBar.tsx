"use client";

import React from "react";
import { Plus } from "lucide-react";

export interface FilterCategory {
  id: string;
  label: string;
}

interface FilterBarProps<T extends { categoryCode: string }> {
  items: T[];
  categories: FilterCategory[];
  activeFilter: string;
  onFilterChange: (id: string) => void;
}

export function FilterBar<T extends { categoryCode: string }>({
  items,
  categories,
  activeFilter,
  onFilterChange,
}: FilterBarProps<T>) {
  const countFor = (id: string) =>
    id === "ALL"
      ? items.length
      : items.filter((item) => item.categoryCode === id.toLowerCase()).length;

  const visibleCategories = categories.filter((c) => countFor(c.id) > 0);

  return (
    <div className="flex flex-wrap items-center gap-3.5 mb-16 select-none">
      {visibleCategories.map((category) => {
        const isActive = activeFilter === category.id;
        return (
          <button
            key={category.id}
            onClick={() => onFilterChange(category.id)}
            aria-pressed={isActive}
            className={`px-6 py-3.5 rounded-none text-xs sm:text-sm font-mono font-bold tracking-wider uppercase transition-all duration-300 flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${
              isActive
                ? // The selected pill still answers the cursor. Clicking it
                  // does nothing, but a pointer landing on a control and
                  // getting no acknowledgement at all is the one thing the
                  // interaction inventory rules out.
                  "bg-foreground text-background shadow-xl scale-105 border border-foreground hover:bg-foreground/85"
                : "bg-surface-card border border-border-custom text-foreground-secondary hover:text-foreground hover:border-foreground"
            }`}
          >
            <span>
              {category.label}{" "}
              <sup className="text-[11px] opacity-70">({countFor(category.id)})</sup>
            </span>
            <Plus className="w-4 h-4" />
          </button>
        );
      })}
    </div>
  );
}
