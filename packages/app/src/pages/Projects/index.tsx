import { useLocation } from "preact-iso";
import { useModel } from "@preact/signals";
import { useEffect, useState } from "preact/hooks";
import { AuthModel } from "../../models/auth";
import { ProjectsModel } from "../../models/projects";
import { OrganizationsModel } from "../../models/organizations";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { createProjectWithOrg } from "../../lib/api";

export function Projects() {
  const auth = useModel(AuthModel);
  const projectsModel = useModel(ProjectsModel);
  const orgsModel = useModel(OrganizationsModel);
  const { route } = useLocation();
  const [newName, setNewName] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    auth.checkSession().then(() => {
      if (!auth.authenticated.value) {
        route("/auth");
      } else {
        projectsModel.fetch();
        orgsModel.fetchOrgs();
      }
    });
  }, []);

  // Load teams when org selection changes
  useEffect(() => {
    if (selectedOrgId) {
      orgsModel.fetchTeams(selectedOrgId);
      setSelectedTeamId("");
    }
  }, [selectedOrgId]);

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
    setCreating(true);
    try {
      const project = await createProjectWithOrg(
        name,
        selectedOrgId || undefined,
        selectedTeamId || undefined,
      );
      projectsModel.projects.value = [project, ...projectsModel.projects.value];
      setNewName("");
      setSelectedOrgId("");
      setSelectedTeamId("");
    } catch (err) {
      projectsModel.error.value = err instanceof Error ? err.message : "Failed to create project";
    } finally {
      setCreating(false);
    }
  };

  const hasOrgs = orgsModel.orgs.value.length > 0;
  const teamsForSelectedOrg = selectedOrgId ? orgsModel.teams.value : [];

  return (
    <div class="min-h-screen bg-page pt-16">
      <div class="max-w-5xl mx-auto px-6 py-12">
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-2xl font-bold tracking-tight text-content">Projects</h1>
        </div>

        {projectsModel.error.value && (
          <p class="text-sm text-error-text mb-4">{projectsModel.error.value}</p>
        )}

        <form onSubmit={handleCreate} class="flex flex-wrap gap-2 mb-8 items-end">
          <Input
            type="text"
            value={newName}
            onInput={(e) => setNewName((e.target as HTMLInputElement).value)}
            placeholder="New project name"
            disabled={creating}
            class="flex-1 min-w-40"
          />
          {hasOrgs && (
            <select
              class="h-9 rounded-lg border border-edge bg-page text-content text-sm px-2 focus:outline-none focus:ring-2 focus:ring-accent"
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId((e.target as HTMLSelectElement).value)}
            >
              <option value="">No workspace</option>
              {orgsModel.orgs.value.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          )}
          {hasOrgs && selectedOrgId && teamsForSelectedOrg.length > 0 && (
            <select
              class="h-9 rounded-lg border border-edge bg-page text-content text-sm px-2 focus:outline-none focus:ring-2 focus:ring-accent"
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId((e.target as HTMLSelectElement).value)}
            >
              <option value="">Org-wide</option>
              {teamsForSelectedOrg.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          )}
          <Button type="submit" disabled={creating || !newName.trim()}>
            {creating ? "Creating…" : "Create"}
          </Button>
        </form>

        {projectsModel.projects.value.length === 0 ? (
          <p class="text-content-tertiary text-sm">No projects yet.</p>
        ) : (
          <ul class="space-y-2">
            {projectsModel.projects.value.map((project: any) => (
              <li
                key={project.id}
                class="flex hover:cursor-pointer items-center justify-between px-4 py-3 rounded-lg border border-edge bg-page hover:border-edge-hover transition-colors"
                onClick={() => route(`/app/projects/${project.id}`)}
                onKeyDown={(e) => e.key === "Enter" && route(`/app/projects/${project.id}`)}
              >
                <div class="text-content text-sm font-medium">
                  <p class="m-0 p-0">{project.name}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    projectsModel.remove(project.id);
                  }}
                  class="text-xs text-content-faint hover:text-error-text transition-colors"
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
