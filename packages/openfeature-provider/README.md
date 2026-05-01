# Toggles OpenFeature Provider

Internal OpenFeature server provider for evaluating Toggles feature flags.

## Install (workspace)

```bash
pnpm add @openfeature/server-sdk
```

## Usage

```ts
import { OpenFeature } from "@openfeature/server-sdk";
import { TogglesOpenFeatureProvider } from "@toggles/openfeature-provider";

await OpenFeature.setProviderAndWait(
  new TogglesOpenFeatureProvider({
    baseUrl: "https://toggles.tinytown.studio",
    projectId: "proj_01hz...",
    apiKey: "tgs_xxxxxxxxxxxxxxxxxxxxxxxx",
  }),
);

const client = OpenFeature.getClient();
const enabled = await client.getBooleanValue("new-checkout", false);
```
