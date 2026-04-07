import { useEffect } from "preact/hooks";
import { useLocation } from "preact-iso";
import { useModel } from "@preact/signals";
import { AuthModel } from "../../models/auth";
import { BillingModel } from "../../models/billing";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";

export function Billing() {
  const { route, query } = useLocation();
  const auth = useModel(AuthModel);
  const billing = useModel(BillingModel);

  const success = query.success === "true";

  useEffect(() => {
    auth.checkSession().then(() => {
      if (!auth.authenticated.value) {
        route("/auth");
        return;
      }
      billing.fetch();
    });
  }, []);

  if (billing.loading.value) {
    return (
      <div class="min-h-screen bg-page flex items-center justify-center">
        <p class="text-content-tertiary text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div class="min-h-screen pt-16 bg-page">
      <div class="max-w-5xl mx-auto px-4 py-12">
        <div class="flex items-center justify-between mb-8">
          <h1 class="text-2xl font-bold text-content">Billing</h1>
        </div>

        {success && (
          <Alert variant="success" class="mb-6">
            Your subscription has been updated successfully.
          </Alert>
        )}

        {billing.error.value && <Alert class="mb-6">{billing.error.value}</Alert>}

        {/* Current Plan */}
        <div class="bg-surface border border-edge rounded-2xl p-6">
          <div class="flex items-center justify-between">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <h2 class="text-lg font-semibold text-content">Current Plan</h2>
                <span class="text-xs font-medium bg-accent-surface text-accent-text px-2 py-0.5 rounded-full">
                  Free during Beta
                </span>
              </div>
              <p class="text-sm text-content-tertiary mt-1">
                You are on the{" "}
                <span
                  class={`font-medium ${billing.isPro.value ? "text-accent-text" : "text-content-secondary"}`}
                >
                  {billing.isPro.value
                    ? "Pro"
                    : billing.isProductBeta.value
                      ? "Pro (Preview)"
                      : "Free"}
                </span>{" "}
                plan.
              </p>
            </div>
            {billing.isPro.value ? (
              <Button
                variant="secondary"
                onClick={() => billing.manage()}
                disabled={billing.manageLoading.value}
              >
                {billing.manageLoading.value ? "Redirecting..." : "Manage Subscription"}
              </Button>
            ) : (
              <Button onClick={() => billing.upgrade()} disabled={billing.upgradeLoading.value}>
                {billing.upgradeLoading.value ? "Redirecting..." : "Upgrade to Pro"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
