export function NotFound() {
  return (
    <div class="min-h-screen bg-page flex items-center justify-center px-4">
      <div class="text-center">
        <h1 class="text-6xl font-bold text-content mb-4">404</h1>
        <p class="text-content-tertiary text-lg mb-8">This page doesn't exist.</p>
        <a
          href="/"
          class="inline-block px-6 py-3 rounded-lg bg-cta text-cta-text font-medium text-sm shadow-btn-dark border border-black/10 hover:bg-cta-hover active:translate-y-px active:shadow-none transition-all duration-100"
        >
          Go home
        </a>
      </div>
    </div>
  );
}
