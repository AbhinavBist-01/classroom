import { createAuthClient } from "better-auth/react";

export interface UserSession {
  user: {
    id: string;
    name?: string | null;
    email: string;
    image?: string | null;
    role?: string;
  };
  session: {
    id: string;
    userId: string;
  };
}

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
});

export const { signIn, signOut } = authClient;

export function useSession(): {
  data: UserSession | null;
  isPending: boolean;
  error: unknown;
} {
  return authClient.useSession() as {
    data: UserSession | null;
    isPending: boolean;
    error: unknown;
  };
}
