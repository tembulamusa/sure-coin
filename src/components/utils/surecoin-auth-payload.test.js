import {
  normalizeSurecoinMsisdn,
  isValidSurecoinMsisdn,
  buildSurecoinCredentialsPayload,
  buildSurecoinSignupPayload,
} from "./surecoin-auth-payload";

describe("surecoin-auth-payload", () => {
  describe("normalizeSurecoinMsisdn", () => {
    it("normalizes 07x to 2547…", () => {
      expect(normalizeSurecoinMsisdn("0705182016")).toBe("254705182016");
    });

    it("normalizes 01x to 2541…", () => {
      expect(normalizeSurecoinMsisdn("0112345678")).toBe("254112345678");
    });

    it("accepts already-normalized 254 numbers", () => {
      expect(normalizeSurecoinMsisdn("254705182016")).toBe("254705182016");
    });

    it("accepts 9-digit local without leading zero", () => {
      expect(normalizeSurecoinMsisdn("705182016")).toBe("254705182016");
    });

    it("strips non-digits", () => {
      expect(normalizeSurecoinMsisdn("+254 705 182 016")).toBe("254705182016");
    });
  });

  describe("isValidSurecoinMsisdn", () => {
    it("accepts valid formats", () => {
      expect(isValidSurecoinMsisdn("0705182016")).toBe(true);
      expect(isValidSurecoinMsisdn("0112345678")).toBe(true);
      expect(isValidSurecoinMsisdn("254705182016")).toBe(true);
    });

    it("rejects invalid numbers", () => {
      expect(isValidSurecoinMsisdn("123")).toBe(false);
      expect(isValidSurecoinMsisdn("")).toBe(false);
      expect(isValidSurecoinMsisdn("072")).toBe(false);
    });
  });

  describe("buildSurecoinCredentialsPayload", () => {
    it("returns normalized msisdn and password string", () => {
      expect(
        buildSurecoinCredentialsPayload({
          msisdn: "0705182016",
          password: "secret",
        })
      ).toEqual({
        msisdn: "254705182016",
        password: "secret",
      });
    });
  });

  describe("buildSurecoinSignupPayload", () => {
    it("includes display_name when provided", () => {
      expect(
        buildSurecoinSignupPayload({
          msisdn: "0705182016",
          password: "secret",
          displayName: "  Musa  ",
        })
      ).toEqual({
        msisdn: "254705182016",
        password: "secret",
        display_name: "Musa",
      });
    });

    it("omits display_name when empty", () => {
      expect(
        buildSurecoinSignupPayload({
          msisdn: "0705182016",
          password: "secret",
          displayName: "   ",
        })
      ).toEqual({
        msisdn: "254705182016",
        password: "secret",
      });
    });
  });
});
