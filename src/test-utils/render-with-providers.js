import React, { useReducer } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Context } from "../context/store";
import Reducer from "../context/reducer";

/**
 * Render UI with MemoryRouter + app Context (overridable initial state).
 */
export function renderWithProviders(
  ui,
  {
    route = "/",
    initialEntries,
    initialState = {},
    ...renderOptions
  } = {}
) {
  const entries = initialEntries || [route];

  function Wrapper({ children }) {
    const [state, dispatch] = useReducer(Reducer, {
      error: null,
      user: null,
      ...initialState,
    });

    return (
      <MemoryRouter
        initialEntries={entries}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Context.Provider value={[state, dispatch]}>{children}</Context.Provider>
      </MemoryRouter>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

export * from "@testing-library/react";
