interface HeadElement {
  type: string;
  props: Record<string, string>;
}

interface HeadMeta {
  title: string;
  elements: Set<HeadElement>;
}

const HOME_DESCRIPTION =
  "Toggles lets you manage feature flags across your projects. Enable or disable features at runtime — no redeployment needed.";

const DOCS_DESCRIPTION =
  "API documentation for Toggles — manage feature flags, projects, and API keys over a simple REST API.";

const FAQ_ITEMS = [
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

function meta(name: string, content: string): HeadElement {
  return { type: "meta", props: { name, content } };
}

function og(property: string, content: string): HeadElement {
  return { type: "meta", props: { property, content } };
}

function jsonLd(data: unknown): HeadElement {
  return {
    type: "script",
    props: {
      type: "application/ld+json",
      children: JSON.stringify(data),
    },
  };
}

function faqJsonLd(): HeadElement {
  return jsonLd({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  });
}

export function getHeadMeta(url: string): HeadMeta {
  if (url === "/docs") {
    const title = "API Documentation — Toggles";
    return {
      title,
      elements: new Set([
        meta("description", DOCS_DESCRIPTION),
        og("og:title", title),
        og("og:description", DOCS_DESCRIPTION),
        og("og:type", "website"),
      ]),
    };
  }

  const title = "Toggles — Feature flags for your projects";
  return {
    title,
    elements: new Set([
      meta("description", HOME_DESCRIPTION),
      og("og:title", title),
      og("og:description", HOME_DESCRIPTION),
      og("og:type", "website"),
      faqJsonLd(),
    ]),
  };
}
