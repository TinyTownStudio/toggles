import { useSignal } from "@preact/signals";
import { useLocation } from "preact-iso";
import { Button } from "../../components/ui/Button";
import { ProductMock } from "./ProductMock";

export function Home() {
  const { route } = useLocation();

  return (
    <>
      <Hero onGetStarted={() => route("/app/dashboard")} />
      <Features />
      <Pricing onGetStarted={() => route("/app/dashboard")} />
      <FAQ />
    </>
  );
}

function Hero({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <section class="overflow-hidden py-20 px-6 md:py-28">
      <div class="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-2 md:gap-10">
        <div>
          <p class="mb-8 font-mono text-xs tracking-widest text-content-faint uppercase">
            Feature flags
          </p>
          <h1 class="mb-6 text-4xl font-semibold leading-[1.15] tracking-tight text-content md:text-5xl">
            Ship features <span class="underline-wavy">on your terms</span>.
          </h1>
          <p class="mb-10 max-w-[52ch] text-base leading-relaxed text-content-tertiary">
            Manage feature flags across staging and production - flip them at runtime without
            redeploying.
          </p>
          <button
            onClick={onGetStarted}
            class="rounded-lg border border-black/10 bg-cta px-6 py-2.5 text-sm font-medium text-cta-text shadow-btn-dark transition-all duration-100 hover:bg-cta-hover active:translate-y-px active:shadow-none"
          >
            Get started for free
          </button>
        </div>
        <ProductMock />
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      title: "Environments",
      desc: "Staging vs production in one project; each env has its own flag state.",
    },
    {
      title: "Feature flags",
      desc: "Flip features at runtime - no redeploy needed.",
    },
    {
      title: "Projects",
      desc: "One namespace per app, with its own keys.",
    },
    {
      title: "Scoped API keys",
      desc: "Read or admin access, with an optional environment lock.",
    },
    {
      title: "REST API",
      desc: "Query flags from any language or framework.",
    },
  ];

  return (
    <section id="features" class="border-t border-edge px-6 py-20">
      <div class="mx-auto max-w-2xl">
        <h2 class="mb-12 font-mono text-xs tracking-widest text-content-faint uppercase">
          What's included
        </h2>
        <div class="grid grid-cols-1 gap-x-12 gap-y-8 md:grid-cols-2">
          {features.map((f) => (
            <div key={f.title} class="border-l-2 border-accent/30 pl-4">
              <h3 class="mb-1 text-sm font-medium text-content">{f.title}</h3>
              <p class="text-sm leading-relaxed text-content-tertiary">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <section id="pricing" class="border-t border-edge px-6 py-20">
      <div class="mx-auto max-w-2xl">
        <h2 class="mb-6 font-mono text-xs tracking-widest text-content-faint uppercase">Pricing</h2>
        <p class="mb-8 rounded-lg bg-accent-surface px-4 py-3 text-sm text-accent-text">
          <span class="font-semibold">Free during Beta</span> &mdash; all features are unlocked
          while we&rsquo;re in early access. Upgrading to Pro helps us keep the lights on.
        </p>
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Free */}
          <div class="flex flex-col rounded-xl border border-edge p-6">
            <h3 class="mb-1 text-sm font-medium text-content">Free</h3>
            <p class="mb-1 text-2xl font-semibold text-content">
              $0
              <span class="text-sm font-normal text-content-tertiary"> / month</span>
            </p>
            <p class="mb-6 text-xs text-content-faint">No credit card required.</p>
            <ul class="mb-8 flex-1 space-y-2 text-sm text-content-tertiary">
              <li>2 projects</li>
              <li>3 environments / project</li>
              <li>100 flags / project</li>
              <li>250k API reads / month</li>
              <li>Community support</li>
            </ul>
            <Button variant="secondary" class="w-full justify-center" onClick={onGetStarted}>
              Get started
            </Button>
          </div>

          {/* Pro */}
          <div class="flex flex-col rounded-xl border border-edge p-6">
            <h3 class="mb-1 text-sm font-medium text-content">Pro</h3>
            <p class="mb-1 text-2xl font-semibold text-content">
              $5
              <span class="text-sm font-normal text-content-tertiary"> / month</span>
            </p>
            <p class="mb-6 text-xs text-content-faint">Billed monthly. Cancel any time.</p>
            <ul class="mb-8 flex-1 space-y-2 text-sm text-content-tertiary">
              <li>Everything in Free</li>
              <li>Unlimited projects / environments / flags</li>
              <li>5M API reads / month</li>
              <li>
                Teams <span class="text-accent">(Coming soon…)</span>
              </li>
            </ul>
            <Button class="w-full justify-center" onClick={onGetStarted}>
              Get started
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const items = [
    {
      q: "Do I need an account?",
      a: "Yes. You sign up with an email and password - that's it",
    },
    {
      q: "How do I use flags in my app?",
      a: "Generate an API key for your project, then query the REST API to read flag state. The response is a simple JSON object.",
    },
    {
      q: "What counts as an API read?",
      a: "Each API-key GET of your flag list or a single flag counts as one read. Dashboard and session traffic do not count.",
    },
    {
      q: "How does billing work?",
      a: "Payments are handled by Polar. You can upgrade, downgrade, or cancel at any time from your account's billing page.",
    },
    {
      q: "Is my data secure?",
      a: "All traffic is encrypted with TLS. Passwords are hashed and never stored in plain text. API keys are scoped per project.",
    },
    {
      q: "Can I cancel my Pro subscription?",
      a: "Yes, at any time. You keep Pro access until the end of the billing period.",
    },
  ];

  return (
    <section id="faq" class="border-t border-edge px-6 py-20">
      <div class="mx-auto max-w-2xl">
        <h2 class="mb-12 font-mono text-xs tracking-widest text-content-faint uppercase">FAQ</h2>
        <div class="divide-y divide-edge">
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
    <div>
      <button
        class="group flex w-full items-start justify-between gap-4 py-4 text-left"
        onClick={() => (open.value = !open.value)}
      >
        <span class="text-sm font-medium text-content transition-colors group-hover:text-content-secondary">
          {question}
        </span>
        <span
          class={`mt-0.5 flex-shrink-0 text-content-faint transition-transform ${open.value ? "rotate-45" : ""}`}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M6 1v10M1 6h10"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </span>
      </button>
      <p class={`pb-4 text-sm leading-relaxed text-content-tertiary ${open.value ? "" : "hidden"}`}>
        {answer}
      </p>
    </div>
  );
}
