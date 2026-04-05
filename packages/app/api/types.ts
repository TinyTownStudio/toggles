export type Bindings = Cloudflare.Env;

export type Variables = {
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
  } | null;
  apiKeyData: {
    userId: string;
    permissions: Record<string, string[]> | null;
  } | null;
};
