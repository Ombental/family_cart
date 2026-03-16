# FamilyCart Design System

> Canonical reference for every visual decision in the FamilyCart PWA.
> All values are implementation-ready: hex colors, px/rem sizes, Tailwind utilities.
> Derived from 8 wireframe pages in Frame0 using Radix Colors (light theme, v3).

---

## Table of Contents

1. [Color Tokens](#1-color-tokens)
2. [Typography Scale](#2-typography-scale)
3. [Spacing System](#3-spacing-system)
4. [Component Specifications](#4-component-specifications)
5. [Interaction Patterns](#5-interaction-patterns)
6. [Theming: Main vs Shopper Mode](#6-theming-main-vs-shopper-mode)
7. [RTL & Bidirectional Layout](#7-rtl--bidirectional-layout)

---

## 1. Color Tokens

All colors use the Radix Colors light-mode palette (v3). Each token maps to a
CSS custom property and a Tailwind class.

### 1.1 Primary (Green) -- Main App Theme

Used for: header bar, primary buttons, FAB, active nav, links, success states.

| Token              | Radix Ref    | Hex       | Usage                                  |
|--------------------|-------------|-----------|----------------------------------------|
| `--fc-primary-1`   | grass-3     | `#e9f6e9` | Checked-item row background            |
| `--fc-primary-2`   | grass-5     | `#c9e8ca` | Badge text on header, tagline text     |
| `--fc-primary-3`   | grass-7     | `#94ce9a` | Undo button text                       |
| `--fc-primary-4`   | grass-9     | `#46a758` | Check icons, success indicators        |
| `--fc-primary-5`   | grass-11    | `#2a7e3b` | Header bg, primary buttons, FAB, links |
| `--fc-primary-6`   | grass-12    | `#203c25` | Dark-on-green text, group name         |

### 1.2 Shopper Mode Accent (Blue)

Used exclusively in Shopper Mode to visually distinguish the shopping context.

| Token               | Radix Ref   | Hex       | Usage                                  |
|----------------------|------------|-----------|----------------------------------------|
| `--fc-shopper-1`     | blue-3     | `#e6f4fe` | Progress bar track, HH tag bg          |
| `--fc-shopper-2`     | blue-7     | `#8ec8f6` | HH tag border                          |
| `--fc-shopper-3`     | blue-11    | `#0d74ce` | Header bg, FAB, progress fill, buttons |
| `--fc-shopper-text`  | blue-11    | `#0d74ce` | "OK, Got It" link, HH tag text         |

### 1.3 Household Colors

Three households are shown in wireframes. Colors are assigned round-robin.

| Slot | Name   | Dot/Bar Color       | Tag BG              | Tag Border           | Tag Text             |
|------|--------|---------------------|----------------------|----------------------|----------------------|
| 0    | Blue   | blue-8 `#5eb1ef`    | blue-3 `#e6f4fe`     | blue-7 `#8ec8f6`     | blue-11 `#0d74ce`    |
| 1    | Orange | amber-10 `#ffba18`  | tomato-3 `#feebe7`   | orange-6 `#ffc182`   | orange-10 `#ef5f00`  |
| 2    | Purple | plum-9 `#ab4aba`*   | purple-4 `#f2e2fc`   | plum-8 `#be93e4`**   | plum-11 `#953ea3`*** |

> *plum-9: `#ab4aba`, **plum-8 approx: `#be93e4` (using purple-8), ***plum-11 approx: `#953ea3`

**System for additional households (slots 3+):**

| Slot | Scale   | Dot/Bar     | Tag BG       | Tag Border   | Tag Text     |
|------|---------|-------------|--------------|--------------|--------------|
| 3    | Crimson | crimson-9   | crimson-3    | crimson-7    | crimson-11   |
| 4    | Teal    | teal-9      | teal-3       | teal-7       | teal-11      |
| 5    | Indigo  | indigo-9    | indigo-3     | indigo-7     | indigo-11    |
| 6    | Pink    | pink-9      | pink-3       | pink-7       | pink-11      |
| 7    | Cyan    | cyan-9      | cyan-3       | cyan-7       | cyan-11      |

Pattern: For household at index `n`, use Radix scale `SCALES[n % 8]`.
Each scale provides: step-9 for dot/bar, step-3 for tag bg, step-7 for tag border, step-11 for tag text.
### 1.4 Semantic Colors

| Token              | Radix Ref    | Hex       | Usage                                    |
|--------------------|-------------|-----------|------------------------------------------|
| `--fc-success`     | grass-9     | `#46a758` | Check icons, "all items purchased" text  |
| `--fc-warning`     | amber-10    | `#ffba18` | Partial completion count                 |
| `--fc-warning-bg`  | tomato-3    | `#feebe7` | Offline banner background                |
| `--fc-warning-border`| amber-9   | `#ffc53d` | Offline banner border                    |
| `--fc-warning-text`| orange-10   | `#ef5f00` | Offline banner text + icon               |
| `--fc-error`       | red-9       | `#e5484d` | Swipe-delete bg, missed items, NEW badge |
| `--fc-error-bg`    | orange-3    | `#ffefd6` | Sync failure banner background           |
| `--fc-error-border`| orange-9    | `#f76b15` | Sync failure banner border               |
| `--fc-error-text`  | red-9       | `#e5484d` | Sync failure text + icon                 |
| `--fc-info`        | blue-11     | `#0d74ce` | Conflict dialog dismiss link             |

### 1.5 Neutral Scale

| Token              | Radix Ref   | Hex       | Tailwind             | Usage                          |
|--------------------|------------|-----------|----------------------|--------------------------------|
| `--fc-bg`          | gray-2     | `#f9f9f9` | `bg-gray-50`         | Page background                |
| `--fc-surface`     | white      | `#ffffff` | `bg-white`           | Card/row/sheet background      |
| `--fc-border`      | gray-5     | `#e0e0e0` | `border-gray-200`    | Card borders, nav bar top      |
| `--fc-border-row`  | olive-3    | `#eff1ef` | `border-gray-100`    | Item row separator             |
| `--fc-input-bg`    | sage-2     | `#f7f9f8` | `bg-gray-50`         | Input field background         |
| `--fc-input-border`| gray-8     | `#bbbbbb` | `border-gray-400`    | Input field border             |
| `--fc-text-primary`| gray-12    | `#202020` | `text-gray-900`      | Headings, item names           |
| `--fc-text-body`   | brown-12   | `#3e332e` | `text-gray-800`      | Household labels in cards      |
| `--fc-text-secondary`| sand-10  | `#82827c` | `text-gray-500`      | Subtitles, counts, meta info   |
| `--fc-text-tertiary`| mauve-9   | `#8e8c99` | `text-gray-400`      | Nav inactive, helper text, meta|
| `--fc-text-placeholder`| gray-8  | `#bbbbbb` | `text-gray-400`      | Placeholder text in inputs     |
| `--fc-text-on-dark`| background | `#ffffff` | `text-white`         | Text on primary/shopper header |
| `--fc-handle`      | gray-8     | `#bbbbbb` | `bg-gray-400`        | Bottom sheet drag handle       |

### 1.6 Surface & Overlay Colors

| Token              | Radix Ref   | Hex / Value          | Usage                           |
|--------------------|------------|----------------------|---------------------------------|
| `--fc-overlay`     | brown-12   | `#3e332e` @ 60%      | Bottom sheet dimmed backdrop     |
| `--fc-dialog-overlay`| slate-12 | `#1c2024` @ 70%      | Conflict dialog backdrop         |
| `--fc-toast-bg`    | brown-12   | `#3e332e`            | Undo toast background            |
| `--fc-toast-text`  | background | `#ffffff`            | Undo toast body text             |
| `--fc-toast-action`| grass-7    | `#94ce9a`            | Undo toast action button text    |

---

## 2. Typography Scale

### 2.1 Font Family

```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

Tailwind: `font-sans` (default stack).

### 2.2 Size Scale

| Name       | px   | rem     | Tailwind       | Usage                                      |
|------------|------|---------|----------------|----------------------------------------------|
| Display    | 30px | 1.875   | `text-3xl`     | Brand logo on Sign Up screen                 |
| Heading 1  | 22px | 1.375   | `text-[22px]`  | App title "FamilyCart", "Trip Complete!"      |
| Heading 2  | 20px | 1.25    | `text-xl`      | Screen titles ("Shopping List", "Add Item")  |
| Heading 3  | 18px | 1.125   | `text-lg`      | Card titles, group name, "SHOPPER MODE"      |
| Body       | 15px | 0.9375  | `text-[15px]`  | Item names                                   |
| Body Small | 14px | 0.875   | `text-sm`      | Links ("View Full List"), input values       |
| Caption    | 13px | 0.8125  | `text-[13px]`  | Subtitles, meta info, form labels            |
| Footnote   | 12px | 0.75    | `text-xs`      | Helper text, progress label, banner text     |
| Overline   | 11px | 0.6875  | `text-[11px]`  | Item meta line ("Qty: 2 . Apt 3A"), HH tags |
| Micro      | 10px | 0.625   | `text-[10px]`  | Bottom nav labels                            |
| Badge      | 9px  | 0.5625  | `text-[9px]`   | "NEW" badge text                             |

### 2.3 Weight Scale

| Weight     | CSS Value | Tailwind         | Usage                                  |
|------------|-----------|------------------|----------------------------------------|
| Bold       | 700       | `font-bold`      | Brand name, screen titles, item names  |
| Semibold   | 600       | `font-semibold`  | Card titles, group name, button text   |
| Medium     | 500       | `font-medium`    | Form labels, links, active nav         |
| Regular    | 400       | `font-normal`    | Body text, meta, captions, placeholders|

### 2.4 Line Height

| Context     | Line Height | Tailwind         |
|-------------|-------------|------------------|
| Headings    | 1.2         | `leading-tight`  |
| Body        | 1.5         | `leading-normal` |
| Captions    | 1.3         | `leading-snug`   |
| Single line | 1.0         | `leading-none`   |

---

## 3. Spacing System

### 3.1 Base Unit

Base unit: **4px**. All spacing is a multiple of 4.

| Token  | px   | rem    | Tailwind |
|--------|------|--------|----------|
| `xs`   | 4px  | 0.25   | `1`      |
| `sm`   | 8px  | 0.5    | `2`      |
| `md`   | 12px | 0.75   | `3`      |
| `base` | 16px | 1.0    | `4`      |
| `lg`   | 20px | 1.25   | `5`      |
| `xl`   | 24px | 1.5    | `6`      |
| `2xl`  | 32px | 2.0    | `8`      |
| `3xl`  | 40px | 2.5    | `10`     |
| `4xl`  | 48px | 3.0    | `12`     |
| `5xl`  | 56px | 3.5    | `14`     |

### 3.2 Content Padding

| Context              | Value       | Tailwind   | Source (wireframe)              |
|----------------------|-------------|------------|---------------------------------|
| Page horizontal      | 16px        | `px-4`     | All frames: content at left:16  |
| Card internal        | 16px        | `p-4`      | Summary card: 32-16=16 padding  |
| Bottom sheet internal| 24px        | `p-6`      | Add Item: content at left:24    |
| Section vertical gap | 16px        | `gap-4`    | Between cards/sections           |
| Item row left pad    | 16px (after color bar) | `pl-4` | Item content starts at 32, bar at 16 |

### 3.3 Component Gaps

| Context                        | Value  | Tailwind |
|--------------------------------|--------|----------|
| Between item rows              | 0px    | `gap-0`  |
| Between filter tabs            | 8px    | `gap-2`  |
| Between household summary rows | 32px v | `gap-8`  |
| Form field vertical gap        | 16px   | `gap-4`  |
| Between label and input        | 4px    | `gap-1`  |

---

## 4. Component Specifications

### 4.1 Header Bar

| Property       | Value                     | Tailwind                              |
|----------------|---------------------------|---------------------------------------|
| Height         | 56px (excluding status)   | `h-14`                                |
| Background     | grass-11 `#2a7e3b`        | `bg-[#2a7e3b]`                        |
| Status bar     | Same as header            | Extend to safe area                   |
| Text color     | white `#ffffff`           | `text-white`                          |
| Title size     | 22px / bold               | `text-[22px] font-bold`              |
| Screen title   | 20px / semibold           | `text-xl font-semibold`              |
| Right icon     | 24x24 user-round, white   | `w-6 h-6 text-white`                 |
| Padding        | 16px horizontal           | `px-4`                                |
| Position       | Sticky top                | `sticky top-0 z-50`                   |
| Safe area      | Include notch/status bar  | `pt-[env(safe-area-inset-top)]`       |

**Shopper Mode variant:**
- Background: blue-11 `#0d74ce` (`bg-[#0d74ce]`)
- Back arrow: 24x24, white, left-aligned
- Title: "SHOPPER MODE" 18px uppercase bold

### 4.2 Bottom Nav Bar

| Property       | Value                     | Tailwind                              |
|----------------|---------------------------|---------------------------------------|
| Height         | 56px                      | `h-14`                                |
| Background     | white `#ffffff`           | `bg-white`                            |
| Top border     | 1px gray-5 `#e0e0e0`     | `border-t border-[#e0e0e0]`          |
| Position       | Fixed bottom              | `fixed bottom-0 inset-x-0 z-50`     |
| Safe area      | Include home indicator    | `pb-[env(safe-area-inset-bottom)]`   |
| Tabs           | 3 equally spaced          | `flex justify-around items-center`    |
| Icon size      | 24x24                     | `w-6 h-6`                             |
| Label size     | 10px / medium             | `text-[10px] font-medium`            |
| Active color   | grass-11 `#2a7e3b`        | `text-[#2a7e3b]`                     |
| Inactive color | mauve-9 `#8e8c99`         | `text-[#8e8c99]`                     |
| Gap icon-label | 4px                       | `gap-1`                               |
| Tab layout     | Column, center-aligned    | `flex flex-col items-center`          |

**Hidden in Shopper Mode.** Shopper Mode is a full-screen experience.

### 4.3 Item Row

| Property         | Value                     | Tailwind                              |
|------------------|---------------------------|---------------------------------------|
| Min height       | 52px                      | `min-h-[52px]`                        |
| Background       | white `#ffffff`           | `bg-white`                            |
| Left color bar   | 4px wide, full height     | `w-1 absolute left-0 top-0 bottom-0` |
| Color bar color  | Household dot color       | Dynamic: `bg-[${color}]`             |
| Content padding  | 16px left (after bar), 16px right | `pl-4 pr-4`                  |
| Vertical padding | 6px top and bottom        | `py-1.5`                              |
| Item name        | 15px / semibold / gray-12 | `text-[15px] font-semibold text-[#202020]` |
| Meta line        | 11px / regular / mauve-9  | `text-[11px] text-[#8e8c99]`         |
| Row border       | 1px bottom olive-3 `#eff1ef` | `border-b border-[#eff1ef]`       |
| First row corner | 8px top-left, top-right   | `first:rounded-t-lg`                 |
| Last row corner  | 8px bottom-left, bottom-right | `last:rounded-b-lg`             |
| Row group margin | 16px horizontal from edge | `mx-4`                                |

### 4.4 Filter Tabs

| Property          | Value                      | Tailwind                            |
|-------------------|----------------------------|-------------------------------------|
| Height            | 28px                       | `h-7`                               |
| Border radius     | 14px (full pill)           | `rounded-full`                      |
| Horizontal padding| 12px                       | `px-3`                              |
| Gap between tabs  | 8px                        | `gap-2`                             |
| Text size         | 12px / medium              | `text-xs font-medium`              |
| Container padding | 16px horizontal, 12px vert | `px-4 py-3`                        |
| Scroll behavior   | Horizontal scroll, no wrap | `overflow-x-auto whitespace-nowrap` |

**States:**

| State            | Background         | Border              | Text Color          |
|------------------|--------------------|--------------------|---------------------|
| "All" active     | grass-11 `#2a7e3b` | grass-11 `#2a7e3b` | white `#ffffff`     |
| "All" inactive   | white              | gray-5 `#e0e0e0`   | gray-12 `#202020`   |
| HH tab active    | HH tag bg          | HH tag border       | HH tag text         |
| HH tab inactive  | transparent        | gray-5 `#e0e0e0`   | gray-8 `#bbbbbb`    |

Example for "Apt 3A" (household 0, blue):
- Active: bg `#e6f4fe`, border `#8ec8f6`, text `#0d74ce`
- Inactive: bg `transparent`, border `#e0e0e0`, text `#bbbbbb`

### 4.5 FAB (Floating Action Button)

| Property       | Value                      | Tailwind                              |
|----------------|----------------------------|---------------------------------------|
| Size           | 52x52 (main), 44x44 (shopper) | `w-13 h-13` / `w-11 h-11`        |
| Shape          | Circle                     | `rounded-full`                        |
| Background     | grass-11 `#2a7e3b`         | `bg-[#2a7e3b]`                       |
| Icon           | plus, 32x32 (main) / 32x32 (shopper) | `w-8 h-8`                |
| Icon color     | white                      | `text-white`                          |
| Position       | Fixed, bottom-right        | `fixed bottom-24 right-4`            |
| Shadow         | lg                         | `shadow-lg`                           |
| z-index        | 40                         | `z-40`                                |

**Shopper Mode variant:**
- Background: blue-11 `#0d74ce`
- Size: 44x44
- Position: `fixed bottom-28 right-4` (above Complete Trip button)

### 4.6 Primary Button

| Property       | Value                      | Tailwind                              |
|----------------|----------------------------|---------------------------------------|
| Height         | 48px (standard), 52px (hero) | `h-12` / `h-13`                    |
| Width          | Full width in container    | `w-full`                              |
| Border radius  | 24px (standard), 26px (hero) | `rounded-3xl`                     |
| Background     | grass-11 `#2a7e3b`         | `bg-[#2a7e3b]`                       |
| Text color     | white `#ffffff`            | `text-white`                          |
| Text size      | 16px-18px / semibold       | `text-base font-semibold` or `text-lg`|
| Padding        | 0 horizontal (full width)  | `px-0` (centered text)               |
| Disabled       | opacity 50%                | `disabled:opacity-50`                |

**Variants:**
- **Hero** ("Start Shopping"): 52px height, 18px text, 26px radius
- **Standard** ("Add to List", "Share Invite Link"): 48px height, 16px text, 24px radius
- **Small** ("Continue"): 38px height, 15px text, 20px radius
- **Dark** ("Send Code"): bg grass-12 `#203c25`, same shape
- **Shopper** ("Complete Trip"): bg blue-11 `#0d74ce`, 52px, 26px radius, 17px text

### 4.7 Card

| Property       | Value                      | Tailwind                              |
|----------------|----------------------------|---------------------------------------|
| Background     | white `#ffffff`            | `bg-white`                            |
| Border         | 1px gray-5 `#e0e0e0`      | `border border-[#e0e0e0]`           |
| Border radius  | 12px                       | `rounded-xl`                          |
| Padding        | 16px                       | `p-4`                                 |
| Shadow         | none (border only)         | `shadow-none`                         |
| Title          | 16px / semibold / gray-12  | `text-base font-semibold text-[#202020]` |
| Divider        | 1px gray-5, 16px margin    | `border-b border-[#e0e0e0] my-4`    |

### 4.8 Bottom Sheet Modal

| Property       | Value                      | Tailwind                              |
|----------------|----------------------------|---------------------------------------|
| Corner radius  | 20px top-left, top-right   | `rounded-t-2xl`                      |
| Background     | white `#ffffff`            | `bg-white`                            |
| Border         | 1px top gray-5             | `border-t border-[#e0e0e0]`         |
| Handle         | 40x4px, gray-8 `#bbbbbb`, centered | `w-10 h-1 rounded-full bg-[#bbbbbb] mx-auto` |
| Handle margin  | 8px from top               | `mt-2 mb-4`                           |
| Content padding| 24px horizontal            | `px-6`                                |
| Overlay        | brown-12 `#3e332e` at 60%  | `bg-[#3e332e]/60`                    |
| Title          | 20px / semibold / gray-12  | `text-xl font-semibold`             |
| Animation      | Slide up 300ms ease-out    | `transition-transform duration-300`  |
| Max height     | 90vh                       | `max-h-[90vh]`                       |
| Position       | Fixed bottom               | `fixed bottom-0 inset-x-0`          |

### 4.9 Household Tag/Pill (Shopper Mode)

| Property       | Value                      | Tailwind                              |
|----------------|----------------------------|---------------------------------------|
| Height         | 20px                       | `h-5`                                 |
| Min width      | 44px                       | `min-w-[44px]`                       |
| Border radius  | 10px (full pill)           | `rounded-full`                        |
| Padding        | 4px 8px                    | `px-2 py-0.5`                        |
| Text size      | 11px / medium              | `text-[11px] font-medium`           |
| Background     | HH tag bg color            | Dynamic per household                 |
| Border         | 1px HH tag border color    | `border` + dynamic color             |
| Text           | HH tag text color          | Dynamic per household                 |

### 4.10 Progress Bar (Shopper Mode)

| Property       | Value                      | Tailwind                              |
|----------------|----------------------------|---------------------------------------|
| Height         | 8px                        | `h-2`                                 |
| Border radius  | 4px                        | `rounded-full`                        |
| Track bg       | blue-3 `#e6f4fe`           | `bg-[#e6f4fe]`                       |
| Fill bg        | blue-11 `#0d74ce`          | `bg-[#0d74ce]`                       |
| Width          | Full container width       | `w-full`                              |
| Margin         | 16px horizontal            | `mx-4`                                |
| Label          | 12px / regular / sand-10   | `text-xs text-[#82827c]`            |
| Label position | Centered below, 8px gap    | `text-center mt-2`                   |

### 4.11 Checkbox (Shopper Mode)

**Unchecked:**

| Property       | Value                      | Tailwind                              |
|----------------|----------------------------|---------------------------------------|
| Size           | 22x22                      | `w-[22px] h-[22px]`                 |
| Border         | 2px gray-8 `#bbbbbb`      | `border-2 border-[#bbbbbb]`         |
| Border radius  | 4px                        | `rounded`                             |
| Background     | transparent                | `bg-transparent`                      |

**Checked:**

| Property       | Value                      | Tailwind                              |
|----------------|----------------------------|---------------------------------------|
| Size           | 24x24 (icon)               | `w-6 h-6`                             |
| Icon           | square-check (Lucide)      | `<SquareCheck />`                    |
| Color          | grass-9 `#46a758`          | `text-[#46a758]`                     |
| Row background | grass-3 `#e9f6e9`          | `bg-[#e9f6e9]`                       |
| Item text      | mauve-9 `#8e8c99`, line-through | `text-[#8e8c99] line-through`  |

### 4.12 Undo Toast

| Property       | Value                      | Tailwind                              |
|----------------|----------------------------|---------------------------------------|
| Height         | 44px                       | `h-11`                                |
| Background     | brown-12 `#3e332e`         | `bg-[#3e332e]`                       |
| Border radius  | 8px                        | `rounded-lg`                          |
| Padding        | 16px horizontal            | `px-4`                                |
| Position       | Fixed, 80px from bottom    | `fixed bottom-20 inset-x-4 z-50`    |
| Text           | 14px / regular / white     | `text-sm text-white`                 |
| Action text    | 14px / bold / grass-7      | `text-sm font-bold text-[#94ce9a]`  |
| Layout         | Space between              | `flex items-center justify-between`  |
| Shadow         | md                         | `shadow-md`                           |
| Duration       | 5 seconds, auto-dismiss    | Configured in sonner                  |
| Animation      | Slide up + fade in         | Default sonner animation              |

### 4.13 Banner (Offline / Sync Failure)

**Offline Banner:**

| Property       | Value                      | Tailwind                              |
|----------------|----------------------------|---------------------------------------|
| Height         | 44px                       | `min-h-[44px]`                       |
| Background     | tomato-3 `#feebe7`         | `bg-[#feebe7]`                       |
| Border         | 1px amber-9 `#ffc53d`      | `border border-[#ffc53d]`           |
| Border radius  | 8px                        | `rounded-lg`                          |
| Icon           | wifi-off, 24x24            | `w-6 h-6`                             |
| Icon color     | orange-10 `#ef5f00`        | `text-[#ef5f00]`                     |
| Text           | 12px / regular             | `text-xs`                             |
| Text color     | orange-10 `#ef5f00`        | `text-[#ef5f00]`                     |
| Padding        | 12px horizontal, 8px vert  | `px-3 py-2`                           |
| Margin         | 16px horizontal            | `mx-4`                                |
| Position       | Below header, sticky       | `sticky top-[100px]`                 |

**Sync Failure Banner:**

| Property       | Value                      | Tailwind                              |
|----------------|----------------------------|---------------------------------------|
| Height         | 34px                       | `min-h-[34px]`                       |
| Background     | orange-3 `#ffefd6`         | `bg-[#ffefd6]`                       |
| Border         | 1px orange-9 `#f76b15`     | `border border-[#f76b15]`           |
| Border radius  | 8px                        | `rounded-lg`                          |
| Icon           | refresh-cw, 24x24          | `w-6 h-6`                             |
| Icon color     | red-9 `#e5484d`            | `text-[#e5484d]`                     |
| Text color     | red-9 `#e5484d`            | `text-[#e5484d]`                     |

### 4.14 Conflict Dialog

| Property       | Value                      | Tailwind                              |
|----------------|----------------------------|---------------------------------------|
| Overlay        | slate-12 `#1c2024` at 70%  | `bg-[#1c2024]/70`                    |
| Card width     | 240px                      | `w-60`                                |
| Card height    | auto (min ~130px)          | `min-h-[130px]`                      |
| Card bg        | white                      | `bg-white`                            |
| Card radius    | 12px                       | `rounded-xl`                          |
| Card border    | 1px gray-5                 | `border border-[#e0e0e0]`           |
| Icon           | circle-alert, 32x32        | `w-8 h-8`                             |
| Icon color     | red-9 `#e5484d`            | `text-[#e5484d]`                     |
| Title          | 16px / semibold / slate-12 | `text-base font-semibold text-[#1c2024]` |
| Body           | 12px / regular / slate-11  | `text-xs text-[#60646c]`            |
| Body text-align| center                     | `text-center`                         |
| Dismiss link   | 13px / medium / blue-11    | `text-[13px] font-medium text-[#0d74ce]` |
| Padding        | 16px                       | `p-4`                                 |
| Layout         | Center all content         | `flex flex-col items-center gap-2`   |
| Position       | Center of viewport         | `fixed inset-0 flex items-center justify-center` |

### 4.15 NEW Badge

| Property       | Value                      | Tailwind                              |
|----------------|----------------------------|---------------------------------------|
| Width           | 38px                      | `w-auto px-2`                         |
| Height          | 16px                      | `h-4`                                 |
| Background      | red-9 `#e5484d`           | `bg-[#e5484d]`                       |
| Border radius   | 8px (full pill)           | `rounded-full`                        |
| Text            | 9px / bold / white        | `text-[9px] font-bold text-white`    |
| Text transform  | Uppercase                 | `uppercase`                           |
| Position        | Inline, after item name   | `ml-2 inline-flex items-center`      |
| Vertical align  | Center with item name     | `align-middle`                        |

### 4.16 Input Fields

| Property       | Value                      | Tailwind                              |
|----------------|----------------------------|---------------------------------------|
| Height         | 44px (standard), 38px (small) | `h-11` / `h-[38px]`              |
| Background     | sage-2 `#f7f9f8`          | `bg-[#f7f9f8]`                       |
| Border         | 1px gray-8 `#bbbbbb`      | `border border-[#bbbbbb]`           |
| Focus border   | grass-11 `#2a7e3b`        | `focus:border-[#2a7e3b]`            |
| Focus ring     | grass-11 at 20%            | `focus:ring-2 focus:ring-[#2a7e3b]/20` |
| Border radius  | 8px                        | `rounded-lg`                          |
| Padding        | 12px horizontal            | `px-3`                                |
| Text           | 14px / regular / gray-12   | `text-sm text-[#202020]`            |
| Placeholder    | 14px / regular / gray-8    | `placeholder:text-[#bbbbbb]`        |
| Label          | 13px / medium / sand-11    | `text-[13px] font-medium text-[#63635e]` |
| Label gap      | 4px below label            | `mb-1`                                |

### 4.17 Household Color Dot (Dashboard/Summary)

| Property       | Value                      | Tailwind                              |
|----------------|----------------------------|---------------------------------------|
| Size           | 12x12                      | `w-3 h-3`                             |
| Border radius  | 3px                        | `rounded-[3px]`                      |
| Color          | HH dot color (e.g. blue-8) | Dynamic per household                 |
| Vertical align | Center with text           | `mt-0.5` (optical alignment)         |

---

## 5. Interaction Patterns

### 5.1 Tap Targets

| Element            | Minimum Size | Actual Size        |
|--------------------|--------------|--------------------|
| Bottom nav tab     | 44x44        | ~80x56 (generous)  |
| FAB                | 44x44        | 52x52 / 44x44      |
| Item row           | 44x44        | 288x52             |
| Checkbox           | 44x44        | 44x48 (row is tap) |
| Filter tab         | 44x28        | 55-70 x 28         |
| Button (primary)   | 44x44        | full-width x 48-52 |

All interactive elements meet the WCAG 2.2 minimum target size of 24x24, with
most exceeding the recommended 44x44.

### 5.2 Active / Pressed States

| Component      | Pressed State                              |
|----------------|--------------------------------------------|
| Primary button | Darken background 10% (`brightness-90`)    |
| FAB            | Scale down to 95% (`active:scale-95`)      |
| Item row       | bg gray-2 `#f9f9f9` (`active:bg-gray-50`)  |
| Filter tab     | Darken 5% (`active:brightness-95`)          |
| Bottom nav tab | Scale icon 90% (`active:scale-90`)          |
| Checkbox       | Scale 90% (`active:scale-90`)               |

### 5.3 Transitions

| Transition           | Duration | Easing              | Tailwind                          |
|----------------------|----------|----------------------|-----------------------------------|
| Button press         | 150ms    | ease-in-out          | `transition-all duration-150`     |
| Bottom sheet open    | 300ms    | ease-out             | `transition-transform duration-300 ease-out` |
| Bottom sheet close   | 200ms    | ease-in              | `duration-200 ease-in`            |
| Filter tab switch    | 200ms    | ease-in-out          | `transition-colors duration-200`  |
| Checkbox check       | 200ms    | ease-out             | `transition-all duration-200`     |
| Toast enter          | 300ms    | ease-out (slide up)  | Sonner default                    |
| Toast exit           | 200ms    | ease-in (slide down) | Sonner default                    |
| Progress bar fill    | 400ms    | ease-out             | `transition-all duration-400`     |
| Page transition      | 250ms    | ease-in-out          | `transition-opacity duration-250` |

### 5.4 Swipe Gestures

| Gesture              | Direction | Threshold | Action             |
|----------------------|-----------|-----------|---------------------|
| Delete item          | Left      | 80px      | Reveal red delete bg|
| Dismiss swipe        | Right     | 40px      | Snap back to origin |
| Bottom sheet dismiss | Down      | 100px     | Close sheet          |

Swipe feedback: Item follows finger with physics-based spring. Red background
is revealed progressively. "Delete" text fades in when threshold is passed.

---

## 6. Theming: Main vs Shopper Mode

### 6.1 Theme Switching

The app has two visual modes. Switching is triggered by entering/exiting
Shopper Mode (the "Start Shopping" action).

Implementation: A React context provides `mode: 'main' | 'shopper'` that
components read to select the correct color token.

### 6.2 What Changes

| Element          | Main Mode (Green)        | Shopper Mode (Blue)       |
|------------------|--------------------------|---------------------------|
| Header bg        | grass-11 `#2a7e3b`       | blue-11 `#0d74ce`         |
| Status bar bg    | grass-11 `#2a7e3b`       | blue-11 `#0d74ce`         |
| FAB bg           | grass-11 `#2a7e3b`       | blue-11 `#0d74ce`         |
| FAB size         | 52x52                    | 44x44                     |
| Primary button   | grass-11 `#2a7e3b`       | blue-11 `#0d74ce`         |
| Progress bar     | (none)                   | blue-3 track / blue-11 fill|
| Checkboxes       | (none)                   | Shown with grass-9 check  |
| Item rows        | Color bar + meta         | Checkbox + HH tag pill    |
| Bottom nav       | Visible                  | Hidden                    |
| Back navigation  | (none)                   | Arrow-left in header      |
| Header title     | "FamilyCart" / screen    | "SHOPPER MODE" uppercase  |
| NEW badge        | (not shown)              | red-9 on new items        |
| Complete Trip btn| (not shown)              | blue-11, bottom fixed     |

### 6.3 What Stays the Same

| Element          | Behavior in Both Modes                      |
|------------------|----------------------------------------------|
| Card background  | White `#ffffff`                               |
| Card border      | gray-5 `#e0e0e0`                             |
| Text colors      | gray-12, sand-10, mauve-9 hierarchy          |
| Page background  | gray-2 `#f9f9f9`                              |
| Household colors | Same per-household color system               |
| Input fields     | Same styling                                  |
| Toast / Undo     | Same brown-12 toast                           |
| Typography scale | Same font sizes and weights                   |

### 6.4 CSS Custom Properties for Theming

```css
:root {
  /* Theme-aware tokens -- override in .shopper-mode */
  --fc-theme-primary: #2a7e3b;    /* grass-11 */
  --fc-theme-header: #2a7e3b;     /* grass-11 */
  --fc-theme-fab: #2a7e3b;        /* grass-11 */
}

.shopper-mode {
  --fc-theme-primary: #0d74ce;    /* blue-11 */
  --fc-theme-header: #0d74ce;     /* blue-11 */
  --fc-theme-fab: #0d74ce;        /* blue-11 */
}
```

Components reference `var(--fc-theme-primary)` instead of hardcoded colors,
making the theme switch automatic when the `.shopper-mode` class is toggled
on the app root.

---

## 7. RTL & Bidirectional Layout

FamilyCart supports LTR (English) and RTL (Hebrew). The `dir` attribute on `<html>` is set dynamically by `LanguageProvider`.

### 7.1 Logical Properties

All directional CSS must use logical properties so the layout flips automatically:

| Physical (banned) | Logical (required) |
|---|---|
| `ml-*`, `mr-*` | `ms-*`, `me-*` |
| `pl-*`, `pr-*` | `ps-*`, `pe-*` |
| `left-*`, `right-*` | `start-*`, `end-*` |
| `text-left`, `text-right` | `text-start`, `text-end` |
| `borderLeftWidth` | `borderInlineStartWidth` |

### 7.2 Elements That Do Not Flip

- Full-width fixed bars (`left-0 right-0`) — symmetric, no change needed
- Centered modals (`left-[50%] translate-x-[-50%]`) — symmetric
- `flex`, `gap-*`, `justify-between` — direction-agnostic

### 7.3 Item Row Color Bar

The 4px household color bar uses `borderInlineStartWidth`/`borderInlineStartColor`, so it appears on the left in LTR and the right in RTL.

---

## Appendix A: Radix Color Reference (Exact Hex Values Used)

All values are Radix Colors v3, light theme.

```
grass-3:  #e9f6e9    grass-5:  #c9e8ca    grass-7:  #94ce9a
grass-9:  #46a758    grass-11: #2a7e3b    grass-12: #203c25

blue-3:   #e6f4fe    blue-7:   #8ec8f6    blue-8:   #5eb1ef
blue-11:  #0d74ce

amber-9:  #ffc53d    amber-10: #ffba18

plum-8:   ~#be93e4   plum-9:   ~#ab4aba   plum-11:  ~#953ea3
purple-4: #f2e2fc

red-9:    #e5484d

orange-3: #ffefd6    orange-6: #ffc182    orange-9: #f76b15
orange-10:#ef5f00

tomato-3: #feebe7

gray-2:   #f9f9f9    gray-5:   #e0e0e0    gray-8:   #bbbbbb
gray-12:  #202020

sand-10:  #82827c    sand-11:  #63635e

brown-12: #3e332e

mauve-9:  #8e8c99

olive-3:  #eff1ef

sage-2:   #f7f9f8

slate-9:  #8b8d98    slate-11: #60646c    slate-12: #1c2024
```

## Appendix B: Tailwind Config Recommendations

Add these to `tailwind.config.ts` (or CSS custom properties in `index.css`):

```ts
// tailwind.config.ts extend.colors
colors: {
  fc: {
    green: {
      50:  '#e9f6e9',  // grass-3
      100: '#c9e8ca',  // grass-5
      200: '#94ce9a',  // grass-7
      400: '#46a758',  // grass-9
      600: '#2a7e3b',  // grass-11
      900: '#203c25',  // grass-12
    },
    blue: {
      50:  '#e6f4fe',  // blue-3
      200: '#8ec8f6',  // blue-7
      300: '#5eb1ef',  // blue-8
      600: '#0d74ce',  // blue-11
    },
    amber: {
      400: '#ffc53d',  // amber-9
      500: '#ffba18',  // amber-10
    },
    red: {
      500: '#e5484d',  // red-9
    },
    orange: {
      50:  '#ffefd6',  // orange-3
      200: '#ffc182',  // orange-6
      400: '#f76b15',  // orange-9
      500: '#ef5f00',  // orange-10
    },
    neutral: {
      50:  '#f9f9f9',  // gray-2
      100: '#eff1ef',  // olive-3
      200: '#e0e0e0',  // gray-5
      400: '#bbbbbb',  // gray-8
      500: '#8e8c99',  // mauve-9
      600: '#82827c',  // sand-10
      700: '#63635e',  // sand-11
      900: '#202020',  // gray-12
    },
    surface: {
      input: '#f7f9f8',  // sage-2
      toast: '#3e332e',  // brown-12
      overlay: '#1c2024', // slate-12
    },
  },
},
```

## Appendix C: Household Color System (Structured)

The flat array in `src/lib/colors.ts` was replaced with the structured `HouseholdColorSet` interface below.

```ts
export interface HouseholdColorSet {
  dot: string;       // Radix step-9 or step-8 — used for color bars, dots
  tagBg: string;     // Radix step-3 — light fill for pills/tags
  tagBorder: string; // Radix step-7 — border for pills/tags
  tagText: string;   // Radix step-11 — text inside pills/tags
}

export const HOUSEHOLD_COLORS: HouseholdColorSet[] = [
  { dot: '#5eb1ef', tagBg: '#e6f4fe', tagBorder: '#8ec8f6', tagText: '#0d74ce' }, // blue
  { dot: '#ffba18', tagBg: '#feebe7', tagBorder: '#ffc182', tagText: '#ef5f00' }, // orange/amber
  { dot: '#ab4aba', tagBg: '#f2e2fc', tagBorder: '#be93e4', tagText: '#953ea3' }, // plum/purple
  { dot: '#e93d82', tagBg: '#fdebf3', tagBorder: '#f3a6ca', tagText: '#cb1d63' }, // crimson
  { dot: '#12a594', tagBg: '#e1f7f2', tagBorder: '#83cdc1', tagText: '#067a6f' }, // teal
  { dot: '#3e63dd', tagBg: '#e4edfe', tagBorder: '#93b4f4', tagText: '#3451b2' }, // indigo
  { dot: '#d6409f', tagBg: '#fde5f1', tagBorder: '#e7a1c5', tagText: '#c2298a' }, // pink
  { dot: '#00a2c7', tagBg: '#ddf3fa', tagBorder: '#7ac9e3', tagText: '#00749e' }, // cyan
];

export function getHouseholdColors(index: number): HouseholdColorSet {
  return HOUSEHOLD_COLORS[index % HOUSEHOLD_COLORS.length];
}
```

---

*Document version 1.0 -- generated 2026-02-23*
*Source: 8 Frame0 wireframe pages + Radix Colors v3 light theme*
