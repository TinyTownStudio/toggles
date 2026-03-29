import {
  LocationProvider,
  Router,
  Route,
  hydrate,
  prerender as ssr,
  useLocation,
  lazy,
} from "preact-iso";
import { useModel } from "@preact/signals";
import { useEffect } from "preact/hooks";

import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { DashboardHeader } from "./components/DashboardHeader";
import { ThemeModel } from "./models/theme";
import "./style.css";

const Home = lazy(() => import("./pages/Home/index").then((module) => module.Home));
const Auth = lazy(() => import("./pages/Auth/index").then((module) => module.Auth));
const Dashboard = lazy(() => import("./pages/Dashboard/index").then((module) => module.Dashboard));
const Billing = lazy(() => import("./pages/Billing/index").then((module) => module.Billing));
const Projects = lazy(() => import("./pages/Projects/index").then((module) => module.Projects));
const ProjectDetail = lazy(() =>
  import("./pages/ProjectDetail/index").then((module) => module.ProjectDetail),
);
const ApiKeys = lazy(() => import("./pages/ApiKeys/index").then((module) => module.ApiKeys));
const NotFound = lazy(() => import("./pages/_404").then((module) => module.NotFound));

function AppContent() {
  const { url } = useLocation();
  const shouldRenderBaseHeader = url === "/" || url === "/auth";
  const theme = useModel(ThemeModel);

  useEffect(() => {
    return theme.init();
  }, []);

  return (
    <div class="bg-page min-h-screen text-content">
      {/* Show appropriate header based on route */}
      {shouldRenderBaseHeader ? <Header /> : <DashboardHeader />}

      <main>
        <Router>
          <Route path="/" component={Home} />
          <Route path="/auth" component={Auth} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/projects" component={Projects} />
          <Route path="/projects/:id" component={ProjectDetail} />
          <Route path="/billing" component={Billing} />
          <Route path="/api-keys" component={ApiKeys} />
          <Route default component={NotFound} />
        </Router>
      </main>

      {/* Show appropriate footer based on route */}
      {shouldRenderBaseHeader && <Footer />}
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

export async function prerender(data: any) {
  return await ssr(<App {...data} />);
}
