import type { JSX } from "preact";

type ButtonVariant = "primary" | "secondary" | "ghost" | "icon" | "danger-icon";

type ButtonProps = JSX.IntrinsicElements["button"] & {
  variant?: ButtonVariant;
  size?: "sm" | "md";
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-cta text-cta-text font-medium rounded-lg shadow-btn-dark border border-black/10 hover:bg-cta-hover active:translate-y-px active:shadow-none transition-all duration-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:active:translate-y-0",
  secondary:
    "bg-raised text-content-secondary font-medium rounded-lg border-2 border-edge shadow-btn hover:bg-raised-hover hover:text-content hover:border-edge-hover active:translate-y-px active:shadow-none transition-all duration-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:active:translate-y-0",
  ghost:
    "text-content-secondary font-medium rounded-lg hover:text-content hover:bg-raised transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed",
  icon: "p-1.5 rounded-lg text-content-tertiary hover:text-content hover:bg-raised transition-all duration-100 cursor-pointer",
  "danger-icon":
    "p-1.5 rounded-lg text-content-tertiary hover:text-error-text hover:bg-error-surface transition-all duration-100 cursor-pointer",
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
