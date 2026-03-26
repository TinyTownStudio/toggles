import { useLocation } from "preact-iso";
import { useModel } from "@preact/signals";
import { useEffect, useState } from "preact/hooks";
import { AuthModel } from "../../models/auth";
import { ProjectsModel } from "../../models/projects";

export function Projects() {
	const auth = useModel(AuthModel);
	const projectsModel = useModel(ProjectsModel);
	const { route } = useLocation();
	const [newName, setNewName] = useState("");

	useEffect(() => {
		auth.checkSession().then(() => {
			if (!auth.authenticated.value) {
				route("/auth");
			} else {
				projectsModel.fetch();
			}
		});
	}, []);

	if (auth.loading.value || projectsModel.loading.value) {
		return (
			<div class="min-h-screen bg-page pt-16 flex items-center justify-center">
				<p class="text-content-tertiary text-sm">Loading...</p>
			</div>
		);
	}

	const handleCreate = async (e: Event) => {
		e.preventDefault();
		const name = newName.trim();
		if (!name) return;
		await projectsModel.create(name);
		setNewName("");
	};

	return (
		<div class="min-h-screen bg-page pt-16">
			<div class="max-w-4xl mx-auto px-6 py-12">
				<div class="flex items-center justify-between mb-6">
					<h1 class="text-2xl font-bold text-content">Projects</h1>
				</div>

				{projectsModel.error.value && (
					<p class="text-sm text-red-500 mb-4">{projectsModel.error.value}</p>
				)}

				<form onSubmit={handleCreate} class="flex gap-2 mb-8">
					<input
						type="text"
						value={newName}
						onInput={(e) => setNewName((e.target as HTMLInputElement).value)}
						placeholder="New project name"
						disabled={projectsModel.creating.value}
						class="flex-1 px-3 py-2 rounded-md border border-border bg-surface text-content text-sm placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
					/>
					<button
						type="submit"
						disabled={projectsModel.creating.value || !newName.trim()}
						class="px-4 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{projectsModel.creating.value ? "Creating…" : "Create"}
					</button>
				</form>

				{projectsModel.projects.value.length === 0 ? (
					<p class="text-content-tertiary text-sm">No projects yet.</p>
				) : (
					<ul class="space-y-3">
						{projectsModel.projects.value.map((project) => (
							<li
								key={project.id}
								class="flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-surface"
							>
								<span class="text-content text-sm font-medium">{project.name}</span>
								<button
									type="button"
									onClick={() => projectsModel.remove(project.id)}
									class="text-xs text-content-tertiary hover:text-red-500 transition-colors"
								>
									Delete
								</button>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}
