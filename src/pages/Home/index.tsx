import { useSignal } from "@preact/signals";
import { useLocation } from "preact-iso";
import {
  IconShieldLock,
  IconCreditCard,
  IconLayoutDashboard,
  IconDatabase,
  IconBolt,
  IconWorld,
} from "@tabler/icons-react";
import type { ComponentType } from "preact";

export function Home() {
  const { route } = useLocation();

  return (
    <>
      <div class="min-h-screen bg-page flex items-center justify-center relative overflow-hidden">
        {/* Subtle background pattern */}
        <div class="absolute inset-0 opacity-[0.025]">
          <div
            class="absolute inset-0"
            style="background-image: radial-gradient(circle at 1px 1px, var(--t-content) 1px, transparent 0); background-size: 24px 24px;"
          ></div>
        </div>

        {/* Main content */}
        <div class="relative z-10 text-center px-6">
          <h1 class="text-7xl md:text-8xl font-bold mb-6 text-content tracking-tighter">TOGGLES</h1>
          <p class="text-lg md:text-xl text-content-tertiary mb-12 max-w-[45ch] mx-auto leading-relaxed">
            Ship your next idea faster. Auth, billing, and a dashboard — all wired up and ready to
            go.
          </p>
          <button
            onClick={() => route("/dashboard")}
            class="px-8 py-3 rounded-md bg-cta text-cta-text font-medium text-base shadow-btn-dark border border-black/10 hover:bg-cta-hover active:translate-y-px active:shadow-none transition-all duration-100"
          >
            Get Started
          </button>
        </div>
      </div>
      <Features />
      <HowItWorks />
      <Pricing />
      <Trust />
      <FAQ />
    </>
  );
}

