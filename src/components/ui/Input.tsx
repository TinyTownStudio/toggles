import type { JSX } from "preact";

type InputProps = JSX.IntrinsicElements["input"] & { class?: string };

export function Input({ class: className, ...props }: InputProps) {
  return (
    <input
      class={`rounded-lg bg-raised border border-edge-hover px-3 py-2 text-sm text-content placeholder-content-faint focus:outline-none focus:ring-2 focus:ring-accent ${className ?? ""}`.trim()}
      {...props}
    />
  );
}

type LabelProps = JSX.IntrinsicElements["label"] & { class?: string };

export function Label({ class: className, children, ...props }: LabelProps) {
  return (
    <label class={`flex flex-col gap-1.5 ${className ?? ""}`.trim()} {...props}>
      {children}
    </label>
  );
}

export function LabelText({ children }: { children: preact.ComponentChildren }) {
  return <span class="text-sm text-content-tertiary">{children}</span>;
}
