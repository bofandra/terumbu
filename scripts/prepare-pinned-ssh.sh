#!/usr/bin/env bash
# Fail closed before loading a private deploy key or contacting the VPS.
# VPS_SSH_KNOWN_HOSTS must be independently verified out of band and stored
# as an access-controlled GitHub production environment secret.
set -euo pipefail

fail() {
  echo "Production SSH host verification rejected: $1" >&2
  exit 1
}

[[ -n "$HOME" && -d "$HOME" ]] || fail "runner home is missing"
[[ "$VPS_HOST" =~ ^[A-Za-z0-9][A-Za-z0-9.-]{0,252}$ ]] ||
  fail "VPS_HOST must be a plain DNS hostname or IPv4 address"
[[ -n "$VPS_SSH_KNOWN_HOSTS" ]] ||
  fail "VPS_SSH_KNOWN_HOSTS must be configured with the verified public host key"
[[ "$VPS_SSH_KNOWN_HOSTS" != *$'\n'* && "$VPS_SSH_KNOWN_HOSTS" != *$'\r'* ]] ||
  fail "exactly one pinned host entry is required"

read -r pinned_host key_type key_data extra <<< "$VPS_SSH_KNOWN_HOSTS"
[[ "$pinned_host" == "$VPS_HOST" ]] ||
  fail "pinned hostname does not match VPS_HOST"
[[ "$key_type" == "ssh-ed25519" ]] ||
  fail "only Ed25519 pinned server host keys are accepted"
[[ "$key_data" =~ ^[A-Za-z0-9+/]+={0,2}$ && -z "$extra" ]] ||
  fail "invalid known_hosts entry"

command -v ssh-keygen >/dev/null 2>&1 || fail "ssh-keygen is required"
umask 077
ssh_dir="$HOME/.ssh"
install -d -m 700 "$ssh_dir"
tmp_file="$(mktemp "$ssh_dir/known_hosts.XXXXXXXX")"
trap 'rm -f "$tmp_file"' EXIT
printf '%s\n' "$VPS_SSH_KNOWN_HOSTS" > "$tmp_file"
ssh-keygen -lf "$tmp_file" >/dev/null 2>&1 ||
  fail "pinned public key cannot be parsed by OpenSSH"
ssh-keygen -F "$VPS_HOST" -f "$tmp_file" >/dev/null 2>&1 ||
  fail "pinned host cannot be found in known_hosts"
mv -f "$tmp_file" "$ssh_dir/known_hosts"
chmod 600 "$ssh_dir/known_hosts"
cat > "$ssh_dir/config" <<'SSH_CONFIG'
Host *
  StrictHostKeyChecking yes
  UserKnownHostsFile ~/.ssh/known_hosts
  GlobalKnownHostsFile /dev/null
  UpdateHostKeys no
  IdentitiesOnly yes
SSH_CONFIG
chmod 600 "$ssh_dir/config"
echo "Pinned production SSH host identity configured (no network key discovery)."