function Features() {
  const features: {
    title: string;
    desc: string;
    icon: ComponentType<{ size?: number; stroke?: number }>;
  }[] = [
    {
      title: "Authentication",
      desc: "Email/password and OAuth out of the box. Session management included.",
      icon: IconShieldLock,
    },
    {
      title: "Billing & subscriptions",
      desc: "Polar integration with free and pro plans. Webhooks handle the rest.",
      icon: IconCreditCard,
    },
    {
      title: "Dashboard",
      desc: "A protected area for your users, ready for you to build on.",
      icon: IconLayoutDashboard,
    },
    {
      title: "Database",
      desc: "Drizzle ORM with SQLite (Cloudflare D1). Type-safe migrations.",
      icon: IconDatabase,
    },
    {
      title: "API",
      desc: "Hono on Cloudflare Workers. Fast, typed, and globally distributed.",
      icon: IconBolt,
    },
    {
      title: "Modern frontend",
      desc: "Preact, Vite, and Tailwind CSS. Lightweight and fast.",
      icon: IconWorld,
    },
  ];

  return (
    <section id="features" class="py-24 px-6">
      <div class="max-w-7xl mx-auto">
        <h2 class="text-2xl font-semibold tracking-tight text-center mb-3">Everything you need</h2>
        <p class="text-sm text-content-tertiary text-center mb-16 max-w-xl mx-auto">
          A complete foundation so you can focus on what makes your product unique.
        </p>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div key={f.title} class="bg-surface border border-edge rounded-md p-6">
              <div class="text-accent-text mb-3">
                <f.icon size={24} stroke={1.5} />
              </div>
              <h3 class="text-base font-medium mb-2">{f.title}</h3>
              <p class="text-sm text-content-tertiary leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      num: "1",
      title: "Clone the repo",
      desc: "Fork or clone the template and install dependencies with pnpm.",
    },
    {
      num: "2",
      title: "Configure services",
      desc: "Add your Polar and auth keys, set up your D1 database.",
    },
    {
      num: "3",
      title: "Build your product",
      desc: "Add your own pages, API routes, and business logic on top.",
    },
  ];

  return (
    <section id="how-it-works" class="py-24 px-6 bg-surface-alt">
      <div class="max-w-5xl mx-auto">
        <h2 class="text-2xl font-semibold tracking-tight text-center mb-16">How it works</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-10">
          {steps.map((s) => (
            <div key={s.num} class="text-center">
              <span class="font-mono text-5xl font-bold text-content-faint block mb-4">
                {s.num}
              </span>
              <h3 class="text-base font-medium mb-2">{s.title}</h3>
              <p class="text-sm text-content-tertiary leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" class="py-24 px-6">
      <div class="max-w-5xl mx-auto">
        <h2 class="text-2xl font-semibold tracking-tight text-center mb-3">Simple pricing</h2>
        <p class="text-sm text-content-tertiary text-center mb-16 max-w-xl mx-auto">
          Start free, upgrade when you need more.
        </p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto">
          {/* Free */}
          <div class="flex flex-col bg-surface border border-edge rounded-md p-8">
            <h3 class="text-base font-medium mb-1">Free</h3>
            <p class="text-3xl font-bold mb-4">
              $0
              <span class="text-sm font-normal text-content-tertiary">/mo</span>
            </p>
            <ul class="space-y-2 text-sm text-content-tertiary mb-8">
              <li>Basic features</li>
              <li>Community support</li>
              <li>Up to 100 items</li>
            </ul>
            <button class="mt-auto w-full py-2.5 rounded-md bg-raised border border-edge text-content-secondary font-medium shadow-btn hover:bg-raised-hover hover:border-edge-hover hover:text-content active:translate-y-px active:shadow-none transition-all duration-100">
              Get started
            </button>
          </div>
          {/* Pro */}
          <div class="bg-surface border border-edge-hover rounded-md p-8 relative">
            <span class="absolute -top-3 left-6 bg-content text-page text-xs font-medium px-3 py-1 rounded-full">
              Popular
            </span>
            <h3 class="text-base font-medium mb-1">Pro</h3>
            <p class="text-3xl font-bold mb-4">
              $10
              <span class="text-sm font-normal text-content-tertiary">/mo</span>
            </p>
            <ul class="space-y-2 text-sm text-content-tertiary mb-8">
              <li>All free features</li>
              <li>Priority support</li>
              <li>Unlimited items</li>
              <li>Advanced analytics</li>
              <li>Custom integrations</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function Trust() {
  const stats = [
    { value: "10K+", label: "Users" },
    { value: "50K+", label: "Items created" },
    { value: "99.9%", label: "Uptime" },
    { value: "150+", label: "Countries" },
  ];

  return (
    <section class="py-24 px-6 bg-surface-alt">
      <div class="max-w-5xl mx-auto">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <p class="text-3xl md:text-4xl font-bold text-content">{s.value}</p>
              <p class="text-sm text-content-tertiary mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const items = [
    {
      q: "Is it really free?",
      a: "Yes. The free plan gives you access to the core features with generous limits. Upgrade to Pro when you need more.",
    },
    {
      q: "Do I need an account?",
      a: "Yes, you need to create a free account to use the service. This lets you manage your data and preferences.",
    },
    {
      q: "How does billing work?",
      a: "Billing is handled through Polar. You can upgrade, downgrade, or cancel at any time from your billing page.",
    },
    {
      q: "Is my data secure?",
      a: "All data is encrypted in transit with TLS. Your credentials are hashed and never stored in plain text.",
    },
    {
      q: "Can I self-host this?",
      a: "The API runs on Cloudflare Workers and the frontend is a static site. You can adapt both to your own infrastructure.",
    },
    {
      q: "What stack does this use?",
      a: "Preact + Vite + Tailwind on the frontend, Hono + Drizzle + D1 on the backend, with BetterAuth and Polar for auth and billing.",
    },
  ];

  return (
    <section class="py-24 px-6">
      <div class="max-w-3xl mx-auto">
        <h2 class="text-2xl font-semibold tracking-tight text-center mb-16">
          Frequently asked questions
        </h2>
        <div class="space-y-2">
          {items.map((item) => (
            <FAQItem key={item.q} question={item.q} answer={item.a} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const open = useSignal(false);

  return (
    <div class="border border-edge rounded-md overflow-hidden">
      <button
        class="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-surface transition-colors"
        onClick={() => (open.value = !open.value)}
      >
        <span class="text-sm font-medium">{question}</span>
        <svg
          class={`w-4 h-4 text-content-tertiary transition-transform flex-shrink-0 ${open.value ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width={2}
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open.value && (
        <div class="px-6 pt-2 pb-4 text-sm text-content-tertiary leading-relaxed">{answer}</div>
      )}
    </div>
  );
}
