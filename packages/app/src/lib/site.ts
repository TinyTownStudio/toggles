/** Vite dev server origin for SSR/prerender when no env override is set. */
export const LOCAL_DEV_ORIGIN = "http://localhost:5173";

/**
 * Origin used in the UI and in-app docs examples. In the browser this is always
 * `window.location.origin` so self-hosted installs never depend on a vendor domain.
 */
export function getPublicAppOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  const configured = import.meta.env.VITE_PUBLIC_APP_ORIGIN?.replace(/\/$/, "");
  if (configured) {
    return configured;
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "");
  if (apiBase) {
    return apiBase;
  }
  return LOCAL_DEV_ORIGIN;
}

export const API_BASE_URL = getPublicAppOrigin();
export const API_V1_BASE_URL = `${API_BASE_URL}/api/v1`;
