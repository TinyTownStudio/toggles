import type { JSX } from "preact";
import { useEffect } from "preact/hooks";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: JSX.Element | JSX.Element[];
}

export function Modal({ title, onClose, children }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        aria-label="Close modal"
        class="absolute inset-0 bg-black/50 cursor-default"
        onClick={onClose}
      />
      <div class="relative bg-page border border-edge rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-base font-semibold text-content">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            class="p-1.5 rounded-lg text-content-tertiary hover:text-content hover:bg-raised transition-all duration-100"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
