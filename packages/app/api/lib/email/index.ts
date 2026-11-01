export type {
  EmailRuntime,
  OutboundEmail,
  SendEmailOutcome,
  TogglesEmailEnv,
  TogglesEmailProvider,
} from "./types";
export {
  hasCloudflareEmailBinding,
  isSmtpConfigured,
  parseSmtpSecure,
  resolveEmailFrom,
  resolveEmailProvider,
  validateSmtpConfig,
} from "./config";
export { sendEmail, shouldLoadSmtpModule } from "./send";
