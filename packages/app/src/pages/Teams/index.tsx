import { useEffect, useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { useModel } from "@preact/signals";
import { AuthModel } from "../../models/auth";
import { BillingModel } from "../../models/billing";
import { OrganizationsModel } from "../../models/organizations";
import { Button } from "../../components/ui/Button";
import { Input, Label, LabelText } from "../../components/ui/Input";
import { Alert } from "../../components/ui/Alert";
import type { WorkspaceTeam } from "../../lib/api";

type Tab = "members" | "teams";

export function Teams() {
  const { route } = useLocation();
  const auth = useModel(AuthModel);
  const billing = useModel(BillingModel);
  const orgsModel = useModel(OrganizationsModel);

  const [tab, setTab] = useState<Tab>("members");
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"owner" | "member">("member");
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);

  useEffect(() => {
    auth.checkSession().then(() => {
      if (!auth.authenticated.value) {
        route("/auth");
        return;
      }
      billing.fetch().then(() => {
        orgsModel.fetchOrgs();
      });
    });
  }, []);

  // Load members + teams when currentOrg changes
  useEffect(() => {
    const org = orgsModel.currentOrg.value;
    if (org) {
      orgsModel.fetchMembers(org.id);
      orgsModel.fetchTeams(org.id);
    }
  }, [orgsModel.currentOrg.value?.id]);

  if (auth.loading.value || billing.loading.value) {
    return (
      <div class="min-h-screen bg-page pt-16 flex items-center justify-center">
        <p class="text-content-tertiary text-sm">Loading...</p>
      </div>
    );
  }

  // Pro gate
  if (!billing.isPro.value && !billing.isProductBeta.value) {
    return (
      <div class="min-h-screen bg-page pt-16">
        <div class="max-w-5xl mx-auto px-6 py-12">
          <h1 class="text-2xl font-bold tracking-tight text-content mb-4">Workspace</h1>
          <div class="bg-surface border border-edge rounded-2xl p-8 text-center">
            <p class="text-content-secondary mb-2 font-medium">Pro plan required</p>
            <p class="text-sm text-content-tertiary mb-6">
              Upgrade to Pro to create a workspace and invite collaborators.
            </p>
            <Button onClick={() => route("/app/billing")}>Upgrade to Pro</Button>
          </div>
        </div>
      </div>
    );
  }

  // No org yet — onboarding
  if (orgsModel.orgs.value.length === 0 && !orgsModel.loading.value) {
    const handleCreate = async (e: Event) => {
      e.preventDefault();
      const name = orgName.trim();
      const slug = orgSlug.trim();
      if (!name || !slug) return;
      await orgsModel.createOrg(name, slug);
      setOrgName("");
      setOrgSlug("");
    };

    return (
      <div class="min-h-screen bg-page pt-16">
        <div class="max-w-5xl mx-auto px-6 py-12">
          <h1 class="text-2xl font-bold tracking-tight text-content mb-4">Workspace</h1>
          <div class="bg-surface border border-edge rounded-2xl p-8 max-w-md">
            <p class="text-sm text-content-tertiary mb-6">
              Create a workspace to invite team members and share projects.
            </p>
            {orgsModel.error.value && <Alert class="mb-4">{orgsModel.error.value}</Alert>}
            <form onSubmit={handleCreate} class="flex flex-col gap-4">
              <Label>
                <LabelText>Workspace name</LabelText>
                <Input
                  type="text"
                  value={orgName}
                  onInput={(e) => setOrgName((e.target as HTMLInputElement).value)}
                  placeholder="My Company"
                  required
                />
              </Label>
              <Label>
                <LabelText>Slug</LabelText>
                <Input
                  type="text"
                  value={orgSlug}
                  onInput={(e) => setOrgSlug((e.target as HTMLInputElement).value)}
                  placeholder="my-company"
                  required
                />
              </Label>
              <Button
                type="submit"
                disabled={orgsModel.loading.value || !orgName.trim() || !orgSlug.trim()}
              >
                {orgsModel.loading.value ? "Creating…" : "Create Workspace"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const org = orgsModel.currentOrg.value;
  if (!org) return null;

  const handleInvite = async (e: Event) => {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;
    setInviting(true);
    setInviteSuccess(false);
    try {
      await orgsModel.invite(org.id, email, inviteRole);
      setInviteEmail("");
      setInviteSuccess(true);
      await orgsModel.fetchMembers(org.id);
    } catch {
      // error already set in model
    } finally {
      setInviting(false);
    }
  };

  const handleCreateTeam = async (e: Event) => {
    e.preventDefault();
    const name = newTeamName.trim();
    if (!name) return;
    setCreatingTeam(true);
    try {
      await orgsModel.createOrgTeam(org.id, name);
      setNewTeamName("");
    } catch {
      // error already set in model
    } finally {
      setCreatingTeam(false);
    }
  };

  return (
    <div class="min-h-screen bg-page pt-16">
      <div class="max-w-5xl mx-auto px-6 py-12">
        <div class="flex items-center justify-between mb-8">
          <div>
            <h1 class="text-2xl font-bold tracking-tight text-content">{org.name}</h1>
            <p class="text-sm text-content-tertiary mt-1">Workspace</p>
          </div>
        </div>

        {orgsModel.error.value && <Alert class="mb-6">{orgsModel.error.value}</Alert>}

        {/* Tabs */}
        <div class="flex border-b border-edge mb-8">
          {(["members", "teams"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              class={`py-2 px-1 mr-6 text-sm font-medium border-b-2 -mb-px transition-colors capitalize ${
                tab === t
                  ? "border-content text-content"
                  : "border-transparent text-content-tertiary hover:text-content"
              }`}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === "members" && (
          <div>
            {/* Invite form */}
            <div class="bg-surface border border-edge rounded-xl p-6 mb-8">
              <h2 class="text-sm font-semibold text-content mb-4">Invite a member</h2>
              {inviteSuccess && (
                <Alert variant="success" class="mb-4">
                  Invitation sent successfully.
                </Alert>
              )}
              <form onSubmit={handleInvite} class="flex gap-2 items-end flex-wrap">
                <div class="flex-1 min-w-48">
                  <Label>
                    <LabelText>Email</LabelText>
                    <Input
                      type="email"
                      required
                      value={inviteEmail}
                      onInput={(e) => setInviteEmail((e.target as HTMLInputElement).value)}
                      placeholder="colleague@example.com"
                      disabled={inviting}
                    />
                  </Label>
                </div>
                <div>
                  <Label>
                    <LabelText>Role</LabelText>
                    <select
                      class="h-9 rounded-lg border border-edge bg-page text-content text-sm px-2 focus:outline-none focus:ring-2 focus:ring-accent"
                      value={inviteRole}
                      onChange={(e) =>
                        setInviteRole((e.target as HTMLSelectElement).value as "owner" | "member")
                      }
                    >
                      <option value="member">Member</option>
                      <option value="owner">Owner</option>
                    </select>
                  </Label>
                </div>
                <Button type="submit" disabled={inviting || !inviteEmail.trim()}>
                  {inviting ? "Sending…" : "Invite"}
                </Button>
              </form>
            </div>

            {/* Member list */}
            {orgsModel.loading.value ? (
              <p class="text-content-tertiary text-sm">Loading members…</p>
            ) : (
              <ul class="space-y-2">
                {orgsModel.members.value.map((m) => (
                  <li
                    key={m.id}
                    class="flex items-center justify-between px-4 py-3 rounded-lg border border-edge bg-page"
                  >
                    <div>
                      <p class="text-sm font-medium text-content">{m.name}</p>
                      <p class="text-xs text-content-tertiary">{m.email}</p>
                    </div>
                    <div class="flex items-center gap-3">
                      <span class="text-xs text-content-tertiary capitalize">{m.role}</span>
                      <button
                        type="button"
                        class="text-xs text-content-faint hover:text-error-text transition-colors"
                        onClick={() => orgsModel.removeMemberById(org.id, m.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
                {orgsModel.invitations.value
                  .filter((inv) => inv.status === "pending")
                  .map((inv) => (
                    <li
                      key={inv.id}
                      class="flex items-center justify-between px-4 py-3 rounded-lg border border-edge bg-page opacity-60"
                    >
                      <div>
                        <p class="text-sm font-medium text-content">{inv.email}</p>
                        <p class="text-xs text-content-tertiary">Pending invitation</p>
                      </div>
                      <span class="text-xs text-content-tertiary capitalize">{inv.role}</span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}

        {tab === "teams" && (
          <div>
            {/* Create team form */}
            <form onSubmit={handleCreateTeam} class="flex gap-2 mb-8">
              <Input
                type="text"
                value={newTeamName}
                onInput={(e) => setNewTeamName((e.target as HTMLInputElement).value)}
                placeholder="New team name"
                disabled={creatingTeam}
                class="flex-1"
              />
              <Button type="submit" disabled={creatingTeam || !newTeamName.trim()}>
                {creatingTeam ? "Creating…" : "Create Team"}
              </Button>
            </form>

            {orgsModel.loading.value ? (
              <p class="text-content-tertiary text-sm">Loading teams…</p>
            ) : orgsModel.teams.value.length === 0 ? (
              <p class="text-content-tertiary text-sm">No teams yet.</p>
            ) : (
              <div class="space-y-4">
                {orgsModel.teams.value.map((team: WorkspaceTeam) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    orgMembers={orgsModel.members.value}
                    onAddMember={(userId) => orgsModel.addMemberToTeam(org.id, team.id, userId)}
                    onRemoveMember={(userId) =>
                      orgsModel.removeMemberFromTeam(org.id, team.id, userId)
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface TeamCardProps {
  team: WorkspaceTeam;
  orgMembers: import("../../lib/api").WorkspaceMember[];
  onAddMember: (userId: string) => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
}

function TeamCard({ team, orgMembers, onAddMember, onRemoveMember }: TeamCardProps) {
  const [selectedUserId, setSelectedUserId] = useState("");
  const teamMemberIds = new Set(team.members.map((m) => m.userId));
  const addable = orgMembers.filter((m) => !teamMemberIds.has(m.userId));

  const handleAdd = async (e: Event) => {
    e.preventDefault();
    if (!selectedUserId) return;
    await onAddMember(selectedUserId);
    setSelectedUserId("");
  };

  return (
    <div class="border border-edge rounded-xl p-5 bg-page">
      <h3 class="text-sm font-semibold text-content mb-4">{team.name}</h3>
      <ul class="space-y-2 mb-4">
        {team.members.map((m) => (
          <li key={m.userId} class="flex items-center justify-between text-sm">
            <span class="text-content">{m.name || m.email}</span>
            <button
              type="button"
              class="text-xs text-content-faint hover:text-error-text transition-colors"
              onClick={() => onRemoveMember(m.userId)}
            >
              Remove
            </button>
          </li>
        ))}
        {team.members.length === 0 && (
          <li class="text-xs text-content-tertiary">No members yet.</li>
        )}
      </ul>
      {addable.length > 0 && (
        <form onSubmit={handleAdd} class="flex gap-2">
          <select
            class="flex-1 h-9 rounded-lg border border-edge bg-page text-content text-sm px-2 focus:outline-none focus:ring-2 focus:ring-accent"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId((e.target as HTMLSelectElement).value)}
          >
            <option value="">Add member…</option>
            {addable.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name} ({m.email})
              </option>
            ))}
          </select>
          <Button type="submit" size="sm" disabled={!selectedUserId}>
            Add
          </Button>
        </form>
      )}
    </div>
  );
}
