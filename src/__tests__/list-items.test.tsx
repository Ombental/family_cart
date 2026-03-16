/**
 * Integration tests for Sprint 2 list components.
 *
 * Covers:
 *   US-02  Add items to the shared list
 *   US-03  View consolidated list
 *   US-04  Edit/delete items
 *   US-06  View purchased items
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Timestamp } from "firebase/firestore";

import { AddItemForm } from "@/components/list/AddItemForm";
import { GroceryList } from "@/components/list/GroceryList";
import { ItemRow } from "@/components/list/ItemRow";
import { ItemActions } from "@/components/list/ItemActions";
import { EditItemForm } from "@/components/list/EditItemForm";
import { SyncBanner } from "@/components/list/SyncBanner";
import type { Item } from "@/types/item";
import type { Household } from "@/types/group";

// ---------------------------------------------------------------------------
// Mock sonner
// ---------------------------------------------------------------------------
const mockToast = vi.fn();
vi.mock("sonner", () => ({
  toast: Object.assign((...args: unknown[]) => mockToast(...args), {
    error: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Mock firebase (needed by transitive imports)
// ---------------------------------------------------------------------------
vi.mock("@/lib/firebase", () => ({
  db: {},
}));

// ---------------------------------------------------------------------------
// Test data factories
// ---------------------------------------------------------------------------

const now = Timestamp.now();

function buildItem(overrides: Partial<Item> = {}): Item {
  return {
    id: "item-1",
    name: "Milk",
    qty: 2,
    unit: "gallons",
    notes: "",
    householdId: "household-1",
    status: "pending",
    createdAt: now,
    addedDuringTripId: null,
    deleted: false,
    deletedAt: null,
    ...overrides,
  };
}

const households: Household[] = [
  { id: "household-1", name: "Smith Family", color: "#6366f1" },
  { id: "household-2", name: "Jones Family", color: "#f59e0b" },
];

// =========================================================================
// US-02: ADD ITEMS TO THE SHARED LIST
// =========================================================================

describe("US-02: AddItemForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders FAB that opens bottom sheet with name, qty, unit fields", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockResolvedValue("item-1");
    render(<AddItemForm onAdd={onAdd} />);

    // FAB should be visible
    const fab = screen.getByRole("button", { name: "Add item" });
    expect(fab).toBeInTheDocument();

    // Click FAB to open bottom sheet
    await user.click(fab);

    expect(screen.getByLabelText("Item name")).toBeInTheDocument();
    expect(screen.getByLabelText("Quantity")).toBeInTheDocument();
    expect(screen.getByLabelText("Unit")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add to List/i })).toBeInTheDocument();
  });

  it("calls onAdd with correct params on submit", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockResolvedValue("item-1");
    render(<AddItemForm onAdd={onAdd} />);

    // Open sheet
    await user.click(screen.getByRole("button", { name: "Add item" }));

    await user.type(screen.getByLabelText("Item name"), "Eggs");
    await user.type(screen.getByLabelText("Quantity"), "12");
    await user.selectOptions(screen.getByLabelText("Unit"), "pcs");

    await user.click(screen.getByRole("button", { name: /Add to List/i }));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith({
        name: "Eggs",
        qty: 12,
        unit: "pcs",
        notes: "",
        addedDuringTripId: null,
      });
    });
  });

  it("clears fields after successful submit (multi-item session)", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockResolvedValue("item-1");
    render(<AddItemForm onAdd={onAdd} />);

    // Open sheet
    await user.click(screen.getByRole("button", { name: "Add item" }));

    const nameInput = screen.getByLabelText("Item name");
    const qtyInput = screen.getByLabelText("Quantity");
    const unitInput = screen.getByLabelText("Unit");

    await user.type(nameInput, "Bread");
    await user.type(qtyInput, "2");
    await user.type(unitInput, "loaves");

    await user.click(screen.getByRole("button", { name: /Add to List/i }));

    await waitFor(() => {
      expect(nameInput).toHaveValue("");
    });
    expect(qtyInput).toHaveValue(null);
    expect(unitInput).toHaveValue("");
  });

  it("is disabled when `disabled` prop is true (offline state)", () => {
    const onAdd = vi.fn().mockResolvedValue("item-1");
    render(<AddItemForm onAdd={onAdd} disabled />);

    // FAB should be disabled — sheet cannot be opened
    expect(screen.getByRole("button", { name: "Add item" })).toBeDisabled();
  });

  it("requires name field (submit button disabled when empty)", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockResolvedValue("item-1");
    render(<AddItemForm onAdd={onAdd} />);

    // Open sheet
    await user.click(screen.getByRole("button", { name: "Add item" }));

    // Name field is empty by default, so submit should be disabled
    expect(screen.getByRole("button", { name: /Add to List/i })).toBeDisabled();
  });
});

// =========================================================================
// US-03: VIEW CONSOLIDATED LIST
// =========================================================================

describe("US-03: GroceryList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all items with household badges", () => {
    const items = [
      buildItem({ id: "1", name: "Milk", householdId: "household-1" }),
      buildItem({ id: "2", name: "Bread", householdId: "household-2" }),
    ];

    render(<GroceryList items={items} households={households} />);

    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(screen.getByText("Bread")).toBeInTheDocument();
  });

  it("shows empty state when no items", () => {
    render(<GroceryList items={[]} households={households} />);

    expect(screen.getByText("No items yet.")).toBeInTheDocument();
    expect(screen.getByText("Add something to get started.")).toBeInTheDocument();
  });

  it("filter pills filter items by household", async () => {
    const user = userEvent.setup();
    const items = [
      buildItem({ id: "1", name: "Milk", householdId: "household-1" }),
      buildItem({ id: "2", name: "Bread", householdId: "household-2" }),
    ];

    render(<GroceryList items={items} households={households} />);

    // Both items visible in "All" filter (default)
    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(screen.getByText("Bread")).toBeInTheDocument();

    // Household filter pills should be rendered
    const smithPill = screen.getByRole("button", { name: "Smith Family" });
    expect(smithPill).toBeInTheDocument();

    // Click household filter to show only that household's items
    await user.click(smithPill);

    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(screen.queryByText("Bread")).not.toBeInTheDocument();
  });
});

describe("US-03: ItemRow", () => {
  it("displays item name, qty + unit, and household color dot", () => {
    const item = buildItem({ name: "Eggs", qty: 12, unit: "pcs" });
    const household = households[0];

    const { container } = render(<ItemRow item={item} household={household} />);

    expect(screen.getByText("Eggs")).toBeInTheDocument();
    // Meta line now shows "Qty: 12 pcs · Smith Family"
    expect(screen.getByText(/Qty: 12 pcs/)).toBeInTheDocument();

    // Check that the color dot is rendered with the correct color
    const dot = container.querySelector("span[aria-hidden='true']");
    expect(dot).toBeTruthy();
    expect(dot).toHaveStyle({ backgroundColor: "#6366f1" });
  });
});

describe("US-03: SyncBanner", () => {
  it("renders warning when isOnline is false", () => {
    render(<SyncBanner isOnline={false} />);

    // The banner should contain some offline-related content
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("renders nothing when isOnline is true", () => {
    const { container } = render(<SyncBanner isOnline={true} />);

    expect(container.innerHTML).toBe("");
  });
});

// =========================================================================
// US-04: EDIT/DELETE ITEMS
// =========================================================================

describe("US-04: ItemActions", () => {
  it("renders edit/delete buttons only for own household items", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <ItemActions
        itemHouseholdId="household-1"
        currentHouseholdId="household-1"
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    expect(screen.getByRole("button", { name: "Edit item" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete item" })).toBeInTheDocument();
  });

  it("renders nothing for items from other households (ownership gate)", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    const { container } = render(
      <ItemActions
        itemHouseholdId="household-2"
        currentHouseholdId="household-1"
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    expect(container.innerHTML).toBe("");
  });
});

describe("US-04: EditItemForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders pre-filled fields and save/cancel buttons", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onCancel = vi.fn();

    render(
      <EditItemForm
        name="Milk"
        qty={2}
        unit="kg"
        notes="whole milk"
        onSave={onSave}
        onCancel={onCancel}
      />
    );

    expect(screen.getByDisplayValue("Milk")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2")).toBeInTheDocument();
    expect(screen.getByDisplayValue("kg")).toBeInTheDocument();
    expect(screen.getByDisplayValue("whole milk")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel editing" })).toBeInTheDocument();
  });

  it("calls onSave with updated fields", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onCancel = vi.fn();

    render(
      <EditItemForm
        name="Milk"
        qty={2}
        unit="gallons"
        notes=""
        onSave={onSave}
        onCancel={onCancel}
      />
    );

    // Update the name field
    const nameInput = screen.getByDisplayValue("Milk");
    await user.clear(nameInput);
    await user.type(nameInput, "Almond Milk");

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        name: "Almond Milk",
        qty: 2,
        unit: "gallons",
        notes: "",
      });
    });
  });

  it("calls onCancel when cancel is clicked", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onCancel = vi.fn();

    render(
      <EditItemForm
        name="Milk"
        qty={2}
        unit="gallons"
        notes=""
        onSave={onSave}
        onCancel={onCancel}
      />
    );

    await user.click(screen.getByRole("button", { name: "Cancel editing" }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe("US-04: deleteWithUndo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls softDelete and shows toast", async () => {
    // Dynamic import after mock is set up
    const { deleteWithUndo } = await import("@/lib/delete-with-undo");

    const softDelete = vi.fn().mockResolvedValue(undefined);
    const undoDelete = vi.fn().mockResolvedValue(undefined);

    await deleteWithUndo({
      itemName: "Milk",
      softDelete,
      undoDelete,
    });

    expect(softDelete).toHaveBeenCalledOnce();
    expect(mockToast).toHaveBeenCalledWith("Milk removed", expect.objectContaining({
      duration: 5000,
      action: expect.objectContaining({
        label: "Undo",
      }),
    }));
  });
});

// =========================================================================
// US-06: VIEW PURCHASED ITEMS
// =========================================================================

describe("US-06: Purchased items view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GroceryList separates pending and purchased items into sections", () => {
    const items = [
      buildItem({ id: "1", name: "Milk", status: "pending" }),
      buildItem({ id: "2", name: "Bread", status: "bought" }),
      buildItem({ id: "3", name: "Eggs", status: "pending" }),
    ];

    render(<GroceryList items={items} households={households} />);

    // Both pending items should be visible
    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(screen.getByText("Eggs")).toBeInTheDocument();

    // Purchased item should be visible
    expect(screen.getByText("Bread")).toBeInTheDocument();

    // Should have a "Purchased" section header
    expect(screen.getByText(/Purchased/)).toBeInTheDocument();
  });

  it("GroceryList shows progress count 'X of Y done' when purchased items exist", () => {
    const items = [
      buildItem({ id: "1", name: "Milk", status: "pending" }),
      buildItem({ id: "2", name: "Bread", status: "bought" }),
      buildItem({ id: "3", name: "Eggs", status: "bought" }),
    ];

    render(<GroceryList items={items} households={households} />);

    expect(screen.getByText("2 of 3 done")).toBeInTheDocument();
  });

  it("ItemRow applies strikethrough + reduced opacity for 'bought' items", () => {
    const item = buildItem({ name: "Bread", status: "bought" });

    const { container } = render(
      <ItemRow item={item} household={households[0]} />
    );

    // The outer div should have opacity-50 class
    const row = container.firstElementChild;
    expect(row?.className).toContain("opacity-50");

    // The item name span should have line-through class
    const nameSpan = screen.getByText("Bread");
    expect(nameSpan.className).toContain("line-through");
  });

  it("ItemRow shows normal styling for 'pending' items", () => {
    const item = buildItem({ name: "Milk", status: "pending" });

    const { container } = render(
      <ItemRow item={item} household={households[0]} />
    );

    // The outer div should NOT have opacity-50 class
    const row = container.firstElementChild;
    expect(row?.className).not.toContain("opacity-50");

    // The item name span should NOT have line-through
    const nameSpan = screen.getByText("Milk");
    expect(nameSpan.className).not.toContain("line-through");
  });
});
