export type Bindings = Cloudflare.Env;

export type ApiKeyMeta = {
  projectId: string | null;
};

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
    meta: ApiKeyMeta | null;
  } | null;
};
