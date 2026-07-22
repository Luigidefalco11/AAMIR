// Resilient config: when the Sanity project isn't wired up yet (no
// .env.local — e.g. before the owner runs `sanity init`), fall back to
// placeholder values so imports never crash the build. Fetchers degrade to
// empty/null (see queries.ts), and the UI shows placeholder content.
export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2024-10-01";

export const dataset =
  process.env.NEXT_PUBLIC_SANITY_DATASET || "production";

export const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "placeholder";

// True only when a real project id is configured.
export const isConfigured =
  Boolean(process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) &&
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID !== "placeholder";

if (!isConfigured && typeof window === "undefined") {
  console.warn(
    "[sanity] NEXT_PUBLIC_SANITY_PROJECT_ID not set — using placeholder; content will be empty until the CMS is configured.",
  );
}
