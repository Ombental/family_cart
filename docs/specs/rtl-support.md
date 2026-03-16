# Plan: Hebrew/English Language Toggle with RTL Support

## Context
FamilyCart is a family grocery list PWA used by Israeli families. Currently all UI text is hardcoded English with LTR layout only. The goal is to add Hebrew as a language option with full RTL support, and allow users to toggle between English and Hebrew. Hebrew should be the default language since the primary users are Israeli families.

Currently there is **zero i18n infrastructure** — all ~200 strings are hardcoded JSX literals across ~15 pages and ~25 components.

## Approach: Manual i18n (no library)

Use a lightweight custom `t(key)` function + React context instead of i18next (~40-50KB). With only ~200 unique strings and 2 languages, a single translations file is manageable and keeps the bundle small. The `t(key)` API is the same as i18next, so migrating later is trivial.

---

## Phase 1: Infrastructure (5 SP)

### 1.1 Create `src/i18n/LanguageContext.tsx`
- `Language` type: `"en" | "he"`
- `LanguageProvider`: reads initial lang from `localStorage("familycart_lang")`, defaults to `"he"`
- `useEffect` sets `document.documentElement.dir` (`"rtl"` | `"ltr"`) and `document.documentElement.lang`
- `useEffect` persists to localStorage
- `t(key, params?)` — looks up key in translations, supports `{{param}}` interpolation
- `useLanguage()` hook

### 1.2 Create `src/i18n/translations.ts`
- Single file, flat dot-notation keys: `Record<Language, Record<string, string>>`
- Namespaces: `common.*`, `nav.*`, `auth.*`, `home.*`, `group.*`, `members.*`, `items.*`, `shopper.*`, `trips.*`, `profile.*`, `invite.*`, `units.*`
- Both `en` and `he` objects side by side

### 1.3 Wire provider into app
- `src/main.tsx`: wrap `<AuthProvider>` inside `<LanguageProvider>` (lang needed before auth for Login page)
- `index.html`: remove hardcoded `lang="en"` — provider sets it dynamically

---

## Phase 2: RTL CSS Fixes (8 SP)

### 2.1 Critical — inline `borderLeft` → `borderInlineStart`
| File | Line | Change |
|------|------|--------|
| `src/components/list/ItemRow.tsx` | 64-66 | `borderLeftWidth/Style/Color` → `borderInlineStartWidth/Style/Color` |
| `src/pages/TripSummaryPage.tsx` | 248-250 | Same pattern |
| `src/__tests__/trip-summary.test.tsx` | 381 | Update assertion to `borderInlineStartColor` |

### 2.2 Critical — fixed positioning
| File | Line | Change |
|------|------|--------|
| `src/components/list/AddItemForm.tsx` | 67 | `right-4` → `end-4` |
| `src/pages/ShopperModePage.tsx` | 206 | `right-4` → `end-4` |

### 2.3 `text-left` → `text-start`
| File | Lines | Change |
|------|-------|--------|
| `src/components/shopper/ShopperItemRow.tsx` | 48 | `text-left` → `text-start` |
| `src/components/shopper/ShopperSubRow.tsx` | 47 | `text-left` → `text-start` |
| `src/components/group/MembersView.tsx` | 470, 498 | `text-left` → `text-start` |
| `src/pages/JoinGroupPage.tsx` | 238 | `text-left` → `text-start` |

### 2.4 `ml-*`/`mr-*` → `ms-*`/`me-*`
| File | Lines | Change |
|------|-------|--------|
| `src/components/group/MembersView.tsx` | 277 | `ml-1` → `ms-1` |
| `src/components/group/MembersView.tsx` | 366 | `mr-1` → `me-1` |
| `src/components/group/MembersView.tsx` | 547, 591, 596 | `mr-2` → `me-2` |
| `src/components/group/GroupView.tsx` | 138, 187 | `mr-2` → `me-2`, `mr-1` → `me-1` |
| `src/components/group/LeaveGroupDialog.tsx` | 79, 84 | `mr-2` → `me-2` |
| `src/pages/JoinGroupPage.tsx` | 131 | `mr-2` → `me-2` |
| `src/pages/ShopperModePage.tsx` | 220 | `mr-2` → `me-2` |
| `src/components/list/ItemCombobox.tsx` | 186 | `ml-2` → `ms-2` |

### 2.5 `dropdown-menu.tsx` (shadcn component)
| Lines | Change |
|-------|--------|
| 75, 93, 129, 156, 212 | `pl-8` → `ps-8` |
| 93, 129 | `pr-2` → `pe-2` |
| 99, 134 | `left-2` → `start-2` |
| 185, 218 | `ml-auto` → `ms-auto` |

### 2.6 `pl-3` in TripSummaryPage
| File | Line | Change |
|------|------|--------|
| `src/pages/TripSummaryPage.tsx` | 246 | `pl-3` → `ps-3` |

