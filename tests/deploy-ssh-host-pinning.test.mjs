import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";

const root = process.cwd();
const fixtureRoot = mkdtempSync(join(tmpdir(), "terumbu-pinned-ssh-"));
after(() => rmSync(fixtureRoot, { recursive: true, force: true }));
const serverKey = join(fixtureRoot, "test-server-host-key");
const generated = spawnSync("ssh-keygen", ["-q", "-t", "ed25519", "-N", "", "-f", serverKey], {
  encoding: "utf8"
});
assert.equal(generated.status, 0, generated.stderr || "OpenSSH test key generation failed");
const [keyType, keyData] = readFileSync(serverKey + ".pub", "utf8").trim().split(/\s+/);
assert.equal(keyType, "ssh-ed25519");
const serverHost = "vps.example.test";
const knownHost = serverHost + " " + keyType + " " + keyData;

function runSetup(overrides = {}) {
  const home = mkdtempSync(join(fixtureRoot, "home-"));
  const env = {
    ...process.env,
    HOME: home,
    VPS_HOST: serverHost,
    VPS_SSH_KNOWN_HOSTS: knownHost,
    ...overrides
  };
  const result = spawnSync("bash", ["scripts/prepare-pinned-ssh.sh"], {
    cwd: root, env, encoding: "utf8", timeout: 5000
  });
  return { home, result };
}

test("valid out-of-band Ed25519 pin produces a strict local SSH policy", () => {
  const { home, result } = runSetup();
  assert.equal(result.status, 0, result.stderr);
  const stored = readFileSync(join(home, ".ssh/known_hosts"), "utf8");
  assert.equal(stored, knownHost + "\n");
  const config = readFileSync(join(home, ".ssh/config"), "utf8");
  assert.match(config, /StrictHostKeyChecking yes/);
  assert.match(config, /GlobalKnownHostsFile \/dev\/null/);
  assert.match(config, /UpdateHostKeys no/);
  assert.match(config, /IdentitiesOnly yes/);
  assert.ok(!result.stdout.includes(keyData), "must not print pinned key");
});

test("missing, mismatched and malformed server host keys fail closed", () => {
  const invalid = [
    "",
    "attacker.example.test " + keyType + " " + keyData,
    "*.example.test " + keyType + " " + keyData,
    serverHost + " ssh-rsa " + keyData,
    serverHost + " ssh-ed25519 !!!",
    knownHost + "\n" + knownHost,
    knownHost + "\r",
    knownHost + " other-field"
  ];
  for (const candidate of invalid) {
    const { home, result } = runSetup({ VPS_SSH_KNOWN_HOSTS: candidate });
    assert.notEqual(result.status, 0, "unsafe host pin was accepted");
    assert.ok(!result.stdout.includes(keyData));
    assert.throws(() => readFileSync(join(home, ".ssh/config"), "utf8"));
  }
});

test("malformed VPS hostname is rejected before writing SSH trust configuration", () => {
  for (const host of ["", "evil host", "vps.example.test;id", "-vps.example.test", "vps:2222"]) {
    const { home, result } = runSetup({ VPS_HOST: host });
    assert.notEqual(result.status, 0, "unsafe VPS_HOST was accepted: " + host);
    assert.throws(() => readFileSync(join(home, ".ssh/config"), "utf8"));
  }
});

test("production workflow must not trust SSH keys discovered over the network", () => {
  const workflow = readFileSync(join(root, ".github/workflows/deploy.yml"), "utf8");
  assert.doesNotMatch(workflow, /ssh-keyscan/);
  assert.match(workflow, /VPS_SSH_KNOWN_HOSTS:\s*\$\{\{\s*secrets\.VPS_SSH_KNOWN_HOSTS\s*\}\}/);
  const setup = workflow.split("- name: Configure SSH")[1]?.split("- name: Render production env")[0];
  assert.ok(setup, "missing SSH setup job step");
  assert.match(setup, /bash scripts\/prepare-pinned-ssh\.sh/);
  assert.ok(setup.indexOf("bash scripts/prepare-pinned-ssh.sh") <
    setup.indexOf("terumbu_deploy_key"), "verify host pin before writing deploy private key");
  assert.match(workflow, /bash -n [^\n]*scripts\/prepare-pinned-ssh\.sh/);
});
