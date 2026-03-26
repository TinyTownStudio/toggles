import { signal, computed, createModel } from "@preact/signals";

type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "theme";

export const ThemeModel = createModel(() => {
	const stored =
		typeof window !== "undefined"
			? (localStorage.getItem(STORAGE_KEY) as ThemePreference | null)
			: null;

	const preference = signal<ThemePreference>(stored ?? "system");

	const resolved = computed<"light" | "dark">(() => {
		if (preference.value !== "system") return preference.value;
		if (typeof window === "undefined") return "dark";
		return window.matchMedia("(prefers-color-scheme: dark)").matches
			? "dark"
			: "light";
	});

	const isDark = computed(() => resolved.value === "dark");

	function apply() {
		if (typeof document === "undefined") return;
		document.documentElement.classList.toggle(
			"dark",
			resolved.value === "dark",
		);
	}

	function setPreference(pref: ThemePreference) {
		preference.value = pref;
		if (typeof window !== "undefined") {
			if (pref === "system") {
				localStorage.removeItem(STORAGE_KEY);
			} else {
				localStorage.setItem(STORAGE_KEY, pref);
			}
		}
		apply();
	}

	function toggle() {
		const order: ThemePreference[] = ["system", "light", "dark"];
		const idx = order.indexOf(preference.value);
		setPreference(order[(idx + 1) % order.length]);
	}

	function init() {
		apply();
		if (typeof window === "undefined") return;
		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		const handler = () => {
			if (preference.value === "system") apply();
		};
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}

	return { preference, resolved, isDark, setPreference, toggle, init };
});
