import { describe, expect, it } from "vitest";
import {
  billingSuccessRedirect,
  getAppOrigin,
  LOCAL_DEV_ORIGIN,
  polarCheckoutReturnUrl,
  polarCheckoutSuccessUrl,
} from "../lib/appOrigin";

describe("getAppOrigin", () => {
  it("uses APP_ORIGIN when set (hosted and self-host)", () => {
    expect(
      getAppOrigin({
        APP_ORIGIN: "https://flags.example.com/",
        LOCAL: "false",
        BETTER_AUTH_URL: "https://toggles.tinytown.studio",
      }),
    ).toBe("https://flags.example.com");
  });

  it("defaults to local dev origin when LOCAL=true and APP_ORIGIN is unset", () => {
    expect(
      getAppOrigin({
        LOCAL: "true",
        BETTER_AUTH_URL: "http://127.0.0.1:3000/api/auth",
      }),
    ).toBe(LOCAL_DEV_ORIGIN);
  });

  it("derives origin from BETTER_AUTH_URL when not local and APP_ORIGIN is unset", () => {
    expect(
      getAppOrigin({
        LOCAL: "false",
        BETTER_AUTH_URL: "https://app.example.com/api/auth",
      }),
    ).toBe("https://app.example.com");
  });

  it("falls back to local dev origin when BETTER_AUTH_URL is invalid", () => {
    expect(
      getAppOrigin({
        LOCAL: "false",
        BETTER_AUTH_URL: "not-a-valid-url",
      }),
    ).toBe(LOCAL_DEV_ORIGIN);
  });

  it("matches hosted wrangler defaults for CORS and trusted auth origins", () => {
    const hostedOrigin = "https://toggles.tinytown.studio";
    const origin = getAppOrigin({
      APP_ORIGIN: hostedOrigin,
      LOCAL: "false",
      BETTER_AUTH_URL: hostedOrigin,
    });
    expect(origin).toBe(hostedOrigin);
  });
});

describe("billing and Polar checkout URLs", () => {
  const env = {
    APP_ORIGIN: "https://app.example.com",
    LOCAL: "false",
    BETTER_AUTH_URL: "https://app.example.com/api/auth",
  };

  it("builds billing success redirect from app origin", () => {
    expect(billingSuccessRedirect(env)).toBe("https://app.example.com/app/billing?success=true");
  });

  it("builds Polar checkout success URL from app origin", () => {
    expect(polarCheckoutSuccessUrl(env)).toBe(
      "https://app.example.com/api/billing-success?checkout_id={CHECKOUT_ID}",
    );
  });

  it("builds Polar checkout return URL from app origin", () => {
    expect(polarCheckoutReturnUrl(env)).toBe("https://app.example.com/app/billing");
  });

  it("uses local dev origin for checkout URLs when env is unset except LOCAL", () => {
    const localEnv = { LOCAL: "true", BETTER_AUTH_URL: "http://localhost/api/auth" };
    expect(polarCheckoutSuccessUrl(localEnv)).toBe(
      `${LOCAL_DEV_ORIGIN}/api/billing-success?checkout_id={CHECKOUT_ID}`,
    );
  });
});
