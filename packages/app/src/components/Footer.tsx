export function Footer() {
  return (
    <footer class="bg-page border-t border-edge py-8 px-6">
      <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-end gap-6">
        <p class="text-sm text-content-faint">
          &copy; {new Date().getFullYear()}{" "}
          <a href="http://TinyTown.Studio" class="text-accent">
            TinyTown.Studio
          </a>
          . All rights reserved.
        </p>
      </div>
    </footer>
  );
}
