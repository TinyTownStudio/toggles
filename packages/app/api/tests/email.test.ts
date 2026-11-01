import { describe, expect, it, vi } from "vitest";

const smtpModule = vi.hoisted(() => ({
  sendViaSmtp: vi.fn(),
}));

vi.mock("../lib/email/smtp.node.ts", () => smtpModule);

import {
  resolveEmailProvider,
  sendEmail,
  shouldLoadSmtpModule,
  validateSmtpConfig,
} from "../lib/email";

describe("resolveEmailProvider", () => {
  it("defaults to none on node when SMTP is unset", () => {
    expect(resolveEmailProvider({}, "node")).toBe("none");
  });

  it("defaults to cloudflare on worker when EMAIL binding is present", () => {
    expect(
      resolveEmailProvider({ EMAIL: { send: vi.fn() } as unknown as SendEmail }, "worker"),
    ).toBe("cloudflare");
  });

  it("defaults to none on worker without EMAIL binding", () => {
    expect(resolveEmailProvider({}, "worker")).toBe("none");
  });

  it("honors TOGGLES_EMAIL_PROVIDER=none", () => {
    expect(
      resolveEmailProvider(
        { TOGGLES_EMAIL_PROVIDER: "none", EMAIL: { send: vi.fn() } as unknown as SendEmail },
        "worker",
      ),
    ).toBe("none");
  });

  it("selects smtp on node when configured", () => {
    expect(
      resolveEmailProvider(
        {
          TOGGLES_EMAIL_PROVIDER: "smtp",
          TOGGLES_SMTP_HOST: "smtp.example.com",
          TOGGLES_SMTP_PORT: "587",
          TOGGLES_SMTP_USER: "user",
          TOGGLES_SMTP_PASSWORD: "pass",
        },
        "node",
      ),
    ).toBe("smtp");
  });

  it("does not select smtp on worker even when SMTP env is set", () => {
    expect(
      resolveEmailProvider(
        {
          TOGGLES_EMAIL_PROVIDER: "smtp",
          TOGGLES_SMTP_HOST: "smtp.example.com",
          TOGGLES_SMTP_PORT: "587",
          TOGGLES_SMTP_USER: "user",
          TOGGLES_SMTP_PASSWORD: "pass",
        },
        "worker",
      ),
    ).toBe("none");
  });

  it("treats unknown provider values as none", () => {
    expect(resolveEmailProvider({ TOGGLES_EMAIL_PROVIDER: "postmark" }, "node")).toBe("none");
  });
});

describe("validateSmtpConfig", () => {
  it("returns no errors for a complete configuration", () => {
    expect(
      validateSmtpConfig({
        TOGGLES_SMTP_HOST: "smtp.example.com",
        TOGGLES_SMTP_PORT: "587",
        TOGGLES_SMTP_USER: "user",
        TOGGLES_SMTP_PASSWORD: "secret",
      }),
    ).toEqual([]);
  });

  it("reports missing and invalid fields", () => {
    const errors = validateSmtpConfig({
      TOGGLES_SMTP_PORT: "99999",
      TOGGLES_SMTP_SECURE: "maybe",
    });
    expect(errors).toContain("TOGGLES_SMTP_HOST is required");
    expect(errors).toContain("TOGGLES_SMTP_USER is required");
    expect(errors).toContain("TOGGLES_SMTP_PASSWORD is required");
    expect(errors.some((e) => e.includes("TOGGLES_SMTP_PORT"))).toBe(true);
    expect(errors).toContain("TOGGLES_SMTP_SECURE must be true or false");
  });
});

describe("sendEmail disabled by default", () => {
  it("returns email_disabled without invoking SMTP on node", async () => {
    expect(shouldLoadSmtpModule({}, "node")).toBe(false);

    const result = await sendEmail(
      {},
      {
        to: "user@example.com",
        subject: "Hello",
        text: "Hi",
      },
      "node",
    );

    expect(result).toEqual({ ok: false, reason: "email_disabled" });
    expect(smtpModule.sendViaSmtp).not.toHaveBeenCalled();
  });

  it("does not call Cloudflare binding when disabled", async () => {
    const send = vi.fn();
    const result = await sendEmail(
      { EMAIL: { send } as unknown as SendEmail, TOGGLES_EMAIL_PROVIDER: "none" },
      { to: "user@example.com", subject: "Hello", text: "Hi" },
      "worker",
    );

    expect(result).toEqual({ ok: false, reason: "email_disabled" });
    expect(send).not.toHaveBeenCalled();
  });
});
