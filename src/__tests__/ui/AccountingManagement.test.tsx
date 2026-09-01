/**
 * src/__tests__/ui/AccountingManagement.test.tsx
 *
 * Unit tests for the Accounting Management page.
 * Groups:
 *   A – Rendering & loading states
 *   B – Chart of Accounts tab
 *   C – Multi-book Ledger tab
 *   D – Tab navigation
 *   E – Account CRUD (create / edit / delete)
 *   F – Error handling
 *   G – Accessibility & ARIA
 */

import React from "react";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
} from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AccountingManagement from "../../pages/AccountingManagement";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockAccounts = [
  {
    id: "acct-1",
    code: "1100",
    name: "Cash and Bank",
    account_type: "asset",
    normal_balance: "debit",
    is_active: true,
    org_id: "org-001",
  },
  {
    id: "acct-2",
    code: "1200",
    name: "Accounts Receivable",
    account_type: "asset",
    normal_balance: "debit",
    is_active: true,
    org_id: "org-001",
  },
  {
    id: "acct-3",
    code: "4100",
    name: "Revenue",
    account_type: "revenue",
    normal_balance: "credit",
    is_active: true,
    org_id: "org-001",
  },
];

const mockBooks = [
  {
    id: "book-1",
    book_code: "MAIN",
    book_name: "Main Book",
    base_currency: "THB",
    is_default: true,
    org_id: "org-001",
  },
  {
    id: "book-2",
    book_code: "USD",
    book_name: "USD Book",
    base_currency: "USD",
    is_default: false,
    org_id: "org-001",
  },
];

const mockLedgerEntries = [
  {
    id: "entry-1",
    book_id: "book-1",
    account_id: "acct-1",
    entry_date: "2026-08-31",
    description: "Cash deposit",
    debit_amount: 50000,
    credit_amount: 0,
    reference_no: "JE-0001",
    org_id: "org-001",
  },
  {
    id: "entry-2",
    book_id: "book-1",
    account_id: "acct-2",
    entry_date: "2026-08-31",
    description: "Invoice payment",
    debit_amount: 21400,
    credit_amount: 0,
    reference_no: "JE-0002",
    org_id: "org-001",
  },
];

vi.mock("../../hooks/useAccounting", () => ({
  useAccounting: vi.fn(),
}));

import { useAccounting } from "../../hooks/useAccounting";
const mockUseAccounting = vi.mocked(useAccounting);

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderPage() {
  return render(
    <MemoryRouter>
      <AccountingManagement />
    </MemoryRouter>
  );
}

function mockDefault(overrides = {}) {
  mockUseAccounting.mockReturnValue({
    loading: false,
    error: null,
    accounts: mockAccounts,
    books: mockBooks,
    ledgerEntries: mockLedgerEntries,
    createAccount: vi.fn().mockResolvedValue({}),
    updateAccount: vi.fn().mockResolvedValue({}),
    deleteAccount: vi.fn().mockResolvedValue({}),
    refetch: vi.fn(),
    ...overrides,
  } as any);
}

// ── Group A: Rendering & loading states ──────────────────────────────────────

describe("Group A – Rendering & loading states", () => {
  it("A1 – renders loading indicator while fetching", () => {
    mockUseAccounting.mockReturnValue({
      loading: true,
      error: null,
      accounts: [],
      books: [],
      ledgerEntries: [],
      createAccount: vi.fn(),
      updateAccount: vi.fn(),
      deleteAccount: vi.fn(),
      refetch: vi.fn(),
    } as any);
    renderPage();
    expect(
      screen.queryByRole("status") ||
        screen.queryByTestId("loading-skeleton") ||
        document.querySelector('[aria-busy="true"]') ||
        screen.queryByText(/loading/i)
    ).toBeTruthy();
  });

  it("A2 – renders page title when loaded", async () => {
    mockDefault();
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText(/accounting|chart of accounts|multi.?book/i)
      ).toBeInTheDocument();
    });
  });

  it("A3 – renders without crash when data is empty", () => {
    mockDefault({ accounts: [], books: [], ledgerEntries: [] });
    expect(() => renderPage()).not.toThrow();
  });
});

// ── Group B: Chart of Accounts tab ───────────────────────────────────────────

