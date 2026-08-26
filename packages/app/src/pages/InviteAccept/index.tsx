import { useEffect, useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { useModel } from "@preact/signals";
import { AuthModel } from "../../models/auth";
import { BillingModel } from "../../models/billing";
import { authClient } from "../../lib/auth";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";

const PENDING_INVITE_KEY = "pendingInviteToken";

export function InviteAccept() {
  const { route, query } = useLocation();
  const auth = useModel(AuthModel);
  const billing = useModel(BillingModel);
  const [status, setStatus] = useState<"loading" | "accepting" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const token = query.token as string | undefined;

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMsg("Invalid or missing invitation token.");
      return;
    }

    auth.checkSession().then(async () => {
      if (!auth.authenticated.value) {
        // Store token and redirect to auth
        sessionStorage.setItem(PENDING_INVITE_KEY, token);
        route("/auth");
        return;
      }

      await billing.fetch();

      if (!billing.isPro.value && !billing.isProductBeta.value) {
        setStatus("error");
        setErrorMsg("A Pro plan is required to join a workspace.");
        return;
      }

      // Accept the invitation
      setStatus("accepting");
      try {
        await authClient.organization.acceptInvitation({ invitationId: token });
        setStatus("success");
        setTimeout(() => route("/app/teams"), 1500);
      } catch (err) {
        setStatus("error");
        setErrorMsg(err instanceof Error ? err.message : "Failed to accept invitation.");
      }
    });
  }, [token]);

  if (status === "loading" || status === "accepting") {
    return (
      <div class="min-h-screen bg-page flex items-center justify-center">
        <p class="text-content-tertiary text-sm">
          {status === "accepting" ? "Accepting invitation…" : "Loading…"}
        </p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div class="min-h-screen bg-page flex items-center justify-center px-4">
        <div class="max-w-md w-full text-center">
          <Alert variant="success" class="mb-4">
            Invitation accepted! Redirecting to your workspace…
          </Alert>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div class="min-h-screen bg-page flex items-center justify-center px-4">
      <div class="max-w-md w-full text-center">
        <Alert class="mb-6">{errorMsg}</Alert>
        {errorMsg?.includes("Pro") ? (
          <Button onClick={() => route("/app/billing")}>Upgrade to Pro</Button>
        ) : (
          <Button variant="secondary" onClick={() => route("/app/dashboard")}>
            Go to Dashboard
          </Button>
        )}
      </div>
    </div>
  );
}
