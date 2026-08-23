import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  headers: { "Content-Type": "application/json" },
});

const TOKEN_KEY = "digiloq_token";

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
  api.defaults.headers.common.Authorization = token ? `Bearer ${token}` : "";
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

// initialize header on load
const _initial = getToken();
if (_initial) api.defaults.headers.common.Authorization = `Bearer ${_initial}`;

export function formatApiError(err, fallback = "Bir hata oluştu") {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => e?.msg || JSON.stringify(e)).join(" ");
  return fallback;
}
