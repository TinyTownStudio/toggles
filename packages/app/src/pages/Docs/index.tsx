import { useEffect, useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";
import { ALL_IDS } from "./nav";
import { Sidebar } from "./Sidebar";
import { Introduction } from "./sections/Introduction";
import { Authentication } from "./sections/Authentication";
import { Projects } from "./sections/Projects";
import { Toggles } from "./sections/Toggles";
import { ApiKeys } from "./sections/ApiKeys";

export function Docs() {
  const activeId = useSignal("introduction");
  const mobileNavOpen = useSignal(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const headings = ALL_IDS.map((id) => document.getElementById(id)).filter(Boolean);

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            activeId.value = entry.target.id;
            break;
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );

    for (const el of headings) {
      if (el) observerRef.current.observe(el);
    }

    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div class="pt-16">
      {/* Page header */}
      <div class="border-b border-edge bg-surface">
        <div class="max-w-6xl mx-auto px-6 py-10">
          <p class="font-mono text-xs text-content-faint tracking-widest uppercase mb-3">
            Reference
          </p>
          <h1 class="text-3xl font-semibold tracking-tight text-content mb-2">API Documentation</h1>
          <p class="text-sm text-content-tertiary max-w-[60ch] leading-relaxed">
            Everything you need to integrate Toggles into your application. Authenticate with an API
            key and query your feature flags over a simple REST API.
          </p>
          <div class="mt-4 inline-flex items-center gap-2 font-mono text-xs bg-raised border border-edge px-3 py-1.5 rounded-lg text-content-secondary">
            <span class="text-content-faint">Base URL</span>
            <span class="text-accent-text">https://toggles.tinytown.studio</span>
          </div>
        </div>
      </div>

      {/* Mobile nav toggle */}
      <div class="lg:hidden border-b border-edge px-6 py-3 sticky top-16 z-40 bg-overlay-heavy backdrop-blur-lg">
        <button
          type="button"
          class="flex items-center gap-2 text-sm text-content-secondary hover:text-content transition-colors"
          onClick={() => (mobileNavOpen.value = !mobileNavOpen.value)}
        >
          <svg
            class="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width={2}
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          On this page
        </button>
        {mobileNavOpen.value && (
          <div class="mt-3 pb-2">
            <Sidebar activeId={activeId.value} />
          </div>
        )}
      </div>

      {/* Body: sidebar + content */}
      <div class="max-w-6xl mx-auto px-6 py-10 flex gap-12">
        {/* Sticky sidebar */}
        <aside class="hidden lg:block w-52 flex-shrink-0">
          <div class="sticky top-24">
            <Sidebar activeId={activeId.value} />
          </div>
        </aside>

        {/* Main content */}
        <article class="flex-1 min-w-0 max-w-3xl">
          <Introduction />
          <Authentication />
          <Projects />
          <Toggles />
          <ApiKeys />
        </article>
      </div>
    </div>
  );
}
