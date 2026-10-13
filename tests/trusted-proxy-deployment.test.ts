import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("web container only accepts optional proxy secret via private runtime environment", () => {
  const compose = read("deploy/docker-compose.yml");
  const workflow = read(".github/workflows/deploy.yml");
  const example = read("deploy/.env.example");

  assert.match(compose, /AUTH_TRUSTED_PROXY_SECRET: \$\{AUTH_TRUSTED_PROXY_SECRET:-\}/);
  assert.match(workflow, /AUTH_TRUSTED_PROXY_SECRET: \$\{\{ secrets\.AUTH_TRUSTED_PROXY_SECRET \}\}/);
  assert.match(workflow, /write_env_value AUTH_TRUSTED_PROXY_SECRET/);
  assert.match(example, /^AUTH_TRUSTED_PROXY_SECRET=$/m);
  assert.doesNotMatch(compose, /NEXT_PUBLIC_AUTH_TRUSTED_PROXY_SECRET/);
});

test("login does not trust forwarding headers or a forgeable user agent directly", () => {
  const source = read("src/lib/auth-actions.ts");
  const verifier = read("src/lib/trusted-proxy-client.ts");
  const guide = read("docs/trusted-proxy-client-ip.md");

  assert.match(source, /verifiedProxyClientIdentifier\(await headers\(\)\)/);
  assert.doesNotMatch(source, /requestHeaders\.get\("(?:cf-connecting-ip|x-real-ip|x-forwarded-for|user-agent)"\)/);
  assert.match(source, /untrustedAccount: \{ limit: 8,/);
  assert.match(source, /\{ key: keys\.untrustedAccount, policy: policy\.untrustedAccount \}/);
  assert.match(verifier, /timingSafeEqual/);
  assert.match(verifier, /isIP\(address\)/);
  assert.match(guide, /proxy_set_header X-Terumbu-Client-IP \$remote_addr/);
  assert.match(guide, /proxy_set_header X-Terumbu-Proxy-Secret/);
});
