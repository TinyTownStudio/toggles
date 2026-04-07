import { SectionHeading, SubHeading } from "../headings";
import { Endpoint } from "../Endpoint";

export function Dashboard() {
  return (
    <div class="mt-14 mb-20">
      <SectionHeading id="dashboard">Dashboard</SectionHeading>
      <p class="text-sm text-content-tertiary leading-relaxed mb-8">
        The dashboard endpoint returns an aggregated overview of your account: project and flag
        counts, recently modified flags, stale flags (not updated in 30+ days), a per-project
        breakdown, API key health metrics, and your current plan limits.
      </p>

      <SubHeading id="dashboard-get">Get dashboard</SubHeading>
      <Endpoint
        method="GET"
        path="/api/v1/dashboard"
        description="Returns a single object with account-wide statistics. All sub-queries run in parallel, so the response is fast regardless of how many projects or flags you have."
        authNote="Requires session auth."
        responseExample={`{
  "totalProjects": 3,
  "totalFlags": 12,
  "enabledFlags": 9,
  "disabledFlags": 3,
  "totalApiKeys": 4,
  "activeApiKeys": 3,
  "unusedApiKeys": 1,
  "expiringApiKeys": 0,
  "recentlyModified": [
    {
      "id": "tgl_01hz...",
      "key": "dark-mode",
      "projectId": "proj_01hz...",
      "projectName": "Web App",
      "enabled": true,
      "updatedAt": 1705485600000,
      "createdAt": 1705399200000
    }
  ],
  "staleFlags": [
    {
      "id": "tgl_02hz...",
      "key": "old-checkout",
      "projectId": "proj_01hz...",
      "projectName": "Web App",
      "enabled": false,
      "updatedAt": 1697500800000,
      "createdAt": 1697414400000
    }
  ],
  "flagsPerProject": [
    {
      "projectId": "proj_01hz...",
      "projectName": "Web App",
      "totalFlags": 8,
      "enabledFlags": 6
    },
    {
      "projectId": "proj_02hz...",
      "projectName": "Mobile App",
      "totalFlags": 4,
      "enabledFlags": 3
    }
  ],
  "plan": "pro",
  "limits": {
    "projects": null,
    "teams": true
  },
  "beta": {
    "product": false
  }
}`}
        curlExample={`curl https://toggles.tinytown.studio/api/v1/dashboard \\
  -H "Cookie: better-auth.session_token=<session>"`}
        jsExample={`const res = await fetch("https://toggles.tinytown.studio/api/v1/dashboard", {
  credentials: "include",
});
const dashboard = await res.json();

console.log(dashboard.totalFlags);       // total flag count
console.log(dashboard.recentlyModified); // last 5 modified flags
console.log(dashboard.staleFlags);       // flags not updated in 30+ days
console.log(dashboard.plan);             // "free" | "pro"`}
      />
    </div>
  );
}
