/**
 * EditItemForm -- inline edit form that replaces an item row when in edit mode.
 *
 * Pre-filled with the item's current values. The user can save changes or
 * cancel to return to the normal display.
 */

import { useState, type FormEvent } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ItemCombobox } from "./ItemCombobox";
import { useLanguage } from "@/i18n/LanguageContext";
import type { ItemSuggestion } from "@/hooks/useItemCatalog";
import { UNIT_OPTIONS } from "@/lib/units";

export interface EditItemFormProps {
  /** Current item name. */
  name: string;
  /** Current item quantity. */
  qty: number;
  /** Current item unit. */
  unit: string;
  /** Current item notes. */
  notes: string;
  /** Catalog suggestions for the combobox. */
  suggestions?: ItemSuggestion[];
  /** Called with updated fields when the user saves. */
  onSave: (fields: {
    name: string;
    qty: number;
    unit: string;
    notes: string;
  }) => Promise<void>;
  /** Called when the user cancels editing. */
  onCancel: () => void;
}

export function EditItemForm({
  name: initialName,
  qty: initialQty,
  unit: initialUnit,
  notes: initialNotes,
  suggestions,
  onSave,
  onCancel,
}: EditItemFormProps) {
  const { t } = useLanguage();
  const [name, setName] = useState(initialName);
  const [qty, setQty] = useState(initialQty);
  const [unit, setUnit] = useState(initialUnit);
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        qty,
        unit: unit.trim(),
        notes: notes.trim(),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 py-1">
      <div className="flex items-center gap-2">
        {/* Name -- takes most of the row */}
        <ItemCombobox
          value={name}
          onChange={setName}
          onSelect={(suggestion) => setName(suggestion.name)}
          suggestions={suggestions ?? []}
          autoFocus={true}
          disabled={saving}
          placeholder={t("items.itemNameEditPlaceholder")}
          className="h-7 text-sm flex-1"
        />
        {/* Qty */}
        <Input
          type="number"
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
          min={1}
          className="h-7 text-sm w-14 text-center"
          disabled={saving}
        />
        {/* Unit */}
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          disabled={saving}
          className="h-7 w-20 rounded-md border border-input bg-background px-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">—</option>
          {UNIT_OPTIONS.map((u) => (
            <option key={u.value} value={u.value}>
              {t("units." + u.value)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        {/* Notes */}
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("items.notesEditPlaceholder")}
          className="h-7 text-sm flex-1"
          disabled={saving}
        />

        {/* Action buttons */}
        <Button
          type="submit"
          variant="ghost"
          size="icon-xs"
          disabled={saving || !name.trim()}
          aria-label={t("items.saveChanges")}
        >
          <Check className="size-3.5 text-green-600" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onCancel}
          disabled={saving}
          aria-label={t("items.cancelEditing")}
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </form>
  );
}
