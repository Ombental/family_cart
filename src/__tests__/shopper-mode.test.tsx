/**
 * Component + integration tests for Sprint 3 — Shopper Mode + Check-off.
 *
 * Covers:
 *   US-07  ShopperItemRow, ConflictDialog
 *   US-08  OfflineBanner, GroceryList check-off, ItemRow onClick
 *   US-13  useGroupedItems hook, ShopperGroupCard
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Timestamp } from "firebase/firestore";

import { renderHook } from "@testing-library/react";

import type { Item } from "@/types/item";
import type { Household } from "@/types/group";

// ---------------------------------------------------------------------------
// Mock firebase (needed by transitive imports)
// ---------------------------------------------------------------------------
vi.mock("@/lib/firebase", () => ({
  db: {},
}));

// ---------------------------------------------------------------------------
// Mock sonner (used by transitive imports)
// ---------------------------------------------------------------------------
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    error: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Import components after mocks
// ---------------------------------------------------------------------------
import { ShopperItemRow } from "@/components/shopper/ShopperItemRow";
import { ShopperGroupCard } from "@/components/shopper/ShopperGroupCard";
import { ConflictDialog } from "@/components/shopper/ConflictDialog";
import { OfflineBanner } from "@/components/shopper/OfflineBanner";
import { GroceryList } from "@/components/list/GroceryList";
import { ItemRow } from "@/components/list/ItemRow";
import { useGroupedItems } from "@/hooks/useGroupedItems";
import { useDepartmentCatalog } from "@/hooks/useDepartmentCatalog";

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
    department: "",
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
// US-07: SHOPPER ITEM ROW
// =========================================================================

describe("US-07: ShopperItemRow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders item name and qty", () => {
    const item = buildItem({ name: "Eggs", qty: 12, unit: "pcs" });
    const onToggle = vi.fn();

    render(
      <ShopperItemRow
        item={item}
        household={households[0]}
        activeTripId="trip-1"
        onToggle={onToggle}
      />
    );

    expect(screen.getByText("Eggs")).toBeInTheDocument();
    expect(screen.getByText("12 pcs")).toBeInTheDocument();
  });

  it("shows checked state when item is bought", () => {
    const item = buildItem({ name: "Bread", status: "bought" });
    const onToggle = vi.fn();

    render(
      <ShopperItemRow
        item={item}
        household={households[0]}
        activeTripId="trip-1"
        onToggle={onToggle}
      />
    );

    // The button aria-label indicates "Uncheck" for bought items
    expect(
      screen.getByRole("button", { name: /uncheck bread/i })
    ).toBeInTheDocument();
  });

  it("shows empty state when item is pending", () => {
    const item = buildItem({ name: "Milk", status: "pending" });
    const onToggle = vi.fn();

    render(
      <ShopperItemRow
        item={item}
        household={households[0]}
        activeTripId="trip-1"
        onToggle={onToggle}
      />
    );

    // The button aria-label indicates "Check off" for pending items
    expect(
      screen.getByRole("button", { name: /check off milk/i })
    ).toBeInTheDocument();
  });

  it("shows 'New' badge when addedDuringTripId matches activeTripId", () => {
    const item = buildItem({
      name: "Bananas",
      addedDuringTripId: "trip-active-1",
    });
    const onToggle = vi.fn();

    render(
      <ShopperItemRow
        item={item}
        household={households[0]}
        activeTripId="trip-active-1"
        onToggle={onToggle}
      />
    );

    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("does not show 'New' badge when addedDuringTripId does not match", () => {
    const item = buildItem({
      name: "Bananas",
      addedDuringTripId: "trip-old",
    });
    const onToggle = vi.fn();

    render(
      <ShopperItemRow
        item={item}
        household={households[0]}
        activeTripId="trip-active-1"
        onToggle={onToggle}
      />
    );

    expect(screen.queryByText("New")).not.toBeInTheDocument();
  });

  it("calls onToggle when clicked", async () => {
    const user = userEvent.setup();
    const item = buildItem({ id: "item-42", name: "Cheese" });
    const onToggle = vi.fn().mockResolvedValue(undefined);

    render(
      <ShopperItemRow
        item={item}
        household={households[0]}
        activeTripId="trip-1"
        onToggle={onToggle}
      />
    );

    const button = screen.getByRole("button", { name: /check off cheese/i });
    await user.click(button);

    expect(onToggle).toHaveBeenCalledOnce();
    expect(onToggle).toHaveBeenCalledWith("item-42");
  });

  it("applies strikethrough styling when bought", () => {
    const item = buildItem({ name: "Bread", status: "bought" });
    const onToggle = vi.fn();

    render(
      <ShopperItemRow
        item={item}
        household={households[0]}
        activeTripId="trip-1"
        onToggle={onToggle}
      />
    );

    const nameSpan = screen.getByText("Bread");
    expect(nameSpan.className).toContain("line-through");
  });
});

// =========================================================================
// US-07: CONFLICT DIALOG
// =========================================================================

describe("US-07: ConflictDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows household name in conflict message", () => {
    render(
      <ConflictDialog
        open={true}
        onOpenChange={vi.fn()}
        shopperHouseholdName="Jones Family"
      />
    );

    expect(
      screen.getByText(/jones family is already on a shopping trip/i)
    ).toBeInTheDocument();
    expect(screen.getByText("Trip Already Active")).toBeInTheDocument();
  });

  it("calls onOpenChange when 'Got it' is clicked", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <ConflictDialog
        open={true}
        onOpenChange={onOpenChange}
        shopperHouseholdName="Jones Family"
      />
    );

    const gotItButton = screen.getByRole("button", { name: "Got it" });
    await user.click(gotItButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

// =========================================================================
// US-08: OFFLINE BANNER
// =========================================================================

describe("US-08: OfflineBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows offline message when not online", () => {
    render(<OfflineBanner isOnline={false} />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    // The component uses &mdash; which renders as em-dash
    expect(
      screen.getByText(/you're offline/i)
    ).toBeInTheDocument();
  });

  it("hides when online", () => {
    const { container } = render(<OfflineBanner isOnline={true} />);

    expect(container.innerHTML).toBe("");
  });
});

// =========================================================================
// US-08: GROCERY LIST CHECK-OFF INTEGRATION
// =========================================================================

describe("US-08: GroceryList check-off integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes onClick to ItemRow when onToggleStatus is provided", async () => {
    const user = userEvent.setup();
    const onToggleStatus = vi.fn();
    const items = [
      buildItem({ id: "1", name: "Milk", status: "pending" }),
    ];

    render(
      <GroceryList
        items={items}
        households={households}
        onToggleStatus={onToggleStatus}
      />
    );

    // When onToggleStatus is provided, the item row should become clickable
    const clickableRow = screen.getByRole("button", { name: /milk/i });
    await user.click(clickableRow);

    expect(onToggleStatus).toHaveBeenCalledOnce();
    expect(onToggleStatus).toHaveBeenCalledWith(
      expect.objectContaining({ id: "1", name: "Milk" })
    );
  });

  it("does not pass onClick when onToggleStatus is omitted", () => {
    const items = [
      buildItem({ id: "1", name: "Milk", status: "pending" }),
    ];

    render(
      <GroceryList items={items} households={households} />
    );

    // Items should NOT have role="button" when onToggleStatus is not provided
    expect(screen.queryByRole("button", { name: /milk/i })).not.toBeInTheDocument();
  });
});

// =========================================================================
// US-08: ITEM ROW onClick
// =========================================================================

describe("US-08: ItemRow onClick", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders as clickable when onClick is provided", () => {
    const item = buildItem({ name: "Eggs" });
    const onClick = vi.fn();

    render(
      <ItemRow item={item} household={households[0]} onClick={onClick} />
    );

    const row = screen.getByRole("button");
    expect(row).toBeInTheDocument();
    expect(row).toHaveAttribute("tabindex", "0");
  });

  it("does not render as clickable when onClick is omitted", () => {
    const item = buildItem({ name: "Eggs" });

    render(<ItemRow item={item} household={households[0]} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

// =========================================================================
// US-13: useGroupedItems HOOK
// =========================================================================

describe("US-13: useGroupedItems hook", () => {
  const householdMap = new Map<string, Household>([
    ["household-1", { id: "household-1", name: "Smith Family", color: "#6366f1" }],
    ["household-2", { id: "household-2", name: "Jones Family", color: "#f59e0b" }],
    ["household-3", { id: "household-3", name: "Adams Family", color: "#22c55e" }],
  ]);

  it("groups items with same name", () => {
    const items = [
      buildItem({ id: "1", name: "Milk", householdId: "household-1" }),
      buildItem({ id: "2", name: "Milk", householdId: "household-2" }),
      buildItem({ id: "3", name: "Bread", householdId: "household-1" }),
    ];

    const { result } = renderHook(() => useGroupedItems(items, householdMap));

    expect(result.current.pendingGroups).toHaveLength(2);
    const milkGroup = result.current.pendingGroups.find((g) => g.key === "milk");
    expect(milkGroup?.items).toHaveLength(2);
    const breadGroup = result.current.pendingGroups.find((g) => g.key === "bread");
    expect(breadGroup?.items).toHaveLength(1);
  });

  it("matches case-insensitive and trimmed", () => {
    const items = [
      buildItem({ id: "1", name: "Milk", householdId: "household-1" }),
      buildItem({ id: "2", name: " milk ", householdId: "household-2" }),
      buildItem({ id: "3", name: "MILK", householdId: "household-3" }),
    ];

    const { result } = renderHook(() => useGroupedItems(items, householdMap));

    expect(result.current.pendingGroups).toHaveLength(1);
    expect(result.current.pendingGroups[0].items).toHaveLength(3);
  });

  it("picks canonical name from earliest createdAt", () => {
    const earlier = Timestamp.fromMillis(1000);
    const later = Timestamp.fromMillis(2000);

    const items = [
      buildItem({ id: "1", name: "MILK", householdId: "household-1", createdAt: later }),
      buildItem({ id: "2", name: "milk", householdId: "household-2", createdAt: earlier }),
    ];

    const { result } = renderHook(() => useGroupedItems(items, householdMap));

    expect(result.current.pendingGroups[0].canonicalName).toBe("milk");
  });

  it("computes householdCount as distinct count", () => {
    const items = [
      buildItem({ id: "1", name: "Milk", householdId: "household-1" }),
      buildItem({ id: "2", name: "Milk", householdId: "household-1" }),
      buildItem({ id: "3", name: "Milk", householdId: "household-2" }),
    ];

    const { result } = renderHook(() => useGroupedItems(items, householdMap));

    const milkGroup = result.current.pendingGroups[0];
    expect(milkGroup.householdCount).toBe(2);
    expect(milkGroup.items).toHaveLength(3);
  });

  it("places fully bought groups into boughtGroups", () => {
    const items = [
      buildItem({ id: "1", name: "Milk", status: "bought", householdId: "household-1" }),
      buildItem({ id: "2", name: "Milk", status: "bought", householdId: "household-2" }),
    ];

    const { result } = renderHook(() => useGroupedItems(items, householdMap));

    expect(result.current.pendingGroups).toHaveLength(0);
    expect(result.current.boughtGroups).toHaveLength(1);
    expect(result.current.boughtGroups[0].allBought).toBe(true);
  });

  it("places partially bought groups into pendingGroups", () => {
    const items = [
      buildItem({ id: "1", name: "Milk", status: "bought", householdId: "household-1" }),
      buildItem({ id: "2", name: "Milk", status: "pending", householdId: "household-2" }),
    ];

    const { result } = renderHook(() => useGroupedItems(items, householdMap));

    expect(result.current.pendingGroups).toHaveLength(1);
    expect(result.current.boughtGroups).toHaveLength(0);
    expect(result.current.pendingGroups[0].boughtCount).toBe(1);
    expect(result.current.pendingGroups[0].allBought).toBe(false);
  });

  it("sorts groups alphabetically by canonicalName", () => {
    const items = [
      buildItem({ id: "1", name: "Cheese", householdId: "household-1" }),
      buildItem({ id: "2", name: "Apples", householdId: "household-1" }),
      buildItem({ id: "3", name: "Bread", householdId: "household-1" }),
    ];

    const { result } = renderHook(() => useGroupedItems(items, householdMap));

    const names = result.current.pendingGroups.map((g) => g.canonicalName);
    expect(names).toEqual(["Apples", "Bread", "Cheese"]);
  });

  it("sorts sub-items by household name alphabetically", () => {
    const items = [
      buildItem({ id: "1", name: "Milk", householdId: "household-1" }), // Smith
      buildItem({ id: "2", name: "Milk", householdId: "household-2" }), // Jones
      buildItem({ id: "3", name: "Milk", householdId: "household-3" }), // Adams
    ];

    const { result } = renderHook(() => useGroupedItems(items, householdMap));

    const milkGroup = result.current.pendingGroups[0];
    const householdIds = milkGroup.items.map((i) => i.householdId);
    // Adams < Jones < Smith
    expect(householdIds).toEqual(["household-3", "household-2", "household-1"]);
  });
});

// =========================================================================
// US-13: SHOPPER GROUP CARD
// =========================================================================

describe("US-13: ShopperGroupCard", () => {
  const householdMap = new Map<string, Household>([
    ["household-1", { id: "household-1", name: "Smith Family", color: "#6366f1" }],
    ["household-2", { id: "household-2", name: "Jones Family", color: "#f59e0b" }],
  ]);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders canonical name and household count", () => {
    const items = [
      buildItem({ id: "1", name: "Milk", householdId: "household-1" }),
      buildItem({ id: "2", name: "Milk", householdId: "household-2" }),
    ];
    const { result } = renderHook(() => useGroupedItems(items, householdMap));
    const group = result.current.pendingGroups[0];

    render(
      <ShopperGroupCard
        group={group}
        householdMap={householdMap}
        activeTripId="trip-1"
        onToggle={vi.fn()}
      />
    );

    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(screen.getByText("2 households")).toBeInTheDocument();
  });

  it("shows partial progress when some items are bought", () => {
    const items = [
      buildItem({ id: "1", name: "Milk", status: "bought", householdId: "household-1" }),
      buildItem({ id: "2", name: "Milk", status: "pending", householdId: "household-2" }),
    ];
    const { result } = renderHook(() => useGroupedItems(items, householdMap));
    const group = result.current.pendingGroups[0];

    render(
      <ShopperGroupCard
        group={group}
        householdMap={householdMap}
        activeTripId="trip-1"
        onToggle={vi.fn()}
      />
    );

    expect(screen.getByText("1 of 2 done")).toBeInTheDocument();
  });

  it("hides progress when boughtCount is 0", () => {
    const items = [
      buildItem({ id: "1", name: "Milk", status: "pending", householdId: "household-1" }),
      buildItem({ id: "2", name: "Milk", status: "pending", householdId: "household-2" }),
    ];
    const { result } = renderHook(() => useGroupedItems(items, householdMap));
    const group = result.current.pendingGroups[0];

    render(
      <ShopperGroupCard
        group={group}
        householdMap={householdMap}
        activeTripId="trip-1"
        onToggle={vi.fn()}
      />
    );

    expect(screen.queryByText(/of.*done/)).not.toBeInTheDocument();
  });

  it("sub-rows show checkbox, pill, household name, and qty/unit", () => {
    const items = [
      buildItem({ id: "1", name: "Milk", qty: 2, unit: "L", householdId: "household-1" }),
    ];
    const { result } = renderHook(() => useGroupedItems(items, householdMap));
    const group = result.current.pendingGroups[0];

    render(
      <ShopperGroupCard
        group={group}
        householdMap={householdMap}
        activeTripId="trip-1"
        onToggle={vi.fn()}
      />
    );

    // Household name
    expect(screen.getByText("Smith Family")).toBeInTheDocument();
    // Short code pill
    expect(screen.getByText("SM")).toBeInTheDocument();
    // Qty/unit
    expect(screen.getByText("2 L")).toBeInTheDocument();
    // Checkbox button
    expect(screen.getByRole("button", { name: /check off milk for smith family/i })).toBeInTheDocument();
  });

  it("renders notes when present", () => {
    const items = [
      buildItem({ id: "1", name: "Milk", notes: "Get organic", householdId: "household-1" }),
    ];
    const { result } = renderHook(() => useGroupedItems(items, householdMap));
    const group = result.current.pendingGroups[0];

    render(
      <ShopperGroupCard
        group={group}
        householdMap={householdMap}
        activeTripId="trip-1"
        onToggle={vi.fn()}
      />
    );

    expect(screen.getByText("Get organic")).toBeInTheDocument();
  });

  it("calls onToggle with correct item ID", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn().mockResolvedValue(undefined);
    const items = [
      buildItem({ id: "item-99", name: "Milk", householdId: "household-1" }),
    ];
    const { result } = renderHook(() => useGroupedItems(items, householdMap));
    const group = result.current.pendingGroups[0];

    render(
      <ShopperGroupCard
        group={group}
        householdMap={householdMap}
        activeTripId="trip-1"
        onToggle={onToggle}
      />
    );

    const button = screen.getByRole("button", { name: /check off milk for smith family/i });
    await user.click(button);

    expect(onToggle).toHaveBeenCalledOnce();
    expect(onToggle).toHaveBeenCalledWith("item-99");
  });

  it("shows 'New' badge only on matching addedDuringTripId", () => {
    const items = [
      buildItem({ id: "1", name: "Milk", householdId: "household-1", addedDuringTripId: "trip-1" }),
      buildItem({ id: "2", name: "Milk", householdId: "household-2", addedDuringTripId: null }),
    ];
    const { result } = renderHook(() => useGroupedItems(items, householdMap));
    const group = result.current.pendingGroups[0];

    render(
      <ShopperGroupCard
        group={group}
        householdMap={householdMap}
        activeTripId="trip-1"
        onToggle={vi.fn()}
      />
    );

    // Only one "New" badge
    const badges = screen.getAllByText("New");
    expect(badges).toHaveLength(1);
  });

  it("renders card structure for single-item group", () => {
    const items = [
      buildItem({ id: "1", name: "Bread", householdId: "household-1" }),
    ];
    const { result } = renderHook(() => useGroupedItems(items, householdMap));
    const group = result.current.pendingGroups[0];

    render(
      <ShopperGroupCard
        group={group}
        householdMap={householdMap}
        activeTripId="trip-1"
        onToggle={vi.fn()}
      />
    );

    // Card header with name
    expect(screen.getByText("Bread")).toBeInTheDocument();
    // Shows "1 household"
    expect(screen.getByText("1 household")).toBeInTheDocument();
    // Sub-row with household name
    expect(screen.getByText("Smith Family")).toBeInTheDocument();
  });
});

// =========================================================================
// US-DC-04: useDepartmentCatalog HOOK
// =========================================================================

describe("US-DC-04: useDepartmentCatalog hook", () => {
  it("extracts unique departments sorted alphabetically", () => {
    const items = [
      buildItem({ id: "1", name: "Milk", department: "Dairy" }),
      buildItem({ id: "2", name: "Bread", department: "Bakery" }),
      buildItem({ id: "3", name: "Cheese", department: "Dairy" }),
      buildItem({ id: "4", name: "Apples", department: "Produce" }),
    ];

    const { result } = renderHook(() => useDepartmentCatalog(items));

    expect(result.current).toEqual(["Bakery", "Dairy", "Produce"]);
  });

  it("excludes empty department strings", () => {
    const items = [
      buildItem({ id: "1", name: "Milk", department: "Dairy" }),
      buildItem({ id: "2", name: "Stuff", department: "" }),
    ];

    const { result } = renderHook(() => useDepartmentCatalog(items));

    expect(result.current).toEqual(["Dairy"]);
  });

  it("returns empty array when no departments", () => {
    const items = [
      buildItem({ id: "1", name: "Milk", department: "" }),
    ];

    const { result } = renderHook(() => useDepartmentCatalog(items));

    expect(result.current).toEqual([]);
  });
});

// =========================================================================
// US-DC-03: useGroupedItems with department sorting
// =========================================================================

describe("US-DC-03: useGroupedItems department sorting", () => {
  const householdMap = new Map<string, Household>([
    ["household-1", { id: "household-1", name: "Smith Family", color: "#6366f1" }],
  ]);

  it("sorts by department alphabetically, then by name within department", () => {
    const items = [
      buildItem({ id: "1", name: "Cheese", department: "Dairy", householdId: "household-1" }),
      buildItem({ id: "2", name: "Bread", department: "Bakery", householdId: "household-1" }),
      buildItem({ id: "3", name: "Milk", department: "Dairy", householdId: "household-1" }),
      buildItem({ id: "4", name: "Rolls", department: "Bakery", householdId: "household-1" }),
    ];

    const { result } = renderHook(() => useGroupedItems(items, householdMap, "department"));

    const names = result.current.pendingGroups.map((g) => g.canonicalName);
    expect(names).toEqual(["Bread", "Rolls", "Cheese", "Milk"]);
  });

  it("places uncategorized items (empty department) last", () => {
    const items = [
      buildItem({ id: "1", name: "Milk", department: "Dairy", householdId: "household-1" }),
      buildItem({ id: "2", name: "Mystery", department: "", householdId: "household-1" }),
      buildItem({ id: "3", name: "Bread", department: "Bakery", householdId: "household-1" }),
    ];

    const { result } = renderHook(() => useGroupedItems(items, householdMap, "department"));

    const names = result.current.pendingGroups.map((g) => g.canonicalName);
    expect(names).toEqual(["Bread", "Milk", "Mystery"]);
  });

  it("defaults to alphabetical sort", () => {
    const items = [
      buildItem({ id: "1", name: "Cheese", department: "Dairy", householdId: "household-1" }),
      buildItem({ id: "2", name: "Bread", department: "Bakery", householdId: "household-1" }),
    ];

    const { result } = renderHook(() => useGroupedItems(items, householdMap));

    const names = result.current.pendingGroups.map((g) => g.canonicalName);
    expect(names).toEqual(["Bread", "Cheese"]);
  });
});
