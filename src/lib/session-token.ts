import { createHash, randomBytes } from "node:crypto";

const SESSION_TOKEN_HASH_PREFIX = "sha256:";
const RAW_SESSION_TOKEN_PATTERN = /^[a-f0-9]{64}$/i;

export function newSessionToken() {
  return randomBytes(32).toString("hex");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function storedSessionToken(token: string) {
  return `${SESSION_TOKEN_HASH_PREFIX}${hashSessionToken(token)}`;
}

export function sessionTokenLookupCandidates(token: string) {
  const normalized = token.trim();

  if (!normalized) {
    return [];
  }

  const candidates = [storedSessionToken(normalized)];

  // Sessions created before token hashing stored the raw 64-char hex token.
  // Accept only that exact legacy shape so a leaked `sha256:...` database value
  // can never be replayed directly as a cookie.
  if (RAW_SESSION_TOKEN_PATTERN.test(normalized)) {
    candidates.push(normalized);
  }

  return candidates;
}

export function sessionTokenIsStoredHash(value: string) {
  return value.startsWith(SESSION_TOKEN_HASH_PREFIX) && /^[a-f0-9]{64}$/i.test(value.slice(SESSION_TOKEN_HASH_PREFIX.length));
}
