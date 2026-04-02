import { useModel } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { useLocation } from "preact-iso";
import { AuthModel } from "../../models/auth";

export function Dashboard() {
  const { route } = useLocation();
  const auth = useModel(AuthModel);

  useEffect(() => {
    auth.checkSession().then(() => {
      if (!auth.authenticated.value) {
        route("/auth");
      }
    });
  }, []);

  if (auth.loading.value) {
    return (
      <div class="min-h-screen bg-page pt-16 flex items-center justify-center">
        <p class="text-content-tertiary text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div class="min-h-screen bg-page pt-16">
      <div class="max-w-4xl mx-auto px-6 py-12">
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-2xl font-bold text-content">Dashboard</h1>
        </div>

        <h1>Under Construction</h1>
      </div>
    </div>
  );
}