### 2.7 No changes needed (verified safe)
- `BottomNav.tsx`: `fixed bottom-0 left-0 right-0` — full-width, correct as-is
- `dialog.tsx`, `alert-dialog.tsx`: centered modals with `left-[50%] translate-x-[-50%]`, correct as-is
- All `flex`, `gap-*`, `space-y-*`, `justify-between` — direction-agnostic

---

## Phase 3: String Extraction (~30 SP)

Replace all hardcoded strings with `t()` calls, page by page. Each task uses `const { t } = useLanguage()`.

### 3.1 Shared layout components
- `AppShell.tsx`: "FamilyCart"
- `BottomNav.tsx`: "Home", "List", "Profile"
- `SyncBanner.tsx`, `OfflineBanner.tsx`: offline messages

### 3.2 Auth pages
- `LoginPage.tsx`: ~8 strings
- `RegisterPage.tsx`: ~10 strings

### 3.3 Home & group creation/join
- `HomePage.tsx`: ~10 strings
- `CreateGroupPage.tsx`: ~10 strings
- `JoinGroupPage.tsx`: ~15 strings + ERROR_MESSAGES map

### 3.4 Group view components
- `GroupView.tsx`: ~15 strings
- `HoldingState.tsx`: ~5 strings
- `MembersView.tsx`: ~20 strings
- `LeaveGroupDialog.tsx`: dialog strings
- `InviteDisplay.tsx`: invite section strings

### 3.5 List components
- `GroceryList.tsx`: filter labels, empty state, counts
- `ItemRow.tsx`: "Qty:" prefix
- `AddItemForm.tsx`: sheet title, labels, placeholders
- `EditItemForm.tsx`, `ItemActions.tsx`, `ItemCombobox.tsx`

### 3.6 Shopper mode
- `ShopperModePage.tsx`: header, progress, sections, complete button
- `ShopperItemRow.tsx`, `ShopperSubRow.tsx`: aria-labels
- `ShopperGroupCard.tsx`, `ConflictDialog.tsx`

### 3.7 Trip pages
- `TripHistoryPage.tsx`: title, empty state, date labels ("Today", "Yesterday")
- `TripSummaryPage.tsx`: headers, completion message, summary

### 3.8 Profile page
- `ProfilePage.tsx`: labels, toast messages, logout

### 3.9 Units & date formatting
- Unit labels in `UNIT_OPTIONS`: caller passes translated labels via `t("units.pcs")` etc. (Firestore stores English key as data)
- `TripHistoryPage.tsx` / `TripSummaryPage.tsx`: `formatTripDate`/`formatCompletedDate` — use `"he-IL"` or `"en-US"` locale based on current language

### 3.10 Toast strings (`delete-with-undo.ts`)
- Pass translated "removed" and "Undo" labels as parameters from the calling component (function has no React context access)

---

## Phase 4: Language Toggle UI (5 SP)

### 4.1 ProfilePage toggle
- New card section between user info and logout
- Two buttons side by side: "English" | "עברית"
- Active button: primary style; inactive: outline
- Calls `setLang("en")` or `setLang("he")`

### 4.2 Auth page switcher
- Small text button on Login/Register pages
- Shows "עברית" when English active, "English" when Hebrew active
- Positioned at top of page, minimal footprint

---

## Phase 5: Test Updates (8 SP)

### 5.1 Create test utility
- `src/__tests__/test-utils.tsx`: custom `render()` wrapping components in `<LanguageProvider>`
- Update all 10 test files to use this wrapper

### 5.2 New i18n tests
- `useLanguage()` returns correct translations
- Language switch updates `document.documentElement.dir`
- localStorage persistence works
- ProfilePage toggle switches language

### 5.3 Fix RTL-affected assertions
- `trip-summary.test.tsx` line 381: `borderLeftColor` → `borderInlineStartColor`

---

## Verification
1. `npx tsc --noEmit` — zero type errors
2. `npx vitest run` — all tests pass
3. `npm run build` — clean build
4. Manual check: toggle to Hebrew on ProfilePage → entire app flips RTL, all strings in Hebrew
5. Manual check: toggle back to English → LTR restored, all strings in English
6. Manual check: refresh browser → language preference persisted
7. Manual check: ItemRow color bar appears on inline-start side in both directions
8. Manual check: FAB button appears on inline-end side in both directions

## Key New Files
- `src/i18n/LanguageContext.tsx` — provider, hook, `t()` function
- `src/i18n/translations.ts` — all en/he translations (~200 keys each)

## Sprint Execution Order
```
Phase 1 (infra)  →  Phase 2 (RTL CSS)  →  Phase 3 (strings)  →  Phase 4 (toggle UI)  →  Phase 5 (tests)
     5 SP               8 SP                  ~30 SP                 5 SP                   8 SP
```
Total: ~56 SP
