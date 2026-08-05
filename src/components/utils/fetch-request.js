import { getFromLocalStorage } from "./local-storage";

const SURECOIN_URL = process.env.REACT_APP_SURECOIN_URL;
const SURECOIN_PUBLIC_URL =
  process.env.REACT_APP_SURECOIN_PUBLIC_URL ||
  SURECOIN_URL?.replace(/\/user\/?$/, "/");

const resolveUrl = (url, api_version) => {
  if (api_version === "sureCoin") {
    return SURECOIN_URL + url;
  }
  if (api_version === "sureCoinPublic" || api_version === 1 || !api_version) {
    return SURECOIN_PUBLIC_URL + String(url).replace(/^\//, "");
  }
  // Legacy api_version 2/3 removed — keep SureCoin as the only backend.
  return SURECOIN_PUBLIC_URL + String(url).replace(/^\//, "");
};

const makeRequest = async ({
  url,
  method,
  data = null,
  api_version = "sureCoinPublic",
  responseType = "json",
}) => {
  const fullUrl = resolveUrl(url, api_version);
  let headers = {
    accept: "application/json",
    "content-type": "application/json",
  };

  const user = getFromLocalStorage("user");
  const token = user?.token;
  if (token) {
    headers = { ...headers, Authorization: "Bearer " + token };
  }

  try {
    const request = {
      method,
      mode: "cors",
      cache: "no-cache",
      headers,
      redirect: "follow",
    };
    if (data) {
      request.body = JSON.stringify(data);
    }
    const response = await fetch(fullUrl, request);
    let result;
    if (responseType === "text") {
      result = await response?.text();
    } else {
      result = await response?.json();
    }
    return [response?.status, result];
  } catch (err) {
    return [err.response?.status, err.response?.data];
  }
};

export default makeRequest;
