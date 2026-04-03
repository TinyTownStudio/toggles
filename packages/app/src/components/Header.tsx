import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { useModel } from "@preact/signals";
import { AuthModel } from "../models/auth";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  const scrolled = useSignal(false);
  const mobileOpen = useSignal(false);
  const auth = useModel(AuthModel);

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

  const links = [
    { label: "Features", href: "/#features" },
    { label: "How it Works", href: "/#how-it-works" },
    { label: "Pricing", href: "/#pricing" },
  ];

  return (
    <header
      class={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled.value ? "bg-overlay backdrop-blur-lg border-b border-edge" : "bg-transparent"
      }`}
    >
      <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="/" class="text-xl font-semibold text-content tracking-tight">
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
          <ThemeToggle />
          <a
            href={auth.authenticated.value ? "/app/dashboard" : "/auth"}
            class="text-sm font-medium px-4 py-1.5 rounded-md bg-cta text-cta-text shadow-btn-dark border border-black/10 hover:bg-cta-hover active:translate-y-px active:shadow-none transition-all duration-100"
          >
            {auth.authenticated.value ? "Dashboard" : "Sign in"}
          </a>
        </nav>

        {/* Mobile hamburger */}
        <button
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
          <div class="py-1">
            <ThemeToggle />
          </div>
          <a
            href={auth.authenticated.value ? "/dashboard" : "/auth"}
            class="text-sm font-medium px-4 py-1.5 rounded-md bg-cta text-cta-text shadow-btn-dark border border-black/10 hover:bg-cta-hover transition-all duration-100 text-center"
            onClick={() => (mobileOpen.value = false)}
          >
            {auth.authenticated.value ? "Dashboard" : "Sign in"}
          </a>
        </nav>
      )}
    </header>
  );
}
