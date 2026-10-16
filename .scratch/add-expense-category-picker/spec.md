<!-- triage: resolved -->
# Spec: Category Selection List on Add Expense

Status: resolved

## Problem Statement

When users tap the central "Add Expense" button (`-`) on the dashboard, the application immediately opens the numeric keypad modal pre-loaded with an arbitrary default category (the first expense category found in local storage). Because the keypad modal does not allow changing the category once opened, users cannot choose which category their expense belongs to when initiating an entry from the central hub. Users must either cancel out and locate the category on the radial grid or donut slices, or accept an incorrect category. Users need a clear, visual category selection step when tapping "Add Expense" so they can pick their desired category before entering the transaction details.

## Solution

When the user taps the "Add Expense" action button, the application presents an interactive Category Picker sheet/modal displaying all active, visible expense categories. The picker respects the user's custom category display order and visibility preferences configured in Settings. Each category is displayed with its distinctive icon, color avatar, name, and optional budget/spend cues. When the user selects a category, the picker smoothly transitions into the Numeric Keypad modal with that chosen category active and ready for amount entry. If the user dismisses the picker (via close button, tapping the backdrop, pressing Escape, or using the Android hardware back button), the action is cancelled cleanly without mutating state or opening the keypad. Tapping an individual category directly from the donut wheel slices or the radial grid continues to open the keypad directly with that category, preserving the fast one-tap path for known categories.

## User Stories

1. As an expense tracking user, when I tap the central "Add Expense" button, I want to see a list of all my available expense categories, so that I can choose the appropriate category for my purchase.
2. As a user, I want the category list to display each category's icon, color, and name, so that I can quickly recognize my desired category.
3. As a user who customized category order in Settings, I want the category list to display categories in my preferred sequence, so that my most frequent categories are placed conveniently at the top.
4. As a user who hid specific categories in Settings, I want hidden categories to be omitted from the selection list, so that inactive categories do not clutter my view.
5. As a user, when I tap a category from the selection list, I want the numeric keypad to open immediately with that category pre-selected, so that I can enter the expense amount without additional taps.
6. As a user, I want to be able to close or cancel the category selection list at any time, so that I can return to the dashboard if I tapped the button by mistake.
7. As a mobile user on Android, I want pressing the device hardware back button while the category list is open to close the list, so that the interaction conforms to native mobile navigation expectations.
8. As a user on a mobile device with a compact screen, I want the category list presented as a responsive grid or bottom sheet with touch-friendly targets, so that every category is easy to tap with one thumb.
9. As a user whose desired category does not exist yet, I want a "+ Custom / New Category" action inside the category list, so that I can create a new category on the fly without having to navigate away to Settings.
10. As a user who taps directly on a category slice in the donut chart, I want the keypad to open directly with that category without showing the list, so that my single-tap workflow is preserved.
11. As a user who taps directly on a category icon in the radial quick-tap grid, I want the keypad to open directly for that category, so that direct shortcuts remain instant.
12. As a user tracking a monthly budget, I want categories that have exceeded their budget to display a subtle visual indicator in the selection list, so that I am aware of budget status before logging the expense.
13. As a keyboard user, I want to navigate the category selection list using arrow keys or Tab, and select a category using Enter or Space, so that I can record transactions without a mouse or touchscreen.
14. As a screen reader user, I want the category selection dialog to provide descriptive accessible labels (`role="dialog"`, `aria-label`, and focus management), so that assistive technologies announce the modal and its options clearly.
15. As a user toggling between dark and light themes, I want the category list to render with appropriate theme tokens, contrast ratios, and glassmorphic styling, so that it remains visually comfortable in any environment.
16. As an offline user, I want category list rendering and selection to function entirely from client-side state without network dependencies, so that expense entry is instantaneous anywhere.

## Implementation Decisions

- **The modules that will be built/modified**:
  - A new or dedicated `CategoryPickerModal` module displaying selectable categories in a responsive sheet/modal with touch-friendly grid cells, category icons, colors, names, budget indicators, and an optional "New Category" trigger.
  - The `Dashboard` orchestration module updated to manage the category picker modal state, distinguishing between direct-category invocation (from radial grid / wheel slices) and generic "Add Expense" invocation (from the central balance hub).
  - The `CenterBalance` hub module wiring verified so that tapping the quick expense action (`-`) triggers the category selection workflow.

