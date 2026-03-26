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
				<div class="text-lg sm:text-xl font-bold text-content">Toggles</div>
				<div class="flex items-center gap-4">
					<a
						href="/dashboard"
						class="text-sm sm:text-base text-content-secondary hover:text-content transition-colors"
					>
						Dashboard
					</a>
					<a
						href="/projects"
						class="text-sm sm:text-base text-content-secondary hover:text-content transition-colors"
					>
						Projects
					</a>
					<a
						href="/billing"
						class="text-sm sm:text-base text-content-secondary hover:text-content transition-colors"
					>
						Billing
					</a>
					<ThemeToggle />
					<button
						type="button"
						onClick={handleSignOut}
						class="text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-lg bg-raised text-content-secondary hover:bg-raised-hover hover:text-content transition-colors whitespace-nowrap"
					>
						Sign out
					</button>
				</div>
			</div>
		</header>
	);
}
