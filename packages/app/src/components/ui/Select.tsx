import { useEffect, useId, useRef } from "preact/hooks";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectChangeEvent extends Event {
  detail: {
    value: string;
    selected: { value: string; label: string } | null;
  };
}

interface SelectElement extends HTMLDivElement {
  refresh?: () => void;
}

interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  class?: string;
  name?: string;
}

export function Select({
  value,
  options,
  onChange,
  placeholder,
  disabled = false,
  class: className,
  name,
}: SelectProps) {
  const uid = useId().replace(/:/g, "");
  const rootRef = useRef<SelectElement>(null);
  const triggerId = `${uid}-trigger`;
  const listboxId = `${uid}-listbox`;
  const popoverId = `${uid}-popover`;

  const handleChange = (event: Event) => {
    onChange((event as SelectChangeEvent).detail.value);
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.refresh?.() ?? window.basecoat?.refresh(root);
  }, [value, options, placeholder]);

  return (
    <div
      ref={rootRef}
      id={uid}
      class={`select ${className ?? ""}`.trim()}
      onChange={handleChange}
      {...(placeholder ? { "data-placeholder": placeholder } : {})}
    >
      <button
        type="button"
        class="w-full"
        id={triggerId}
        aria-haspopup="listbox"
        aria-expanded="false"
        aria-controls={listboxId}
        disabled={disabled}
      >
        <span class="truncate" />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="text-muted-foreground opacity-50 shrink-0"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div id={popoverId} data-popover aria-hidden="true">
        <div
          role="listbox"
          id={listboxId}
          aria-orientation="vertical"
          aria-labelledby={triggerId}
        >
          {options.map((option) => (
            <div key={option.value || "__empty__"} role="option" data-value={option.value} data-label={option.label}>
              {option.label}
            </div>
          ))}
        </div>
      </div>
      <input type="hidden" name={name ?? `${uid}-value`} value={value} />
    </div>
  );
}
