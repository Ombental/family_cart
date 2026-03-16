import * as React from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ItemSuggestion } from "@/hooks/useItemCatalog";

const MAX_VISIBLE = 8;

interface ItemComboboxProps {
  suggestions: ItemSuggestion[];
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: ItemSuggestion) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  autoFocus?: boolean;
}

export function ItemCombobox({
  suggestions,
  value,
  onChange,
  onSelect,
  disabled = false,
  placeholder,
  className,
  id,
  autoFocus = false,
}: ItemComboboxProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [highlightIndex, setHighlightIndex] = React.useState(-1);

  // Auto-focus on mount
  React.useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Filter suggestions based on current value
  const filtered = React.useMemo(() => {
    const trimmed = value.trim().toLowerCase();
    const list =
      trimmed === ""
        ? suggestions
        : suggestions.filter((s) =>
            s.name.toLowerCase().includes(trimmed)
          );
    return list.slice(0, MAX_VISIBLE);
  }, [suggestions, value]);

  // Determine whether to show the "Create" row
  const trimmedValue = value.trim();
  const hasExactMatch = filtered.some(
    (s) => s.name.toLowerCase() === trimmedValue.toLowerCase()
  );
  const showCreate = trimmedValue.length > 0 && !hasExactMatch;

  // Build full list of navigable items (suggestions + optional create row)
  const totalItems = filtered.length + (showCreate ? 1 : 0);
  const createIndex = showCreate ? filtered.length : -1;

  // Reset highlight when filtered list changes
  React.useEffect(() => {
    setHighlightIndex(-1);
  }, [filtered.length, showCreate]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value);
    if (!open) setOpen(true);
  }

  function handleInputFocus() {
    setOpen(true);
  }

  function selectSuggestion(suggestion: ItemSuggestion) {
    onSelect(suggestion);
    onChange(suggestion.name);
    setOpen(false);
  }

  function selectCreate() {
    // Keep typed text as-is, just close dropdown
    onChange(value);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || totalItems === 0) {
      // Open on arrow down even if closed
      if (e.key === "ArrowDown") {
        setOpen(true);
        e.preventDefault();
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

  const shouldShowDropdown = open && totalItems > 0;

  return (
    <PopoverPrimitive.Root open={shouldShowDropdown}>
      <PopoverPrimitive.Anchor asChild>
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          className={cn(
            "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
            className
          )}
        />
      </PopoverPrimitive.Anchor>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="bottom"
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={() => setOpen(false)}
          onPointerDownOutside={() => setOpen(false)}
          style={{ width: "var(--radix-popover-trigger-width)" }}
          className="z-[60] max-h-56 overflow-y-auto rounded-lg bg-white shadow-lg"
        >
          {filtered.map((suggestion, index) => (
            <div
              key={suggestion.name}
              role="option"
              aria-selected={index === highlightIndex}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => selectSuggestion(suggestion)}
              onMouseEnter={() => setHighlightIndex(index)}
              className={cn(
                "flex cursor-pointer items-center justify-between px-3 py-2 text-sm",
                index === highlightIndex && "bg-muted"
              )}
            >
              <span>{suggestion.name}</span>
              {suggestion.unit && (
                <span className="text-muted-foreground ms-2 shrink-0">
                  {suggestion.qty} {suggestion.unit}
                </span>
              )}
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
                Create &ldquo;{trimmedValue}&rdquo;
              </span>
            </div>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
