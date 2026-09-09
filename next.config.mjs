import { execSync } from "child_process";

function getGitCommit() {
  try {
    return execSync("git rev-parse HEAD").toString().trim();
  } catch {
    return "";
  }
}

const commitSha =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  getGitCommit() ||
  `build-${Date.now()}`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: commitSha,
    NEXT_PUBLIC_BUILD_TIME: String(Date.now()),
  },
  generateBuildId: async () => commitSha,
};

export default nextConfig;
