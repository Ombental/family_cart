import * as React from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";

const MAX_VISIBLE = 8;

interface DepartmentComboboxProps {
  suggestions: string[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
}

export function DepartmentCombobox({
  suggestions,
  value,
  onChange,
  disabled = false,
  placeholder,
  className,
  id,
}: DepartmentComboboxProps) {
  const { t } = useLanguage();
  const searchRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [highlightIndex, setHighlightIndex] = React.useState(-1);

  // Filter suggestions based on search text (not the selected value)
  const filtered = React.useMemo(() => {
    const trimmed = search.trim().toLowerCase();
    const list =
      trimmed === ""
        ? suggestions
        : suggestions.filter((s) => s.toLowerCase().includes(trimmed));
    return list.slice(0, MAX_VISIBLE);
  }, [suggestions, search]);

  // Determine whether to show the "Create" row
  const trimmedSearch = search.trim();
  const hasExactMatch = filtered.some(
    (s) => s.toLowerCase() === trimmedSearch.toLowerCase()
  );
  const showCreate = trimmedSearch.length > 0 && !hasExactMatch;

  // Build full list of navigable items (suggestions + optional create row)
  const totalItems = filtered.length + (showCreate ? 1 : 0);
  const createIndex = showCreate ? filtered.length : -1;

  // Reset highlight when filtered list changes
  React.useEffect(() => {
    setHighlightIndex(-1);
  }, [filtered.length, showCreate]);

  function handleOpen() {
    if (disabled) return;
    setSearch("");
    setOpen(true);
  }

  function selectSuggestion(suggestion: string) {
    onChange(suggestion);
    setSearch("");
    setOpen(false);
  }

  function selectCreate() {
    onChange(trimmedSearch);
    setSearch("");
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (totalItems === 0) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev < totalItems - 1 ? prev + 1 : 0
        );
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev > 0 ? prev - 1 : totalItems - 1
        );
        break;
      }
      case "Enter": {
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < filtered.length) {
          selectSuggestion(filtered[highlightIndex]);
        } else if (highlightIndex === createIndex) {
          selectCreate();
        }
        break;
      }
      case "Escape": {
        e.preventDefault();
        setOpen(false);
        break;
      }
    }
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Anchor asChild>
        <button
          type="button"
          id={id}
          onClick={handleOpen}
          disabled={disabled}
          className={cn(
            "border-input flex h-9 w-full min-w-0 items-center justify-between rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            value ? "text-foreground" : "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">
            {value || placeholder || t("items.departmentPlaceholder")}
          </span>
          <ChevronDown className="text-muted-foreground ml-1 size-4 shrink-0" />
        </button>
      </PopoverPrimitive.Anchor>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="bottom"
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            searchRef.current?.focus();
          }}
          onCloseAutoFocus={(e) => e.preventDefault()}
          style={{ width: "var(--radix-popover-trigger-width)" }}
          className="z-[60] overflow-hidden rounded-lg bg-white shadow-lg"
        >
          {/* Search / autocomplete input */}
          <div className="border-b px-3 py-2">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("items.searchDepartment")}
              autoComplete="off"
              className="placeholder:text-muted-foreground h-7 w-full bg-transparent text-sm outline-none"
            />
          </div>

          {/* Options list */}
          <div className="max-h-48 overflow-y-auto">
            {filtered.map((suggestion, index) => (
              <div
                key={suggestion}
                role="option"
                aria-selected={index === highlightIndex}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => selectSuggestion(suggestion)}
                onMouseEnter={() => setHighlightIndex(index)}
                className={cn(
                  "flex cursor-pointer items-center px-3 py-2 text-sm",
                  index === highlightIndex && "bg-muted"
                )}
              >
                <span>{suggestion}</span>
              </div>
            ))}

            {showCreate && (
              <div
                role="option"
                aria-selected={createIndex === highlightIndex}
                onPointerDown={(e) => e.preventDefault()}
                onClick={selectCreate}
                onMouseEnter={() => setHighlightIndex(createIndex)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm",
                  createIndex === highlightIndex && "bg-muted"
                )}
              >
                <Plus className="size-4 shrink-0" />
                <span>
                  {t("items.createDepartment")} &ldquo;{trimmedSearch}&rdquo;
                </span>
              </div>
            )}

            {totalItems === 0 && (
              <div className="text-muted-foreground px-3 py-2 text-sm">
                {t("items.noDepartmentsFound")}
              </div>
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
