/**
 * Helpers for mocking makeRequest / localStorage in component tests.
 */

export const mockUser = (overrides = {}) => ({
  profile_id: 1,
  msisdn: "254705182016",
  display_name: "Test Player",
  token: "test-jwt-token",
  cash_balance: 100,
  bonus_balance: 0,
  balance: 100,
  ...overrides,
});

export const seedLocalStorageUser = (user = mockUser()) => {
  window.localStorage.setItem(
    "user",
    JSON.stringify({
      value: user,
    })
  );
};

export const clearLocalStorage = () => {
  window.localStorage.clear();
};
