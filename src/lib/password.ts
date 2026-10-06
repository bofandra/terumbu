import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const DUMMY_SALT = "0".repeat(32);
const DUMMY_HASH = scryptSync("terumbu-auth-dummy-password", DUMMY_SALT, 64).toString("hex");
const DUMMY_PASSWORD_HASH = `scrypt:${DUMMY_SALT}:${DUMMY_HASH}`;

export function createPasswordHash(password: string, salt = randomBytes(16).toString("hex")) {
  const hash = scryptSync(password, salt, 64).toString("hex");

  return `scrypt:${salt}:${hash}`;
}

function parsedPasswordHash(storedHash: string | null) {
  const candidate = storedHash ?? DUMMY_PASSWORD_HASH;
  const [scheme, salt, hash] = candidate.split(":");
  const valid = scheme === "scrypt" && Boolean(salt) && /^[a-f0-9]{128}$/i.test(hash ?? "");

  if (!valid) {
    const [, dummySalt, dummyHash] = DUMMY_PASSWORD_HASH.split(":");
    return { valid: false, salt: dummySalt, hash: dummyHash };
  }

  return { valid: Boolean(storedHash), salt, hash };
}

export function verifyPassword(password: string, storedHash: string | null) {
  const parsed = parsedPasswordHash(storedHash);
  const expected = Buffer.from(parsed.hash, "hex");
  const actual = scryptSync(password, parsed.salt, 64);
  const matches = expected.length === actual.length && timingSafeEqual(expected, actual);

  return parsed.valid && matches;
}
