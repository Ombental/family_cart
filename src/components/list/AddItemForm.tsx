import { useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Plus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ItemCombobox } from "./ItemCombobox";
import { DepartmentCombobox } from "./DepartmentCombobox";
import { useLanguage } from "@/i18n/LanguageContext";
import type { ItemSuggestion } from "@/hooks/useItemCatalog";
import { UNIT_OPTIONS } from "@/lib/units";

interface AddItemFormProps {
  onAdd: (params: {
    name: string;
    qty: number;
    unit: string;
    notes: string;
    department?: string;
    addedDuringTripId?: string | null;
  }) => Promise<string>;
  disabled?: boolean;
  /** When provided, attaches the trip ID to newly added items (Shopper Mode). */
  addedDuringTripId?: string | null;
  suggestions?: ItemSuggestion[];
  /** Department suggestions from useDepartmentCatalog. */
  departmentSuggestions?: string[];
}

/**
 * Floating Action Button + bottom sheet modal for adding items.
 *
 * The FAB renders as a green circle at bottom-right (above bottom nav).
 * Tapping it opens a bottom sheet overlay with stacked form fields
 * (name, qty + unit, notes) and an "Add to List" button.
 *
 * After submit the fields clear for fast multi-item entry. The sheet
 * stays open so users can add multiple items in a row.
 *
 * The entire form is disabled when the `disabled` prop is true (offline).
 */
export function AddItemForm({ onAdd, disabled = false, addedDuringTripId, suggestions, departmentSuggestions }: AddItemFormProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <AddItemFAB onClick={() => setOpen(true)} disabled={disabled} />
      {open && (
        <AddItemSheet
          onAdd={onAdd}
          disabled={disabled}
          addedDuringTripId={addedDuringTripId}
          onClose={() => setOpen(false)}
          suggestions={suggestions}
          departmentSuggestions={departmentSuggestions}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  FAB                                                                */
/* ------------------------------------------------------------------ */

function AddItemFAB({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  const { t } = useLanguage();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={t("items.addItem")}
      className="fixed bottom-20 end-4 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform active:scale-95 disabled:opacity-50"
      style={{ backgroundColor: "#2a7e3b" }}
    >
      <Plus className="h-7 w-7 text-white" />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Bottom sheet                                                       */
/* ------------------------------------------------------------------ */

function AddItemSheet({
  onAdd,
  disabled,
  addedDuringTripId,
  onClose,
  suggestions,
  departmentSuggestions,
}: {
  onAdd: AddItemFormProps["onAdd"];
  disabled: boolean;
  addedDuringTripId?: string | null;
  onClose: () => void;
  suggestions?: ItemSuggestion[];
  departmentSuggestions?: string[];
}) {
  const { t } = useLanguage();
  const nameRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("");
  const [notes, setNotes] = useState("");
  const [department, setDepartment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = name.trim().length > 0 && !submitting && !disabled;

  // Focus name field on open
  useEffect(() => {
    // Small timeout so the animation frame can complete
    const timer = setTimeout(() => nameRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Prevent background scroll when sheet is open
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit) return;

      setSubmitting(true);
      try {
        await onAdd({
          name: name.trim(),
          qty: qty ? Number(qty) : 1,
          unit: unit.trim(),
          notes: notes.trim(),
          department: department.trim(),
          addedDuringTripId: addedDuringTripId ?? null,
        });

        // Clear fields for next item; keep sheet open
        setName("");
        setQty("");
        setUnit("");
        setNotes("");
        setDepartment("");
        nameRef.current?.focus();
      } finally {
        setSubmitting(false);
      }
    },
    [canSubmit, name, qty, unit, notes, department, addedDuringTripId, onAdd]
  );

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end" aria-modal="true" role="dialog">
      {/* Overlay backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet card */}
      <div className="relative z-10 w-full bg-white rounded-t-2xl px-6 pt-3 pb-8 shadow-2xl animate-in slide-in-from-bottom duration-200">
        {/* Drag handle */}
        <div className="flex justify-center mb-4">
          <div className="h-1 w-10 rounded-full bg-[#d1d1d1]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">{t("items.addItemTitle")}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="rounded-full p-1 hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5 text-[#82827c]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" aria-label={t("items.addItem")}>
          {/* Name field */}
          <div className="space-y-1.5">
            <Label htmlFor="add-item-name" className="text-[13px] font-medium text-[#4a4a4a]">
              {t("items.itemName")}
            </Label>
            <ItemCombobox
              id="add-item-name"
              placeholder={t("items.itemNamePlaceholder")}
              value={name}
              onChange={setName}
              onSelect={(suggestion) => {
                setName(suggestion.name);
                if (!qty) setQty(String(suggestion.qty));
                if (!unit) setUnit(suggestion.unit);
                if (!notes) setNotes(suggestion.notes);
                if (!department) setDepartment(suggestion.department);
              }}
              suggestions={suggestions ?? []}
              disabled={disabled}
              className="h-11"
              autoFocus
            />
          </div>

          {/* Qty + Unit row */}
          <div className="flex gap-3">
            <div className="w-24 space-y-1.5">
              <Label htmlFor="add-item-qty" className="text-[13px] font-medium text-[#4a4a4a]">
                {t("items.quantity")}
              </Label>
              <Input
                id="add-item-qty"
                type="number"
                placeholder="1"
                min={1}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                disabled={disabled}
                className="h-11"
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="add-item-unit" className="text-[13px] font-medium text-[#4a4a4a]">
                {t("items.unit")}
              </Label>
              <select
                id="add-item-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                disabled={disabled}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">—</option>
                {UNIT_OPTIONS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {t("units." + u.value)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Department */}
          <div className="space-y-1.5">
            <Label htmlFor="add-item-department" className="text-[13px] font-medium text-[#4a4a4a]">
              {t("items.department")}
            </Label>
            <DepartmentCombobox
              id="add-item-department"
              placeholder={t("items.departmentPlaceholder")}
              value={department}
              onChange={setDepartment}
              suggestions={departmentSuggestions ?? []}
              disabled={disabled}
              className="h-11"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="add-item-notes" className="text-[13px] font-medium text-[#4a4a4a]">
              {t("items.notesOptional")}
            </Label>
            <Input
              id="add-item-notes"
              type="text"
              placeholder={t("items.notesPlaceholder")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={disabled}
              className="h-11"
            />
          </div>

          {/* Submit button */}
          <Button
            type="submit"
            disabled={!canSubmit}
            className="w-full h-12 text-[15px] font-semibold rounded-xl"
            style={{ backgroundColor: "#2a7e3b" }}
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              t("items.addToList")
            )}
          </Button>
        </form>
      </div>
    </div>,
    document.body
  );
}
