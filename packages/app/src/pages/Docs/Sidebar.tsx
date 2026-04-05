import { NAV } from "./nav";

export function Sidebar({ activeId }: { activeId: string }) {
  return (
    <nav class="space-y-1">
      {NAV.map((section) => (
        <div key={section.id}>
          <a
            href={`#${section.id}`}
            class={`block text-sm py-1 px-3 rounded-lg transition-colors ${
              activeId === section.id
                ? "text-accent-text bg-accent-surface font-medium"
                : "text-content-tertiary hover:text-content hover:bg-surface"
            }`}
          >
            {section.label}
          </a>
          {section.children && (
            <div class="ml-3 mt-0.5 space-y-0.5">
              {section.children.map((child) => (
                <a
                  key={child.id}
                  href={`#${child.id}`}
                  class={`block text-xs py-1 px-3 rounded-lg transition-colors ${
                    activeId === child.id
                      ? "text-accent-text bg-accent-surface font-medium"
                      : "text-content-faint hover:text-content-tertiary hover:bg-surface"
                  }`}
                >
                  {child.label}
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}
