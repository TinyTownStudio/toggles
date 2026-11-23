import { beforeEach, describe, expect, it, vi } from "vitest";
import * as emailLib from "../lib/email";
import { createInvitationToken, sendWorkspaceInvitationEmail } from "../lib/invitationEmail";

const inviteContent = {
  to: "invitee@example.com",
  inviterName: "Ada",
  workspaceName: "Acme",
  inviteUrl: "https://example.com/invite/abc",
};

describe("createInvitationToken", () => {
  it("returns a 64 character hex string", () => {
    const token = createInvitationToken();
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(createInvitationToken()).not.toBe(token);
  });
});

describe("sendWorkspaceInvitationEmail", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns emailed false when the provider is none", async () => {
    const sendEmailSpy = vi.spyOn(emailLib, "sendEmail");

    const result = await sendWorkspaceInvitationEmail({}, "worker", inviteContent);

    expect(result).toEqual({ emailed: false });
    expect(sendEmailSpy).not.toHaveBeenCalled();
  });

  it("returns emailed true when Cloudflare send succeeds", async () => {
    const sendEmailSpy = vi.spyOn(emailLib, "sendEmail").mockResolvedValue({
      ok: true,
      provider: "cloudflare",
    });

    const result = await sendWorkspaceInvitationEmail(
      {
        EMAIL: { send: vi.fn() } as unknown as SendEmail,
        TOGGLES_EMAIL_PROVIDER: "cloudflare",
      },
      "worker",
      inviteContent,
    );

    expect(result).toEqual({ emailed: true });
    expect(sendEmailSpy).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        to: inviteContent.to,
        subject: `${inviteContent.inviterName} invited you to ${inviteContent.workspaceName} on Toggles`,
        html: expect.stringContaining("Accept invitation"),
        text: expect.stringContaining(inviteContent.inviteUrl),
      }),
      "worker",
    );
  });

  it("returns emailed true when SMTP send succeeds on node", async () => {
    vi.spyOn(emailLib, "sendEmail").mockResolvedValue({ ok: true, provider: "smtp" });

    const result = await sendWorkspaceInvitationEmail(
      {
        TOGGLES_EMAIL_PROVIDER: "smtp",
        TOGGLES_SMTP_HOST: "smtp.example.com",
        TOGGLES_SMTP_PORT: "587",
        TOGGLES_SMTP_USER: "user",
        TOGGLES_SMTP_PASSWORD: "pass",
      },
      "node",
      inviteContent,
    );

    expect(result).toEqual({ emailed: true });
  });

  it("returns emailed false when sendEmail reports email_disabled", async () => {
    vi.spyOn(emailLib, "sendEmail").mockResolvedValue({ ok: false, reason: "email_disabled" });

    const result = await sendWorkspaceInvitationEmail(
      { EMAIL: { send: vi.fn() } as unknown as SendEmail, TOGGLES_EMAIL_PROVIDER: "cloudflare" },
      "worker",
      inviteContent,
    );

    expect(result).toEqual({ emailed: false });
  });

  it("throws when sendEmail fails", async () => {
    vi.spyOn(emailLib, "sendEmail").mockResolvedValue({
      ok: false,
      reason: "send_failed",
      message: "smtp down",
    });

    await expect(
      sendWorkspaceInvitationEmail(
        { EMAIL: { send: vi.fn() } as unknown as SendEmail, TOGGLES_EMAIL_PROVIDER: "cloudflare" },
        "worker",
        inviteContent,
      ),
    ).rejects.toThrow("smtp down");
  });

  it("throws a generic message when sendEmail fails without details", async () => {
    vi.spyOn(emailLib, "sendEmail").mockResolvedValue({
      ok: false,
      reason: "send_failed",
    });

    await expect(
      sendWorkspaceInvitationEmail(
        { EMAIL: { send: vi.fn() } as unknown as SendEmail, TOGGLES_EMAIL_PROVIDER: "cloudflare" },
        "worker",
        inviteContent,
      ),
    ).rejects.toThrow("Failed to send invitation email");
  });

  it("escapes HTML in invitation content", async () => {
    const sendEmailSpy = vi.spyOn(emailLib, "sendEmail").mockResolvedValue({
      ok: true,
      provider: "cloudflare",
    });

    await sendWorkspaceInvitationEmail(
      {
        EMAIL: { send: vi.fn() } as unknown as SendEmail,
        TOGGLES_EMAIL_PROVIDER: "cloudflare",
      },
      "worker",
      {
        ...inviteContent,
        inviterName: 'Eve & <script>alert("x")</script>',
        workspaceName: 'Team "Beta"',
        inviteUrl: "https://example.com/?q=1&x=2",
      },
    );

    const payload = sendEmailSpy.mock.calls[0]?.[1];
    expect(payload?.html).toContain("Eve &amp;");
    expect(payload?.html).not.toContain("<script>");
    expect(payload?.html).toContain("Team &quot;Beta&quot;");
    expect(payload?.text).toContain('Eve & <script>alert("x")</script>');
  });
});
