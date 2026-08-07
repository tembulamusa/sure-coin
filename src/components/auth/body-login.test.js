import React from "react";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";
import BodyLogin from "../auth/body-login";
import {
  clearLocalStorage,
  mockUser,
} from "../../test-utils/mocks";

const mockMakeRequest = jest.fn();

jest.mock("../utils/fetch-request", () => ({
  __esModule: true,
  default: (...args) => mockMakeRequest(...args),
}));

function renderLogin(props = {}) {
  const dispatch = jest.fn();
  const setUser = jest.fn();
  const utils = render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <BodyLogin
        dispatch={dispatch}
        setUser={setUser}
        isModalOpen
        sessionMessage={null}
        contextUser={null}
        {...props}
      />
    </MemoryRouter>
  );
  return { ...utils, dispatch, setUser };
}

describe("BodyLogin", () => {
  beforeEach(() => {
    clearLocalStorage();
    mockMakeRequest.mockReset();
  });

  it("shows validation error for invalid phone", async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/mobile phone/i), "123");
    await user.type(screen.getByLabelText(/^password$/i), "secret");
    await user.click(screen.getByRole("button", { name: /^login$/i }));

    // Placeholder switches to the error text when invalid
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/invalid phone number/i)).toBeInTheDocument();
    });
    expect(mockMakeRequest).not.toHaveBeenCalled();
  });

  it("logs in successfully and closes the modal", async () => {
    const user = userEvent.setup();
    const session = mockUser();
    mockMakeRequest.mockResolvedValue([
      200,
      { status: 200, data: session },
    ]);

    const { dispatch, setUser } = renderLogin();

    await user.type(screen.getByLabelText(/mobile phone/i), "0705182016");
    await user.type(screen.getByLabelText(/^password$/i), "secret123");
    await user.click(screen.getByRole("button", { name: /^login$/i }));

    await waitFor(() => {
      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "auth/login",
          method: "POST",
          api_version: "sureCoinPublic",
          data: {
            msisdn: "254705182016",
            password: "secret123",
          },
        })
      );
    });

    await waitFor(() => {
      expect(setUser).toHaveBeenCalledWith(session);
      expect(dispatch).toHaveBeenCalledWith({
        type: "DEL",
        key: "showloginmodal",
      });
    });
    expect(JSON.parse(window.localStorage.getItem("user")).value.token).toBe(
      session.token
    );
  });

  it("shows friendly error description on failed credentials", async () => {
    const user = userEvent.setup();
    mockMakeRequest.mockResolvedValue([
      403,
      {
        result: "Failed",
        error: { description: "Invalid phone number or password" },
      },
    ]);

    renderLogin();

    await user.type(screen.getByLabelText(/mobile phone/i), "0705182016");
    await user.type(screen.getByLabelText(/^password$/i), "wrongpass");
    await user.click(screen.getByRole("button", { name: /^login$/i }));

    expect(
      await screen.findByText(/invalid phone number or password/i)
    ).toBeInTheDocument();
  });
});
