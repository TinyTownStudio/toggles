import { useLocation } from "preact-iso";
import { useModel } from "@preact/signals";
import { useEffect, useState } from "preact/hooks";
import { AuthModel } from "../../models/auth";
import { ProjectsModel } from "../../models/projects";
import { TogglesModel } from "../../models/toggles";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";

export function ProjectDetail({ id }: { id: string }) {
	const auth = useModel(AuthModel);
	const projectsModel = useModel(ProjectsModel);
	const togglesModel = useModel(TogglesModel);
	const { route } = useLocation();
	const [newKey, setNewKey] = useState("");

	useEffect(() => {
		auth.checkSession().then(async () => {
			if (!auth.authenticated.value) {
				route("/auth");
				return;
			}
			await Promise.all([
				projectsModel.projects.value.length === 0 ? projectsModel.fetch() : Promise.resolve(),
				togglesModel.fetch(id),
			]);
		});
	}, [id]);

	if (auth.loading.value || togglesModel.loading.value) {
		return (
			<div class="min-h-screen bg-page pt-16 flex items-center justify-center">
				<p class="text-content-tertiary text-sm">Loading...</p>
			</div>
		);
	}

	const project = projectsModel.projects.value.find((p) => p.id === id);

	const handleCreate = async (e: Event) => {
		e.preventDefault();
		const key = newKey.trim();
		if (!key) return;
		await togglesModel.create(id, key);
		setNewKey("");
	};

	return (
		<div class="min-h-screen bg-page pt-16">
			<div class="max-w-4xl mx-auto px-6 py-12">
				<div class="mb-6">
					<a
						href="/projects"
						class="text-xs text-content-tertiary hover:text-content transition-colors mb-2 inline-block"
					>
						← Projects
					</a>
					<h1 class="text-2xl font-semibold tracking-tight text-content">
						{project?.name ?? "Project"}
					</h1>
				</div>

				{togglesModel.error.value && (
					<p class="text-sm text-error-text mb-4">{togglesModel.error.value}</p>
				)}

				<form onSubmit={handleCreate} class="flex gap-2 mb-8">
					<Input
						type="text"
						value={newKey}
						onInput={(e) => setNewKey((e.target as HTMLInputElement).value)}
						placeholder="Flag key (e.g. dark-mode)"
						disabled={togglesModel.creating.value}
						class="flex-1"
					/>
					<Button
						type="submit"
						disabled={togglesModel.creating.value || !newKey.trim()}
					>
						{togglesModel.creating.value ? "Adding…" : "Add flag"}
					</Button>
				</form>

				{togglesModel.toggles.value.length === 0 ? (
					<p class="text-content-tertiary text-sm">No flags yet.</p>
				) : (
					<ul class="space-y-2">
						{togglesModel.toggles.value.map((t) => (
							<li
								key={t.id}
								class="flex items-center justify-between px-4 py-3 rounded-md border border-edge bg-page hover:border-edge-hover transition-colors"
							>
								<span class="text-content text-sm font-mono">{t.key}</span>
								<div class="flex items-center gap-3">
									<button
										type="button"
										role="switch"
										aria-checked={t.enabled}
										onClick={() => togglesModel.toggle(id, t.id, !t.enabled)}
										class={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20 ${
											t.enabled ? "bg-accent" : "bg-raised-hover"
										}`}
									>
										<span
											class={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
												t.enabled ? "translate-x-5" : "translate-x-1"
											}`}
										/>
									</button>
									<button
										type="button"
										onClick={() => togglesModel.remove(id, t.id)}
										class="text-xs text-content-faint hover:text-error-text transition-colors"
									>
										Delete
									</button>
								</div>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}
