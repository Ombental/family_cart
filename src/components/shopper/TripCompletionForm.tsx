import { useState, useCallback, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import type { Store } from "@/types/store";

interface TripCompletionFormProps {
  stores: Store[];
  onAddStore: (name: string) => Promise<string>;
  initialStoreName?: string;
  initialAmount?: number;
  onSubmit: (data: { storeName: string; totalAmount: number }) => void;
  onCancel: () => void;
  submitting?: boolean;
  mode?: "complete" | "edit";
}

export function TripCompletionForm({
  stores,
  onAddStore,
  initialStoreName = "",
  initialAmount,
  onSubmit,
  onCancel,
  submitting = false,
  mode = "complete",
}: TripCompletionFormProps) {
  const { t } = useLanguage();
  const [storeName, setStoreName] = useState(initialStoreName);
  const [amount, setAmount] = useState(initialAmount != null ? String(initialAmount) : "");
  const [storeError, setStoreError] = useState("");
  const [amountError, setAmountError] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [addingStore, setAddingStore] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredStores = stores.filter((s) =>
    s.name.toLowerCase().includes(storeName.toLowerCase())
  );

  const exactMatch = stores.some(
    (s) => s.name.toLowerCase() === storeName.trim().toLowerCase()
  );

  const handleSelectStore = useCallback((name: string) => {
    setStoreName(name);
    setStoreError("");
    setShowDropdown(false);
  }, []);

  const handleAddNew = useCallback(async () => {
    const trimmed = storeName.trim();
    if (!trimmed) return;
    setAddingStore(true);
    try {
      await onAddStore(trimmed);
      setStoreName(trimmed);
      setStoreError("");
      setShowDropdown(false);
    } finally {
      setAddingStore(false);
    }
  }, [storeName, onAddStore]);

  const handleSubmit = useCallback(() => {
    let valid = true;
    const trimmedStore = storeName.trim();
    const parsedAmount = parseFloat(amount);

    if (!trimmedStore) {
      setStoreError(t("completion.storeRequired"));
      valid = false;
    } else {
      setStoreError("");
    }

    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setAmountError(t("completion.amountRequired"));
      valid = false;
    } else {
      setAmountError("");
    }

    if (valid) {
      onSubmit({ storeName: trimmedStore, totalAmount: parsedAmount });
    }
  }, [storeName, amount, onSubmit, t]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div className="w-full max-w-md rounded-t-2xl bg-white px-5 pt-6 pb-8 space-y-5 animate-in slide-in-from-bottom">
        {/* Store combobox */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[#1a1a1a]">
            {t("completion.store")}
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={storeName}
              onChange={(e) => {
                setStoreName(e.target.value);
                setStoreError("");
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder={t("completion.store")}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${
                storeError
                  ? "border-red-400 focus:border-red-500"
                  : "border-[#d4d4d4] focus:border-[#0d74ce]"
              }`}
              autoComplete="off"
            />
            {showDropdown && (filteredStores.length > 0 || (storeName.trim() && !exactMatch)) && (
              <div
                ref={dropdownRef}
                className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto rounded-lg border border-[#d4d4d4] bg-white shadow-lg z-10"
              >
                {filteredStores.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="w-full text-start px-3 py-2 text-sm hover:bg-[#f5f5f5] transition-colors"
                    onClick={() => handleSelectStore(s.name)}
                  >
                    {s.name}
                  </button>
                ))}
                {storeName.trim() && !exactMatch && (
                  <button
                    type="button"
                    className="w-full text-start px-3 py-2 text-sm font-medium text-[#0d74ce] hover:bg-[#e6f4fe] transition-colors"
                    onClick={handleAddNew}
                    disabled={addingStore}
                  >
                    {addingStore ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin inline me-1" />
                    ) : null}
                    {t("completion.addStore", { name: storeName.trim() })}
                  </button>
                )}
              </div>
            )}
          </div>
          {storeError && (
            <p className="text-xs text-red-500">{storeError}</p>
          )}
        </div>

        {/* Amount input */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[#1a1a1a]">
            {t("completion.totalAmount")}
          </label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setAmountError("");
            }}
            placeholder="0.00"
            className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${
              amountError
                ? "border-red-400 focus:border-red-500"
                : "border-[#d4d4d4] focus:border-[#0d74ce]"
            }`}
          />
          {amountError && (
            <p className="text-xs text-red-500">{amountError}</p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="ghost"
            className="flex-1 h-12 text-base"
            onClick={onCancel}
            disabled={submitting}
          >
            {t("completion.cancel")}
          </Button>
          <Button
            className="flex-1 h-12 text-base font-semibold rounded-xl bg-[#3e332e] text-white hover:bg-[#3e332e]/90"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting && <Loader2 className="h-5 w-5 animate-spin me-2" />}
            {mode === "edit" ? t("completion.save") : t("completion.complete")}
          </Button>
        </div>
      </div>
    </div>
  );
}