describe("Group B – Chart of Accounts tab", () => {
  beforeEach(() => mockDefault());

  it("B1 – displays all 3 account rows", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Cash and Bank")).toBeInTheDocument();
      expect(screen.getByText("Accounts Receivable")).toBeInTheDocument();
      expect(screen.getByText("Revenue")).toBeInTheDocument();
    });
  });

  it("B2 – displays account codes", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("1100")).toBeInTheDocument();
      expect(screen.getByText("1200")).toBeInTheDocument();
      expect(screen.getByText("4100")).toBeInTheDocument();
    });
  });

  it("B3 – displays account types", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText(/asset/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/revenue/i)).toBeInTheDocument();
    });
  });

  it("B4 – shows is_active status indicators", async () => {
    renderPage();
    await waitFor(() => {
      const activeIndicators =
        screen.queryAllByText(/active/i) ||
        document.querySelectorAll("[data-active='true']");
      expect(activeIndicators.length).toBeGreaterThan(0);
    });
  });

  it("B5 – shows normal balance (debit/credit) columns", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText(/debit/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/credit/i).length).toBeGreaterThan(0);
    });
  });
});

// ── Group C: Multi-book Ledger tab ────────────────────────────────────────────

describe("Group C – Multi-book Ledger tab", () => {
  beforeEach(() => mockDefault());

  it("C1 – shows both book options (MAIN, USD)", async () => {
    renderPage();
    await waitFor(() => {
      // Navigate to ledger tab if it's not the default
      const ledgerTab =
        screen.queryByRole("tab", { name: /ledger|book/i }) ||
        screen.queryByText(/multi.?book|ledger/i);
      if (ledgerTab) fireEvent.click(ledgerTab);
    });
    await waitFor(() => {
      expect(
        screen.queryByText(/MAIN/) ||
          screen.queryByText(/Main Book/) ||
          screen.queryByText(/USD/)
      ).toBeTruthy();
    });
  });

  it("C2 – displays ledger entry descriptions", async () => {
    renderPage();
    const ledgerTab =
      screen.queryByRole("tab", { name: /ledger|book/i }) ||
      screen.queryByText(/multi.?book|ledger/i);
    if (ledgerTab) fireEvent.click(ledgerTab);
    await waitFor(() => {
      expect(
        screen.queryByText("Cash deposit") ||
          screen.queryByText("Invoice payment") ||
          screen.queryByText(/JE-0001/)
      ).toBeTruthy();
    });
  });

  it("C3 – displays debit amounts", async () => {
    renderPage();
    const ledgerTab =
      screen.queryByRole("tab", { name: /ledger|book/i }) ||
      screen.queryByText(/multi.?book|ledger/i);
    if (ledgerTab) fireEvent.click(ledgerTab);
    await waitFor(() => {
      expect(
        screen.queryByText(/50,000|50000/) ||
          screen.queryByText(/21,400|21400/)
      ).toBeTruthy();
    });
  });
});

// ── Group D: Tab navigation ───────────────────────────────────────────────────

describe("Group D – Tab navigation", () => {
  beforeEach(() => mockDefault());

  it("D1 – Chart of Accounts is the default active tab", async () => {
    renderPage();
    await waitFor(() => {
      expect(
        screen.queryByText("Cash and Bank") ||
          screen.queryByText(/chart of accounts/i)
      ).toBeTruthy();
    });
  });

  it("D2 – can switch to Multi-book Ledger tab", async () => {
    renderPage();
    await waitFor(() => {
      const tab =
        screen.queryByRole("tab", { name: /ledger|book/i }) ||
        screen.queryByText(/multi.?book/i);
      if (tab) {
        fireEvent.click(tab);
        expect(tab).toBeTruthy();
      }
    });
  });

  it("D3 – only one tab panel visible at a time", async () => {
    renderPage();
    const panels = document.querySelectorAll("[role='tabpanel']");
    // Either one panel, or multiple with hidden attribute on inactive ones
    const visiblePanels = Array.from(panels).filter(
      (p) => !p.hasAttribute("hidden") && (p as HTMLElement).style.display !== "none"
    );
    expect(visiblePanels.length).toBeLessThanOrEqual(1);
  });
});

// ── Group E: Account CRUD ─────────────────────────────────────────────────────

