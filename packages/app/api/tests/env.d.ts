// Augment cloudflare:test so that `env` from `cloudflare:test` is typed with
// our actual Worker bindings.
declare module "cloudflare:test" {
  interface ProvidedEnv extends Cloudflare.Env {}
}
