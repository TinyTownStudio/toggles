interface AlertProps {
  children: preact.ComponentChildren;
  variant?: "error" | "inline-error" | "success";
  class?: string;
}

const variantClasses: Record<string, string> = {
  error: "p-3 bg-error-surface border border-error-edge rounded-xl text-error-text text-sm",
  success: "p-3 bg-success-surface border border-success-edge rounded-xl text-success-text text-sm",
};

export function Alert({ children, variant = "error", class: className }: AlertProps) {
  if (variant === "inline-error") {
    return <p class={`text-sm text-error-text ${className ?? ""}`.trim()}>{children}</p>;
  }

  return <div class={`${variantClasses[variant]} ${className ?? ""}`.trim()}>{children}</div>;
}
