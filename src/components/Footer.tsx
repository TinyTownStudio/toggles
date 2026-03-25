export function Footer() {
  return (
    <footer class="bg-page border-t border-edge py-12 px-6">
      <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div class="text-xl font-bold text-content tracking-tight">Toggles</div>
        <nav class="flex gap-6 text-sm text-content-tertiary">
          <a href="#features" class="hover:text-content transition-colors">
            Features
          </a>
          <a href="#how-it-works" class="hover:text-content transition-colors">
            How it Works
          </a>
          <a href="#pricing" class="hover:text-content transition-colors">
            Pricing
          </a>
        </nav>
        <p class="text-sm text-content-faint">
          &copy; {new Date().getFullYear()} Toggles. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
