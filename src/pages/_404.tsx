export function NotFound() {
  return (
    <div class="min-h-screen bg-page flex items-center justify-center px-4">
      <div class="text-center">
        <h1 class="text-6xl font-bold text-content mb-4">404</h1>
        <p class="text-content-tertiary text-lg mb-8">This page doesn't exist.</p>
        <a
          href="/"
          class="inline-block px-6 py-3 rounded-lg bg-accent hover:bg-accent-hover text-white font-medium transition-colors"
        >
          Go home
        </a>
      </div>
    </div>
  );
}
