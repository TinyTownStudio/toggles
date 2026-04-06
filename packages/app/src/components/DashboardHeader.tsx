import { useModel } from "@preact/signals";
import { useLocation } from "preact-iso";
import { AuthModel } from "../models/auth";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "./ui/Button";

export function DashboardHeader() {
  const auth = useModel(AuthModel);
  const { url } = useLocation();

  async function handleSignOut() {
    await auth.signOut();
    window.location.href = "/";
  }

  const navLinks = [
    { label: "Dashboard", href: "/app/dashboard" },
    { label: "Projects", href: "/app/projects" },
    { label: "Billing", href: "/app/billing" },
    { label: "API Keys", href: "/app/api-keys" },
  ];

  return (
    <header class="fixed top-0 left-0 right-0 z-50 bg-page border-b border-edge">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <a
          href="/app/dashboard"
          class="hover:cursor-pointer text-lg sm:text-xl font-bold text-content tracking-tighter"
        >
          Toggles
        </a>
        <div class="flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = url === link.href || url.startsWith(link.href + "/");
            return (
              <a
                key={link.href}
                href={link.href}
                class={`text-sm px-3 py-1.5 rounded-lg transition-colors duration-100 ${
                  isActive
                    ? "text-accent-text font-medium border-b-2 border-accent rounded-b-none"
                    : "text-content-tertiary hover:text-content hover:bg-raised"
                }`}
              >
                {link.label}
              </a>
            );
          })}
          <div class="ml-2 flex items-center gap-2">
            <ThemeToggle />
            <Button variant="secondary" size="sm" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
