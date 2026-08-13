function normalizedOrigin(value: string | undefined, fallback: string): string {
  const rawValue = value?.trim() || fallback;
  try {
    return new URL(rawValue).origin;
  } catch {
    return fallback;
  }
}

function currentBrowserOrigin(): string {
  return typeof window === "undefined"
    ? "http://localhost:5173"
    : window.location.origin;
}

const browserOrigin = currentBrowserOrigin();

export const runtimeConfig = Object.freeze({
  backendOrigin: normalizedOrigin(
    typeof import.meta.env.VITE_BACKEND_ORIGIN === "string"
      ? import.meta.env.VITE_BACKEND_ORIGIN
      : undefined,
    browserOrigin,
  ),
  publicAppUrl: normalizedOrigin(
    typeof import.meta.env.VITE_PUBLIC_APP_URL === "string"
      ? import.meta.env.VITE_PUBLIC_APP_URL
      : undefined,
    browserOrigin,
  ),
});
