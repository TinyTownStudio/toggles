import type { JSX } from "preact";

type ButtonVariant = "primary" | "secondary" | "ghost" | "icon" | "danger-icon";

type ButtonProps = JSX.IntrinsicElements["button"] & {
  variant?: ButtonVariant;
  size?: "sm" | "md";
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
  secondary:
    "bg-raised text-content-secondary hover:bg-raised-hover hover:text-content rounded-lg transition-colors disabled:opacity-50",
  ghost: "text-content-secondary hover:text-content transition-colors disabled:opacity-50",
  icon: "p-1.5 rounded-md text-content-tertiary hover:text-content hover:bg-raised-hover transition-all cursor-pointer",
  "danger-icon":
    "p-1.5 text-content-tertiary hover:text-delete-hover transition-colors cursor-pointer",
};

const sizeClasses: Record<string, string> = {
  sm: "px-3 py-2 text-xs sm:text-sm",
  md: "px-4 py-2 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  class: className,
  children,
  ...props
}: ButtonProps) {
  const isIconVariant = variant === "icon" || variant === "danger-icon";
  const sizeClass = isIconVariant ? "" : sizeClasses[size];

  return (
    <button class={`${variantClasses[variant]} ${sizeClass} ${className ?? ""}`.trim()} {...props}>
      {children}
    </button>
  );
}
