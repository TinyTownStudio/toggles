import type { NavSection } from "./types";

export const NAV: NavSection[] = [
  { id: "introduction", label: "Introduction" },
  {
    id: "authentication",
    label: "Authentication",
    children: [
      { id: "auth-session", label: "Session (cookie)" },
      { id: "auth-bearer", label: "API Key (Bearer)" },
      { id: "auth-key-types", label: "Key types & scopes" },
    ],
  },
  {
    id: "projects",
    label: "Projects",
    children: [
      { id: "projects-list", label: "List projects" },
      { id: "projects-create", label: "Create project" },
      { id: "projects-delete", label: "Delete project" },
    ],
  },
  {
    id: "toggles",
    label: "Toggles",
    children: [
      { id: "toggles-list", label: "List toggles" },
      { id: "toggles-one", label: "Get one toggle" },
      { id: "toggles-create", label: "Create toggle" },
      { id: "toggles-update", label: "Update toggle" },
      { id: "toggles-delete", label: "Delete toggle" },
    ],
  },
  {
    id: "api-keys",
    label: "API Keys",
    children: [
      { id: "apikeys-list", label: "List keys" },
      { id: "apikeys-create", label: "Create key" },
      { id: "apikeys-delete", label: "Revoke key" },
    ],
  },
];

export const ALL_IDS = NAV.flatMap((s) => [s.id, ...(s.children?.map((c) => c.id) ?? [])]);
