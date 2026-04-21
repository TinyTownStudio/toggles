import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { useModel } from "@preact/signals";
import { AuthModel } from "../models/auth";
import { ThemeToggle } from "./ThemeToggle";
import { useLocation } from "preact-iso";

export function Header() {
  const scrolled = useSignal(false);
  const mobileOpen = useSignal(false);
  const auth = useModel(AuthModel);
  const location = useLocation();

  useEffect(() => {
    function onScroll() {
      scrolled.value = window.scrollY > 10;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    auth.checkSession();

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const currentRoute = location.path;
  const links = [
    {
      label: "Features",
      href:
        !currentRoute.startsWith("/auth") && !currentRoute.startsWith("/docs")
          ? "#features"
          : "/#features",
    },
    {
      label: "Pricing",
      href:
        !currentRoute.startsWith("/auth") && !currentRoute.startsWith("/docs")
          ? "#pricing"
          : "/#pricing",
    },
    { label: "Docs", href: "/docs" },
  ];

  return (
    <header
      class={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled.value ? "bg-overlay backdrop-blur-lg border-b border-edge" : "bg-transparent"
      }`}
    >
      <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="/" class="text-xl font-bold text-content tracking-tighter">
          Toggles
        </a>

        {/* Desktop nav */}
        <nav class="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              class="text-sm text-content-tertiary hover:text-content transition-colors"
            >
              {l.label}
            </a>
          ))}
          <a
            href="https://github.com/tinytownStudio/toggles"
            target="_blank"
            rel="noopener noreferrer"
            class="text-content-tertiary hover:text-content transition-colors"
            aria-label="GitHub repository"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <title>GitHub</title>
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </a>
          <ThemeToggle />
          <a
            href={auth.authenticated.value ? "/app/dashboard" : "/auth"}
            class="text-sm font-medium px-4 py-1.5 rounded-lg bg-cta text-cta-text shadow-btn-dark border border-black/10 hover:bg-cta-hover active:translate-y-px active:shadow-none transition-all duration-100"
          >
            {auth.authenticated.value ? "Dashboard" : "Sign in"}
          </a>
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          class="md:hidden text-content-tertiary hover:text-content"
          onClick={() => (mobileOpen.value = !mobileOpen.value)}
          aria-label="Toggle menu"
        >
          <svg
            class="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width={2}
          >
            <title>{mobileOpen.value ? "Close menu" : "Open menu"}</title>
            {mobileOpen.value ? (
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen.value && (
        <nav class="md:hidden bg-overlay-heavy backdrop-blur-lg border-b border-edge px-6 pb-4 flex flex-col gap-3">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              class="text-sm text-content-tertiary hover:text-content transition-colors py-1"
              onClick={() => (mobileOpen.value = false)}
            >
              {l.label}
            </a>
          ))}
          <div class="py-1 flex items-center gap-4">
            <a
              href="https://github.com/tinytownStudio/toggles"
              target="_blank"
              rel="noopener noreferrer"
              class="text-content-tertiary hover:text-content transition-colors"
              aria-label="GitHub repository"
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <title>GitHub</title>
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            </a>
            <ThemeToggle />
          </div>
          <a
            href={auth.authenticated.value ? "/app/dashboard" : "/auth"}
            class="text-sm font-medium px-4 py-1.5 rounded-lg bg-cta text-cta-text shadow-btn-dark border border-black/10 hover:bg-cta-hover transition-all duration-100 text-center"
            onClick={() => (mobileOpen.value = false)}
          >
            {auth.authenticated.value ? "Dashboard" : "Sign in"}
          </a>
        </nav>
      )}
    </header>
  );
}
