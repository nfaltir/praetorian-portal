"use client";

import { createAuthClient } from "better-auth/react";
import { twoFactorClient, usernameClient } from "better-auth/client/plugins";

/* Same origin, so no baseURL needed. */
export const authClient = createAuthClient({
  plugins: [usernameClient(), twoFactorClient()],
});
