import { useSignal } from "@preact/signals";
import { useLocation } from "preact-iso";
import { Button } from "../../components/ui/Button";

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
    <section class="py-32 px-6">
      <div class="max-w-2xl mx-auto">
        <p class="font-mono text-xs text-content-faint tracking-widest uppercase mb-8">
          Feature flags
        </p>
        <h1 class="text-4xl md:text-5xl font-semibold tracking-tight text-content leading-[1.15] mb-6">
          Ship features <span class="underline-wavy">on your terms</span>.
        </h1>
        <p class="text-base text-content-tertiary leading-relaxed mb-10 max-w-[52ch]">
          Toggles lets you manage feature flags across your projects. Enable or disable features at
          runtime - no redeployment needed.
        </p>
        <button
          onClick={onGetStarted}
          class="px-6 py-2.5 rounded-lg bg-cta text-cta-text font-medium text-sm shadow-btn-dark border border-black/10 hover:bg-cta-hover active:translate-y-px active:shadow-none transition-all duration-100"
        >
          Get started for free
        </button>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      title: "Projects",
      desc: "Organize flags by project. Each project gets its own namespace and API key.",
    },
    {
      title: "Feature toggles",
      desc: "Create named flags and flip them on or off from the dashboard in real time.",
    },
    {
      title: "API access",
      desc: "Query your flags over a simple REST API. Integrate with any language or framework.",
    },
    {
      title: "API keys",
      desc: "Issue and revoke keys per project. Control who can read your flag state.",
    },
    {
      title: "Authentication",
      desc: "Email and password sign-in with secure session management built in.",
    },
  ];

  return (
    <section id="features" class="py-20 px-6 border-t border-edge">
      <div class="max-w-2xl mx-auto">
        <h2 class="text-xs font-mono text-content-faint tracking-widest uppercase mb-12">
          What's included
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
          {features.map((f) => (
            <div key={f.title} class="border-l-2 border-accent/30 pl-4">
              <h3 class="text-sm font-medium text-content mb-1">{f.title}</h3>
              <p class="text-sm text-content-tertiary leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <section id="pricing" class="py-20 px-6 border-t border-edge">
      <div class="max-w-2xl mx-auto">
        <h2 class="text-xs font-mono text-content-faint tracking-widest uppercase mb-6">Pricing</h2>
        <p class="bg-accent-surface text-accent-text text-sm px-4 py-3 rounded-lg mb-8">
          <span class="font-semibold">Free during Beta</span> &mdash; all features are unlocked
          while we&rsquo;re in early access. Upgrading to Pro helps us keep the lights on.
        </p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free */}
          <div class="flex flex-col border border-edge rounded-xl p-6">
            <h3 class="text-sm font-medium text-content mb-1">Free</h3>
            <p class="text-2xl font-semibold text-content mb-1">
              $0
              <span class="text-sm font-normal text-content-tertiary"> / month</span>
            </p>
            <p class="text-xs text-content-faint mb-6">No credit card required.</p>
            <ul class="space-y-2 text-sm text-content-tertiary mb-8 flex-1">
              <li>Limited to 10 projects</li>
              <li>Unlimited Feature flags</li>
              <li>API keys access</li>
              <li>Community support</li>
            </ul>
            <Button variant="secondary" class="w-full justify-center" onClick={onGetStarted}>
              Get started
            </Button>
          </div>

          {/* Pro */}
          <div class="flex flex-col border border-edge rounded-xl p-6">
            <h3 class="text-sm font-medium text-content mb-1">Pro</h3>
            <p class="text-2xl font-semibold text-content mb-1">
              $5
              <span class="text-sm font-normal text-content-tertiary"> / month</span>
            </p>
            <p class="text-xs text-content-faint mb-6">Billed monthly. Cancel any time.</p>
            <ul class="space-y-2 text-sm text-content-tertiary mb-8 flex-1">
              <li>Everything in Free</li>
              <li>+ Unlimited Projects</li>
              <li>
                + Teams <span class="text-accent">(Coming soon...)</span>
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
    <section id="faq" class="py-20 px-6 border-t border-edge">
      <div class="max-w-2xl mx-auto">
        <h2 class="text-xs font-mono text-content-faint tracking-widest uppercase mb-12">FAQ</h2>
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
        class="w-full text-left py-4 flex items-start justify-between gap-4 group"
        onClick={() => (open.value = !open.value)}
      >
        <span class="text-sm font-medium text-content group-hover:text-content-secondary transition-colors">
          {question}
        </span>
        <span
          class={`text-content-faint mt-0.5 flex-shrink-0 transition-transform ${open.value ? "rotate-45" : ""}`}
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
      {open.value && <p class="pb-4 text-sm text-content-tertiary leading-relaxed">{answer}</p>}
    </div>
  );
}
