import React from "react";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../../test-utils/render-with-providers";
import {
  clearLocalStorage,
  mockUser,
  seedLocalStorageUser,
} from "../../test-utils/mocks";
import Signup from "./signup";

const mockNavigate = jest.fn();
const mockMakeRequest = jest.fn();
const mockNotify = jest.fn();

jest.mock("../utils/fetch-request", () => ({
  __esModule: true,
  default: (...args) => mockMakeRequest(...args),
}));

jest.mock("../utils/Notify", () => ({
  __esModule: true,
  default: (...args) => mockNotify(...args),
}));

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("Signup page", () => {
  beforeEach(() => {
    clearLocalStorage();
    mockNavigate.mockReset();
    mockMakeRequest.mockReset();
    mockNotify.mockReset();
  });

  it("shows validation errors for invalid input", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Signup />, { route: "/signup" });

    await user.click(screen.getByRole("button", { name: /signup/i }));

    expect(
      await screen.findByText(/please enter a valid phone number/i)
    ).toBeInTheDocument();
    expect(mockMakeRequest).not.toHaveBeenCalled();
  });

  it("shows password mismatch error", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Signup />, { route: "/signup" });

    await user.type(screen.getByPlaceholderText(/phone number/i), "0705182016");
    await user.type(screen.getByPlaceholderText(/^password$/i), "secret");
    await user.type(screen.getByPlaceholderText(/repeat password/i), "other");
    await user.click(screen.getByRole("button", { name: /signup/i }));

    expect(await screen.findByText(/passwords don't match/i)).toBeInTheDocument();
    expect(mockMakeRequest).not.toHaveBeenCalled();
  });

  it("registers successfully, stores user, and navigates to game", async () => {
    const user = userEvent.setup();
    const session = mockUser({ display_name: "New Player" });
    mockMakeRequest.mockResolvedValue([
      200,
      { status: 200, data: session },
    ]);

    renderWithProviders(<Signup />, { route: "/signup" });

    await user.type(screen.getByPlaceholderText(/phone number/i), "0705182016");
    await user.type(screen.getByPlaceholderText(/^password$/i), "secret");
    await user.type(screen.getByPlaceholderText(/repeat password/i), "secret");
    await user.click(screen.getByRole("button", { name: /signup/i }));

    await waitFor(() => {
      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "auth/signup",
          method: "POST",
          api_version: "sureCoinPublic",
          data: expect.objectContaining({
            msisdn: "254705182016",
            password: "secret",
          }),
        })
      );
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/game");
    });
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ status: 200 })
    );
    expect(JSON.parse(window.localStorage.getItem("user")).value.token).toBe(
      session.token
    );
  });

  it("redirects home when already logged in", async () => {
    seedLocalStorageUser();
    renderWithProviders(<Signup />, { route: "/signup" });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });
});
