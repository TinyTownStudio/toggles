import { beforeEach, describe, expect, it, vi } from "vitest";

const smtpModule = vi.hoisted(() => ({
  sendViaSmtp: vi.fn(),
}));

vi.mock("../lib/email/smtp.node.ts", () => smtpModule);

import {
  parseSmtpSecure,
  resolveEmailFrom,
  resolveEmailProvider,
  sendEmail,
  shouldLoadSmtpModule,
  validateSmtpConfig,
} from "../lib/email";
import { sendViaCloudflare } from "../lib/email/sendCloudflare";

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
    expect(resolveEmailProvider({ TOGGLES_EMAIL_PROVIDER: "not-a-provider" }, "node")).toBe("none");
  });

  it("returns none for explicit cloudflare without an EMAIL binding", () => {
    expect(resolveEmailProvider({ TOGGLES_EMAIL_PROVIDER: "cloudflare" }, "worker")).toBe("none");
  });
});

describe("resolveEmailFrom", () => {
  it("uses localhost defaults when unset", () => {
    expect(resolveEmailFrom({})).toEqual({
      address: "noreply@localhost",
      name: "Toggles",
    });
  });

  it("trims custom from address and name", () => {
    expect(
      resolveEmailFrom({
        TOGGLES_EMAIL_FROM: "  alerts@example.com ",
        TOGGLES_EMAIL_FROM_NAME: "  Alerts ",
      }),
    ).toEqual({
      address: "alerts@example.com",
      name: "Alerts",
    });
  });
});

describe("parseSmtpSecure", () => {
  it("defaults secure to true when port is 465", () => {
    expect(parseSmtpSecure({ TOGGLES_SMTP_PORT: "465" })).toBe(true);
  });

  it("defaults secure to false for non-465 ports", () => {
    expect(parseSmtpSecure({ TOGGLES_SMTP_PORT: "587" })).toBe(false);
  });

  it("parses explicit secure flags", () => {
    expect(parseSmtpSecure({ TOGGLES_SMTP_PORT: "587", TOGGLES_SMTP_SECURE: "false" })).toBe(false);
    expect(parseSmtpSecure({ TOGGLES_SMTP_PORT: "587", TOGGLES_SMTP_SECURE: "1" })).toBe(true);
    expect(parseSmtpSecure({ TOGGLES_SMTP_PORT: "587", TOGGLES_SMTP_SECURE: "yes" })).toBe(true);
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

describe("sendEmail delivery paths", () => {
  const smtpEnv = {
    TOGGLES_EMAIL_PROVIDER: "smtp",
    TOGGLES_SMTP_HOST: "smtp.example.com",
    TOGGLES_SMTP_PORT: "587",
    TOGGLES_SMTP_USER: "user",
    TOGGLES_SMTP_PASSWORD: "pass",
  };

  beforeEach(() => {
    smtpModule.sendViaSmtp.mockReset();
  });

  it("sends via Cloudflare EMAIL binding", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const result = await sendEmail(
      { EMAIL: { send } as unknown as SendEmail, TOGGLES_EMAIL_PROVIDER: "cloudflare" },
      { to: "user@example.com", subject: "Hello", text: "Hi" },
      "worker",
    );

    expect(result).toEqual({ ok: true, provider: "cloudflare" });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@example.com",
        subject: "Hello",
        text: "Hi",
      }),
    );
  });

  it("sends via SMTP on node when configured", async () => {
    smtpModule.sendViaSmtp.mockResolvedValue(undefined);

    const result = await sendEmail(
      smtpEnv,
      { to: "user@example.com", subject: "Hello", text: "Hi" },
      "node",
    );

    expect(result).toEqual({ ok: true, provider: "smtp" });
    expect(smtpModule.sendViaSmtp).toHaveBeenCalled();
  });

  it("returns send_failed when the provider throws", async () => {
    const send = vi.fn().mockRejectedValue(new Error("smtp down"));
    const result = await sendEmail(
      { EMAIL: { send } as unknown as SendEmail, TOGGLES_EMAIL_PROVIDER: "cloudflare" },
      { to: "user@example.com", subject: "Hello", text: "Hi" },
      "worker",
    );

    expect(result).toEqual({ ok: false, reason: "send_failed", message: "smtp down" });
  });

  it("uses a generic message when the thrown value is not an Error", async () => {
    smtpModule.sendViaSmtp.mockRejectedValue("nope");

    const result = await sendEmail(
      smtpEnv,
      { to: "user@example.com", subject: "Hello", text: "Hi" },
      "node",
    );

    expect(result).toEqual({ ok: false, reason: "send_failed", message: "Email send failed" });
  });
});

describe("sendViaCloudflare", () => {
  it("throws when the EMAIL binding is missing", async () => {
    await expect(
      sendViaCloudflare({}, { to: "user@example.com", subject: "Hi", text: "Hello" }),
    ).rejects.toThrow("Cloudflare Email binding is not configured");
  });

  it("passes resolved from headers to the binding", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    await sendViaCloudflare(
      {
        EMAIL: { send } as unknown as SendEmail,
        TOGGLES_EMAIL_FROM: "team@example.com",
        TOGGLES_EMAIL_FROM_NAME: "Team",
      },
      { to: "user@example.com", subject: "Subject", text: "Body", html: "<p>Body</p>" },
    );

    expect(send).toHaveBeenCalledWith({
      from: { email: "team@example.com", name: "Team" },
      to: "user@example.com",
      subject: "Subject",
      text: "Body",
      html: "<p>Body</p>",
    });
  });
});
