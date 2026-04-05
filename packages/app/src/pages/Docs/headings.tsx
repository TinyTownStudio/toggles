import type { ComponentChildren } from "preact";

export function SectionHeading({ id, children }: { id: string; children: ComponentChildren }) {
  return (
    <h2
      id={id}
      class="text-xl font-semibold text-content mb-6 pt-2 scroll-mt-24 border-b border-edge pb-3"
    >
      {children}
    </h2>
  );
}

export function SubHeading({ id, children }: { id: string; children: ComponentChildren }) {
  return (
    <h3 id={id} class="text-base font-semibold text-content mb-4 mt-10 scroll-mt-24">
      {children}
    </h3>
  );
}
