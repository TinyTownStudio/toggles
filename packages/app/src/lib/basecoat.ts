declare global {
  interface Window {
    basecoat?: {
      initAll: (options?: { force?: boolean }) => void;
      start: () => void;
      refresh: (element: Element) => void;
    };
  }
}

let loadPromise: Promise<void> | null = null;

export function loadBasecoat(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!loadPromise) {
    loadPromise = (async () => {
      await import("basecoat-css/basecoat");
      await import("basecoat-css/select");
      window.basecoat?.initAll();
      window.basecoat?.start();
    })();
  }
  return loadPromise;
}
