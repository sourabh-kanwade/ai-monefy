# 02: Dashboard Add Expense Picker Flow Integration

**What to build:** Integrate `CategoryPickerModal` into `MonefyDashboard`. When the user taps the central "Add Expense" button (`btn-quick-expense`) without a pre-selected category, open the Category Picker. Upon selecting a category, transition immediately into the Numeric Keypad modal with that category pre-selected. Direct taps from the radial wheel or donut slices continue opening the keypad directly. Register hardware back button dismissal for the category picker.

**Blocked by:** 01-category-picker-modal-component

**Status:** resolved

- [x] Tapping `btn-quick-expense` on `CenterBalance` opens `CategoryPickerModal` for expenses instead of defaulting to first category.
- [x] Selecting a category from the picker sets `selectedCategory` and opens `NumericKeypadModal`.
- [x] Direct taps on radial grid items and donut chart slices still open keypad directly with selected category.
- [x] Register category picker with hardware back-button listener for mobile Android navigation.
- [x] Update existing unit and E2E tests to reflect the category selection step when tapping `btn-quick-expense`.
- [x] Verify test suite and build cleanly.

## Answer

Integrated `CategoryPickerModal` into `MonefyDashboard.tsx`. Tapping `btn-quick-expense` seamlessly opens `CategoryPickerModal`. Selecting a category immediately transitions to `NumericKeypadModal` pre-loaded with the selected category. Direct interactions via radial category grid and donut chart slices continue opening the keypad directly for that category. Hardware back-button listener dismisses `CategoryPickerModal`. All unit and E2E tests (`CategoryPickerFlow.test.tsx`, `MonefyDashboard.test.tsx`, `seam-1-wheel-transactions.spec.ts`, `seam-5-settings-export-import.spec.ts`) updated and passing with 100% clean build.

