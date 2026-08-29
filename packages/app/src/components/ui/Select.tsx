import { useEffect, useId, useRef } from "preact/hooks";

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
}

interface SelectChangeEvent extends Event {
  detail: {
    value: string;
    selected: { value: string; label: string } | null;
  };
}

interface SelectElement extends HTMLDivElement {
  refresh?: () => void;
  togglePopover?: () => void;
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

function hasRichContent(option: SelectOption) {
  return Boolean(option.sublabel || option.badge);
}

function SelectOptionContent({ option }: { option: SelectOption }) {
  return (
    <div class="select-rich-content min-w-0 text-left">
      <div class="flex items-center gap-2 min-w-0">
        <span class="truncate text-sm font-medium text-content">{option.label}</span>
        {option.badge && (
          <span class="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-accent-surface text-accent-text">
            {option.badge}
          </span>
        )}
      </div>
      {option.sublabel && (
        <span class="block truncate text-[11px] font-mono text-content-faint mt-0.5">
          {option.sublabel}
        </span>
      )}
    </div>
  );
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
  const hasRichOptions = options.some(hasRichContent);

  const handleChange = (event: Event) => {
    onChange((event as SelectChangeEvent).detail.value);
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (root.refresh) {
      root.refresh();
    } else {
      window.basecoat?.refresh(root);
    }
  }, [value, options, placeholder]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || disabled) return;

    let detach: (() => void) | undefined;

    const attachTriggerClick = () => {
      detach?.();
      const button = root.querySelector<HTMLButtonElement>(":scope > button");
      if (!button || typeof root.togglePopover !== "function") return;

      const onTriggerClick = (event: Event) => {
        event.stopImmediatePropagation();
        root.togglePopover!();
      };

      button.addEventListener("click", onTriggerClick, true);
      detach = () => button.removeEventListener("click", onTriggerClick, true);
    };

    if (root.dataset.selectInitialized) {
      attachTriggerClick();
    } else {
      root.addEventListener("basecoat:initialized", attachTriggerClick, { once: true });
    }

    return () => {
      detach?.();
      root.removeEventListener("basecoat:initialized", attachTriggerClick);
    };
  }, [disabled, uid]);

  return (
    <div
      ref={rootRef}
      id={uid}
      class={`select ${className ?? ""}`.trim()}
      onChange={handleChange}
      {...(placeholder ? { "data-placeholder": placeholder } : {})}
      {...(hasRichOptions ? { "data-rich-options": "" } : {})}
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
        <div role="listbox" id={listboxId} aria-orientation="vertical" aria-labelledby={triggerId}>
          {options.map((option) => {
            const rich = hasRichContent(option);
            return (
              <div
                key={option.value || "__empty__"}
                role="option"
                data-value={option.value}
                {...(!rich ? { "data-label": option.label } : {})}
                class={rich ? "select-rich-option flex items-center gap-2" : undefined}
              >
                {rich ? (
                  <>
                    <SelectOptionContent option={option} />
                  </>
                ) : (
                  option.label
                )}
              </div>
            );
          })}
        </div>
      </div>
      <input type="hidden" name={name ?? `${uid}-value`} value={value} />
    </div>
  );
}
