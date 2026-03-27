/**
 * Vercel discovers serverless routes from the Git repository root.
 * The real handler lives under the-drillmaster-site; this file re-exports it
 * so /api/subscribe works when the Vercel project root is the repo root
 * (monorepo-style layout with a single app in `the-drillmaster-site/`).
 */
export { default } from '../the-drillmaster-site/api/subscribe.js';
