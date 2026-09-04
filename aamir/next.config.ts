import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Product images use a custom Sanity CDN loader (see sanityImageLoader), so
// Next's own image optimizer — and therefore remotePatterns — is unused.
const nextConfig: NextConfig = {};

export default withNextIntl(nextConfig);
