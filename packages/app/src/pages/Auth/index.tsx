import { useLocation } from "preact-iso";
import { AuthForm } from "../../components/AuthForm";
import { authClient } from "../../lib/auth";

const PENDING_INVITE_KEY = "pendingInviteToken";

export function Auth() {
  const { route } = useLocation();

  async function handleSuccess() {
    const token = sessionStorage.getItem(PENDING_INVITE_KEY);
    if (token) {
      sessionStorage.removeItem(PENDING_INVITE_KEY);
      try {
        await authClient.organization.acceptInvitation({ invitationId: token });
      } catch {
        // Ignore acceptance errors — redirect to teams anyway so user can see the state
      }
      route("/app/teams");
    } else {
      route("/app/dashboard");
    }
  }

  return <AuthForm onSuccess={handleSuccess} />;
}
