import { createAuthClient } from "better-auth/client";
import { apiKeyClient } from "better-auth/client/plugins";
import { API_BASE_URL } from "./constants";

export const authClient = createAuthClient({
	baseURL: API_BASE_URL,
	plugins:[apiKeyClient()]
});