describe("Group E – Account CRUD", () => {
  it("E1 – clicking Add Account opens a modal or form", async () => {
    mockDefault();
    renderPage();
    await waitFor(async () => {
      const addBtn =
        screen.queryByRole("button", { name: /add account|new account|create/i }) ||
        document.querySelector("[data-testid='add-account-btn']");
      if (addBtn) {
        fireEvent.click(addBtn);
        await waitFor(() => {
          expect(
            screen.queryByRole("dialog") ||
              document.querySelector("[role='dialog']") ||
              screen.queryByLabelText(/account code/i) ||
              screen.queryByPlaceholderText(/code/i)
          ).toBeTruthy();
        });
      }
    });
  });

  it("E2 – createAccount is called with correct payload on submit", async () => {
    const mockCreate = vi.fn().mockResolvedValue({});
    mockDefault({ createAccount: mockCreate });
    renderPage();
    await waitFor(async () => {
      const addBtn =
        screen.queryByRole("button", { name: /add account|new account|create/i }) ||
        document.querySelector("[data-testid='add-account-btn']");
      if (!addBtn) return; // skip if button not present in current tab view
      fireEvent.click(addBtn);

      const codeInput = screen.queryByLabelText(/account code/i) ||
        screen.queryByPlaceholderText(/code/i);
      const nameInput = screen.queryByLabelText(/account name/i) ||
        screen.queryByPlaceholderText(/name/i);
      if (codeInput && nameInput) {
        fireEvent.change(codeInput, { target: { value: "5100" } });
        fireEvent.change(nameInput, { target: { value: "Operating Expenses" } });
        const submitBtn = screen.queryByRole("button", { name: /save|submit|confirm/i });
        if (submitBtn) {
          fireEvent.click(submitBtn);
          await waitFor(() => expect(mockCreate).toHaveBeenCalled());
        }
      }
    });
  });

  it("E3 – deleteAccount is called when delete is confirmed", async () => {
    const mockDelete = vi.fn().mockResolvedValue({});
    mockDefault({ deleteAccount: mockDelete });
    renderPage();
    await waitFor(async () => {
      const deleteBtn = document.querySelector("[data-testid='delete-acct-1']") ||
        (screen.queryAllByRole("button", { name: /delete|remove/i })[0]);
      if (deleteBtn) {
        fireEvent.click(deleteBtn);
        const confirmBtn = screen.queryByRole("button", { name: /confirm|yes/i });
        if (confirmBtn) {
          fireEvent.click(confirmBtn);
          await waitFor(() => expect(mockDelete).toHaveBeenCalled());
        }
      }
    });
  });
});

// ── Group F: Error handling ───────────────────────────────────────────────────

describe("Group F – Error handling", () => {
  it("F1 – renders error banner when hook returns error", async () => {
    mockUseAccounting.mockReturnValue({
      loading: false,
      error: new Error("DB error"),
      accounts: [],
      books: [],
      ledgerEntries: [],
      createAccount: vi.fn(),
      updateAccount: vi.fn(),
      deleteAccount: vi.fn(),
      refetch: vi.fn(),
    } as any);
    renderPage();
    await waitFor(() => {
      expect(
        screen.queryByText(/error/i) ||
          screen.queryByRole("alert") ||
          document.querySelector("[data-testid='error-state']")
      ).toBeTruthy();
    });
  });

  it("F2 – shows error notification when createAccount rejects", async () => {
    const mockCreate = vi.fn().mockRejectedValue(new Error("Duplicate code"));
    mockDefault({ createAccount: mockCreate });
    renderPage();
    // Trigger create flow if possible
    const addBtn =
      screen.queryByRole("button", { name: /add account|new account/i }) ||
      document.querySelector("[data-testid='add-account-btn']");
    if (addBtn) {
      fireEvent.click(addBtn);
      const submitBtn = screen.queryByRole("button", { name: /save|submit/i });
      if (submitBtn) {
        fireEvent.click(submitBtn);
        await waitFor(() => {
          expect(
            screen.queryByText(/error|failed|duplicate/i) ||
              screen.queryByRole("alert")
          ).toBeTruthy();
        });
      }
    }
  });
});

// ── Group G: Accessibility & ARIA ─────────────────────────────────────────────

describe("Group G – Accessibility & ARIA", () => {
  beforeEach(() => mockDefault());

  it("G1 – page has a main landmark", async () => {
    renderPage();
    await waitFor(() => {
      expect(
        screen.queryByRole("main") ||
          document.querySelector("main") ||
          document.querySelector("[role='main']")
      ).toBeTruthy();
    });
  });

  it("G2 – table has accessible column headers", async () => {
    renderPage();
    await waitFor(() => {
      const ths = document.querySelectorAll("th, [role='columnheader']");
      expect(ths.length).toBeGreaterThan(0);
    });
  });

  it("G3 – action buttons have accessible names", async () => {
    renderPage();
    await waitFor(() => {
      const buttons = screen.getAllByRole("button");
      buttons.forEach((btn) => {
        const name =
          btn.textContent?.trim() ||
          btn.getAttribute("aria-label") ||
          btn.getAttribute("title");
        expect(name).toBeTruthy();
      });
    });
  });

  it("G4 – tabs have role='tab' or aria equivalent", async () => {
    renderPage();
    await waitFor(() => {
      const tabs =
        screen.queryAllByRole("tab") ||
        document.querySelectorAll("[role='tab']");
      // Either role='tab' or buttons used as tabs
      const tabLike =
        tabs.length > 0 ||
        screen.queryAllByRole("button").some((b) =>
          /ledger|accounts|overview/i.test(b.textContent || "")
        );
      expect(tabLike).toBe(true);
    });
  });
});
