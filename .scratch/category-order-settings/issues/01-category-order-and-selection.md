# Issue 01: Category Order and Visibility Selection in Settings

Status: resolved

## Description
Implement user configuration for category visibility and display order in Settings.
Categories must be selectable (toggle visible on dashboard) and their order configurable (Move Up / Down).
The dashboard radial grid must respect this sequence and visibility setting.

## Acceptance Criteria
1. `Category` type supports `displayOrder` and `isVisible`.
2. `FinanceContext` provides `reorderCategories`, `toggleCategoryVisibility`, and `updateCategory`.
3. `SettingsModal` contains an interactive Categories management section supporting reordering (Move Up / Down) and visibility toggle.
4. `RadialCategoryGrid` displays enabled categories in their configured order.
5. Header menu "Categories" item opens this settings section.
6. Automated tests verify category reordering, visibility toggle, and radial grid rendering.

## Resolution
- Extended `Category` model in `client/src/types/index.ts` and `client/src/db/localDb.ts` with `displayOrder` and `isVisible`.
- Seeded default categories with natural sequence `displayOrder` and `isVisible: true`, with automatic backfill for existing records.
- Added `toggleCategoryVisibility`, `reorderCategories`, `updateCategory`, and `deleteCategory` to `FinanceContext.tsx`.
- Updated `RadialCategoryGrid.tsx` to filter by `isVisible !== false` and sort by `displayOrder` ascending.
- Added "Categories & Display Order" section in `SettingsModal.tsx` with Expense/Income tabs, visibility toggles, and Move Up / Down reordering controls.
- Connected Header dropdown "Categories" option directly to `SettingsModal`.
- Added automated seam test suite `client/src/test/CategoryOrderSettings.test.tsx` (all passing).
- Verified production build and capacitor sync clean.
