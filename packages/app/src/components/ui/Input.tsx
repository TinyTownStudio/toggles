import type { JSX } from "preact";

type InputProps = JSX.IntrinsicElements["input"] & { class?: string };

const WIDTH_OVERRIDE = /\b(w-|min-w-|max-w-|flex-\d|flex-auto|flex-none|grow|shrink)\b/;

export function Input({ class: className, ...props }: InputProps) {
  const widthClass = className && WIDTH_OVERRIDE.test(className) ? "" : "w-full";
  return (
    <input
      class={`rounded-lg bg-page border border-edge px-3 py-2 text-sm text-content placeholder:text-content-faint shadow-xs ${widthClass} focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-colors duration-100 disabled:opacity-50 disabled:cursor-not-allowed ${className ?? ""}`.trim()}
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
  return (
    <span class="text-xs font-medium text-content-tertiary uppercase tracking-wide">
      {children}
    </span>
  );
}
