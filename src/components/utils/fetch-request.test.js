/**
 * @jest-environment jsdom
 */

const mockGetFromLocalStorage = jest.fn();

jest.mock("./local-storage", () => ({
  getFromLocalStorage: (...args) => mockGetFromLocalStorage(...args),
  setLocalStorage: jest.fn(),
  removeItem: jest.fn(),
}));

describe("fetch-request / makeRequest", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetModules();
    mockGetFromLocalStorage.mockReset();
    process.env.REACT_APP_SURECOIN_URL = "https://example.test/api/v1/surecoin/user/";
    process.env.REACT_APP_SURECOIN_PUBLIC_URL = "https://example.test/api/v1/surecoin/";
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const loadMakeRequest = () => {
    // eslint-disable-next-line global-require
    return require("./fetch-request").default;
  };

  it("calls sureCoinPublic URL for public endpoints", async () => {
    global.fetch.mockResolvedValue({
      status: 200,
      json: async () => ({ status: 200 }),
    });
    mockGetFromLocalStorage.mockReturnValue(null);

    const makeRequest = loadMakeRequest();
    const [status, body] = await makeRequest({
      url: "auth/login",
      method: "POST",
      data: { msisdn: "254700000001", password: "x" },
      api_version: "sureCoinPublic",
    });

    expect(status).toBe(200);
    expect(body).toEqual({ status: 200 });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.test/api/v1/surecoin/auth/login",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "content-type": "application/json",
        }),
      })
    );
    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it("calls sureCoin user URL and attaches Bearer token", async () => {
    global.fetch.mockResolvedValue({
      status: 200,
      json: async () => ({ cash: 50 }),
    });
    mockGetFromLocalStorage.mockReturnValue({ token: "abc123" });

    const makeRequest = loadMakeRequest();
    await makeRequest({
      url: "deposit",
      method: "POST",
      data: { amount: 100 },
      api_version: "sureCoin",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.test/api/v1/surecoin/user/deposit",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer abc123",
        }),
      })
    );
  });

  it("strips leading slash on public urls", async () => {
    global.fetch.mockResolvedValue({
      status: 200,
      json: async () => ({}),
    });
    mockGetFromLocalStorage.mockReturnValue(null);

    const makeRequest = loadMakeRequest();
    await makeRequest({
      url: "/config",
      method: "GET",
      api_version: "sureCoinPublic",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.test/api/v1/surecoin/config",
      expect.any(Object)
    );
  });
});
