import {
  LocationProvider,
  Router,
  Route,
  hydrate,
  prerender as ssr,
  useLocation,
  lazy,
  ErrorBoundary,
} from "preact-iso";
import { useModel } from "@preact/signals";
import { useEffect } from "preact/hooks";

import { Toaster } from "@preachjs/toast";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { DashboardHeader } from "./components/DashboardHeader";
import { ThemeModel } from "./models/theme";
import { getHeadMeta } from "./lib/seo";
import { loadBasecoat } from "./lib/basecoat";
import "./style.css";

if (typeof window !== "undefined") {
  loadBasecoat();
}

const Home = lazy(() => import("./pages/Home/index").then((module) => module.Home));
const Auth = lazy(() => import("./pages/Auth/index").then((module) => module.Auth));
const Dashboard = lazy(() => import("./pages/Dashboard/index").then((module) => module.Dashboard));
const Billing = lazy(() => import("./pages/Billing/index").then((module) => module.Billing));
const Projects = lazy(() => import("./pages/Projects/index").then((module) => module.Projects));
const ProjectDetail = lazy(() =>
  import("./pages/ProjectDetail/index").then((module) => module.ProjectDetail),
);
const ApiKeys = lazy(() => import("./pages/ApiKeys/index").then((module) => module.ApiKeys));
const Docs = lazy(() => import("./pages/Docs/index").then((module) => module.Docs));
const NotFound = lazy(() => import("./pages/_404").then((module) => module.NotFound));

function AppContent() {
  const { url } = useLocation();
  const shouldRenderBaseHeader = !url.startsWith("/app");
  const theme = useModel(ThemeModel);

  useEffect(() => {
    return theme.init();
  }, []);

  return (
    <div class="bg-page min-h-screen text-content">
      {/* Show appropriate header based on route */}
      {shouldRenderBaseHeader ? <Header /> : <DashboardHeader />}

      <main>
        <ErrorBoundary>
          <Router>
            <Route path="/" component={Home} />
            <Route path="/auth" component={Auth} />
            <Route path="/app/dashboard" component={Dashboard} />
            <Route path="/app/projects" component={Projects} />
            <Route path="/app/projects/:id" component={ProjectDetail} />
            <Route path="/app/billing" component={Billing} />
            <Route path="/app/api-keys" component={ApiKeys} />
            <Route path="/docs" component={Docs} />
            <Route default component={NotFound} />
          </Router>
        </ErrorBoundary>
      </main>

      {/* Show appropriate footer based on route */}
      {shouldRenderBaseHeader && <Footer />}
      <Toaster />
    </div>
  );
}

export function App() {
  return (
    <LocationProvider>
      <AppContent />
    </LocationProvider>
  );
}

if (typeof window !== "undefined") {
  hydrate(<App />, document.getElementById("app")!);
}

const PRERENDER_ROUTES = new Set(["/", "/docs"]);

export async function prerender(data: { url: string }) {
  const { html, links: discovered = new Set<string>() } = await ssr(<App />);
  const links = new Set(
    [...discovered].filter((href) => {
      const path = new URL(href, "http://localhost").pathname.replace(/\/$/, "") || "/";
      return PRERENDER_ROUTES.has(path);
    }),
  );
  return { html, links, head: getHeadMeta(data.url) };
}
