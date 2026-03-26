import { useModel } from "@preact/signals";
import { AuthModel } from "../models/auth";
import { ThemeToggle } from "./ThemeToggle";

export function DashboardHeader() {
	const auth = useModel(AuthModel);

	async function handleSignOut() {
		await auth.signOut();
		window.location.href = "/";
	}

	return (
		<header class="fixed top-0 left-0 right-0 z-50 bg-page border-b border-edge">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
				<div class="text-lg sm:text-xl font-semibold text-content tracking-tight">Toggles</div>
				<div class="flex items-center gap-6">
					<a
						href="/dashboard"
						class="text-sm text-content-tertiary hover:text-content transition-colors"
					>
						Dashboard
					</a>
					<a
						href="/projects"
						class="text-sm text-content-tertiary hover:text-content transition-colors"
					>
						Projects
					</a>
					<a
						href="/billing"
						class="text-sm text-content-tertiary hover:text-content transition-colors"
					>
						Billing
					</a>
					<ThemeToggle />
					<button
						type="button"
						onClick={handleSignOut}
						class="text-xs sm:text-sm px-3 sm:px-4 py-1.5 rounded-md bg-raised border border-edge text-content-secondary shadow-btn hover:bg-raised-hover hover:text-content hover:border-edge-hover active:translate-y-px active:shadow-none transition-all duration-100 whitespace-nowrap"
					>
						Sign out
					</button>
				</div>
			</div>
		</header>
	);
}
