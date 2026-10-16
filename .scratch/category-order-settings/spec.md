# Specification: Category Order and Visibility Configuration in Settings

## Overview
Enable users to configure which categories (default and custom) are visible on the dashboard and define the order in which they appear. These selections and ordering must be managed within the **Settings & Data** modal and reflected in the dashboard wheel / radial category grid.

## Requirements
1. **Data Model**:
   - `Category` interface contains `displayOrder?: number` and `isVisible?: boolean` (defaults to `true`).
   - Default expense and income categories seeded with `displayOrder` matching their initial index (0, 1, 2...) and `isVisible: true`.
   - Dexie local DB index and migration support `displayOrder` and `isVisible`.

2. **FinanceContext & CRUD**:
   - Provide `updateCategory(id, updates)`, `reorderCategories(orderedIds)`, and `toggleCategoryVisibility(id, isVisible)`.
   - Operations persist to IndexedDB, register with offline `syncQueue`, and update UI state.

3. **Dashboard & Radial Grid Behavior**:
   - Filter `expense` categories where `isVisible !== false` and `!isDeleted`.
   - Sort categories by `displayOrder` ascending (fallback to natural order), so the user's custom sequence determines their position on the dashboard and quick-tap grid.

4. **Settings UI**:
   - Add a "Categories & Display Order" section in `SettingsModal`.
   - Tabbed view: "Expenses" | "Income".
   - Each item has:
     - Checkbox / Toggle to enable or disable (must keep at least 1 category visible).
     - Category icon, name, and color avatar.
     - Move Up (↑) and Move Down (↓) buttons to reorder categories.
     - "Reset Order" option to restore default ordering.
   - Accessible via Settings modal and directly from Header dropdown's "Categories" button.
