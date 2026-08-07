const normalizeSurecoinMsisdn = (value = "") => {
  const digitsOnly = String(value ?? "").replace(/\D/g, "");

  if (/^254[17]\d{8}$/.test(digitsOnly)) {
    return digitsOnly;
  }
  if (/^0[17]\d{8}$/.test(digitsOnly)) {
    return `254${digitsOnly.slice(1)}`;
  }
  if (/^[17]\d{8}$/.test(digitsOnly)) {
    return `254${digitsOnly}`;
  }

  return String(value ?? "").trim();
};

export const isValidSurecoinMsisdn = (value = "") =>
  /^254[17]\d{8}$/.test(normalizeSurecoinMsisdn(value));

export const buildSurecoinCredentialsPayload = ({ msisdn, password }) => ({
  msisdn: normalizeSurecoinMsisdn(msisdn),
  password: String(password ?? ""),
});

export const buildSurecoinSignupPayload = ({
  msisdn,
  password,
  displayName,
}) => {
  const payload = buildSurecoinCredentialsPayload({ msisdn, password });
  const normalizedDisplayName = String(displayName ?? "").trim();

  if (normalizedDisplayName) {
    // API uses SNAKE_CASE JSON (display_name)
    payload.display_name = normalizedDisplayName;
  }

  return payload;
};

export { normalizeSurecoinMsisdn };
