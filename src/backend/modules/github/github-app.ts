import crypto from "node:crypto";
import { App, Octokit } from "octokit";

export interface GithubAppConfig {
  appId: string;
  privateKey: string;
  webhookSecret?: string;
}

const appId = process.env.GITHUB_APP_ID || "";
// Support multi-line private keys stored in .env with \n escapes
const privateKey = (process.env.GITHUB_APP_PRIVATE_KEY || "").replace(/\\n/g, "\n");
const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || "";

export const isGithubAppConfigured = Boolean(appId && privateKey);

/**
 * Initialized Octokit App instance
 */
export const githubApp: App | null = isGithubAppConfigured
  ? new App({
      appId,
      privateKey,
    })
  : null;

/**
 * Retrieves an installation Octokit client for a specific GitHub organization
 */
export async function getOrgOctokit(org: string): Promise<Octokit> {
  if (!githubApp) {
    throw new Error(
      "GitHub App is not configured. Please set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY in .env"
    );
  }

  const { data: installation } = await githubApp.octokit.rest.apps.getOrgInstallation({
    org,
  });

  return await githubApp.getInstallationOctokit(installation.id);
}

/**
 * Verifies GitHub webhook HMAC-SHA256 signature (X-Hub-Signature-256)
 */
export function verifyGithubWebhookSignature(
  rawBody: string | Buffer,
  signatureHeader: string,
  secret = webhookSecret
): boolean {
  if (!secret || !signatureHeader) return false;

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(rawBody);
  const digest = `sha256=${hmac.digest("hex")}`;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(digest),
      Buffer.from(signatureHeader)
    );
  } catch {
    return false;
  }
}
