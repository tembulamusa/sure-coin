import React from "react";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../../test-utils/render-with-providers";
import {
  clearLocalStorage,
  mockUser,
  seedLocalStorageUser,
} from "../../test-utils/mocks";
import DepositModal from "./deposit-modal";

const mockMakeRequest = jest.fn();

jest.mock("../utils/fetch-request", () => ({
  __esModule: true,
  default: (...args) => mockMakeRequest(...args),
}));

describe("DepositModal", () => {
  beforeEach(() => {
    clearLocalStorage();
    mockMakeRequest.mockReset();
  });

  it("calls deposit and updates balance on success", async () => {
    const user = userEvent.setup();
    const session = mockUser({ balance: 100, cash_balance: 100 });
    seedLocalStorageUser(session);
    mockMakeRequest.mockResolvedValue([
      200,
      {
        status: 200,
        message: "Deposit successful",
        cash: 150,
        bonus: 0,
        total: 150,
      },
    ]);

    renderWithProviders(<DepositModal />, {
      initialState: {
        user: session,
        promptdepositrequest: { show: true, mode: "deposit", payableAmt: 10 },
      },
    });

    const amountInput = screen.getByPlaceholderText(/enter amount/i);
    await user.clear(amountInput);
    await user.type(amountInput, "50");
    await user.click(document.querySelector('button[type="submit"]'));

    await waitFor(() => {
      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "deposit",
          method: "POST",
          api_version: "sureCoin",
          data: { amount: 50 },
        })
      );
    });

    expect(
      await screen.findByText(/deposit successful/i)
    ).toBeInTheDocument();

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem("user")).value;
      expect(stored.balance).toBe(150);
      expect(stored.cash_balance).toBe(150);
    });
  });

  it("calls withdraw when withdraw tab is active", async () => {
    const user = userEvent.setup();
    const session = mockUser({ balance: 200, cash_balance: 200 });
    seedLocalStorageUser(session);
    mockMakeRequest.mockResolvedValue([
      200,
      {
        status: 200,
        message: "Withdrawal successful",
        cash: 150,
        bonus: 0,
        total: 150,
      },
    ]);

    renderWithProviders(<DepositModal />, {
      initialState: {
        user: session,
        promptdepositrequest: { show: true, mode: "withdraw", payableAmt: 10 },
      },
    });

    const amountInput = screen.getByPlaceholderText(/enter amount/i);
    await user.clear(amountInput);
    await user.type(amountInput, "50");
    await user.click(document.querySelector('button[type="submit"]'));

    await waitFor(() => {
      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "withdraw",
          method: "POST",
          api_version: "sureCoin",
          data: { amount: 50 },
        })
      );
    });

    expect(
      await screen.findByText(/withdrawal successful/i)
    ).toBeInTheDocument();
  });

  it("shows amount validation error for out-of-range value", async () => {
    const user = userEvent.setup();
    const session = mockUser();
    seedLocalStorageUser(session);

    renderWithProviders(<DepositModal />, {
      initialState: {
        user: session,
        promptdepositrequest: { show: true, mode: "deposit", payableAmt: 10 },
      },
    });

    const amountInput = screen.getByPlaceholderText(/enter amount/i);
    await user.clear(amountInput);
    await user.type(amountInput, "5");
    await user.click(document.querySelector('button[type="submit"]'));

    expect(
      await screen.findByText(/please enter amount between kes 10/i)
    ).toBeInTheDocument();
    expect(mockMakeRequest).not.toHaveBeenCalled();
  });
});