- **The interfaces of those modules that will be modified**:
  - `CategoryPickerModal` interface:
    - Accepts an array of categories, a transaction type (`expense` or `income`), category spending totals, category budgets, display currency, an `isOpen` boolean flag, an `onSelectCategory` callback, an `onClose` callback, and an optional `onOpenCustomizer` callback.
  - `Dashboard` module internal flow:
    - `handleOpenExpenseKeypad(category?: Category)`: If `category` is provided, opens the keypad directly for that category. If `category` is omitted (generic "Add Expense"), opens the category picker modal.
    - When a category is picked in `CategoryPickerModal`, sets the selected category, closes the picker, and opens the numeric keypad modal.
    - Back-button handling registered so that the category picker modal closes cleanly on Android hardware back button before returning to the dashboard.

- **Architectural & Design Decisions**:
  - **Single Seam Principle**: Rather than complicating the numeric keypad modal with inline category switching logic, keep the `NumericKeypadModal` focused on calculator math, note input, and transaction confirmation. Category selection remains an independent, deep modal step that delegates to the keypad once resolved.
  - **Single-Source Category Sequence**: Category ordering and visibility logic is reused from the existing domain rules (filter `isVisible !== false && !isDeleted`, sort by `displayOrder` ascending, fallback to spend/budget priority).
  - **Direct-Tap Bypass**: Direct interactions with specific categories on the donut chart or radial grid bypass the category list and open the keypad immediately, ensuring zero regression for existing fast-entry paths.

- **Specific Interactions**:
  - Tapping the central red `-` button (`btn-quick-expense`) opens the Category Picker modal displaying all visible expense categories.
  - Tapping any category item in the picker closes the picker and opens the Numeric Keypad modal with that category selected.
  - Tapping the "Cancel" / "Close" button or backdrop closes the picker and returns to the dashboard without opening the keypad.
  - Tapping "Custom / New Category" opens the Category Customizer modal, allowing creation of a new category and subsequent selection.

## Testing Decisions

- **What makes a good test**: Tests must verify observable system behavior through external seams, rather than asserting on internal state flags, component hooks, or private functions. A test should verify that clicking the "Add Expense" action presents the category options to the user, clicking a category transitions to the keypad with that category's identity, and cancelling returns to the dashboard without state mutation.
- **Which modules will be tested**:
  - **Dashboard Component Seam**: Tested in Vitest with `@testing-library/react` and `fake-indexeddb` to verify the end-to-end user interaction flow from clicking "Add Expense", seeing categories, selecting one, and seeing the keypad modal open with the selected category.
  - **Category Picker Modal Seam**: Tested in isolation for accessibility, display ordering, hidden category exclusion, over-budget indicators, keyboard navigation, and event propagation.
  - **End-to-End Browser Seam**: Playwright E2E tests validating the real browser flow on desktop and mobile viewports.
- **Proposed Testing Seams**:
  - **Primary Seam**: `MonefyDashboard` mounted within `FinanceProvider` using in-memory local database. Exercising `btn-quick-expense` -> clicking a category in the picker -> verifying keypad opens with the selected category -> entering amount -> verifying transaction saved in database.
  - **Secondary Seam**: `CategoryPickerModal` component tests checking rendering of categories, respect of `displayOrder`, hidden category exclusion, and selection callbacks.
- **Prior art for the tests**:
  - `client/src/test/MonefyDashboard.test.tsx` (existing tests for dashboard modals, keypad invocation, and back-button sequence).
  - `client/src/test/RadialCategoryGrid.test.tsx` (existing tests for category rendering, budget badges, and selection events).
  - `client/src/test/CategoryOrderSettings.test.tsx` (existing tests for category visibility and display order).
  - `client/e2e/seam-1-wheel-transactions.spec.ts` (Playwright E2E tests for center balance hub and keypad interactions).

## Out of Scope

- Redesigning the numeric calculator keypad itself.
- Multi-currency automatic conversion during expense entry.
- Modifying database schemas or sync protocols (categories, transactions, and sync queue models already fully support this flow).
- Inline sub-category nesting or hierarchy (categories remain flat with custom order).

## Further Notes

- While this specification addresses "Add Expense" per the user request, the underlying `CategoryPickerModal` is designed to be reusable for "Add Income" in the future if desired.
- Existing tests that clicked `btn-quick-expense` and expected immediate keypad appearance without category selection will be updated to select a category from the picker as part of the implementation ticket.
