# Terumbu: verified client IP from a trusted reverse proxy

## Threat and default behavior

Authentication Server Actions previously trusted visitor-controlled `CF-Connecting-IP`,
`X-Real-IP` and the first `X-Forwarded-For` entry. A visitor that reached
the application origin directly could rotate these headers to evade the
per-client and account+client login and account-recovery quotas.

Now Terumbu **ignores all conventional forwarding headers** for auth throttling.
The only eligible IP is a single valid IPv4/IPv6 address supplied in the
`X-Terumbu-Client-IP` header **together with** a matching secret in
`X-Terumbu-Proxy-Secret`. These two headers must be set by the controlled
reverse proxy, overwriting client-supplied copies on every request.

**Without a verified proxy**, the request remains usable but is rate-limited
in a stable, hashed account-wide pool: 8 login attempts or 3 recovery or
verification requests per account per 15 minutes (in addition to the normal
account-wide cap). Spoofing any forwarding header or User-Agent does not
create new buckets. This intentionally trades away IP-level differentiation
for a safe default until the ingress is configured.

## Setting up trusted proxy mode

1. Generate a random 32-byte shared secret on a trusted machine using
   `openssl rand -hex 32`. Never commit it or send it in issue comments.
2. Store this value in GitHub Actions repository **secret**
   `AUTH_TRUSTED_PROXY_SECRET` for `bofandra/terumbu`. The manual release
   workflow forwards it to `terumbu-web` as a server-only environment variable.
3. Configure the **actual TLS-terminating Nginx instance** on the VPS to
   inject this exact same value, overwriting both headers from the client:

   ```nginx
   location / {
       proxy_pass http://127.0.0.1:3100;
       proxy_http_version 1.1;
       proxy_set_header Host $host;
       proxy_set_header X-Forwarded-Proto $scheme;
       proxy_set_header X-Terumbu-Client-IP $remote_addr;
       proxy_set_header X-Terumbu-Proxy-Secret "REPLACE_WITH_GENERATED_SECRET";
       # Optional regular headers cannot influence auth bucket selection.
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
   }
   ```

4. Ensure the Nginx config file containing the secret is readable only by
   authorized system administrators (with the permissions necessary for
   Nginx), test configuration using `nginx -t`, and reload Nginx.
5. Run a **manual** Terumbu release after CI and any required migrations.
   GitHub's merge-to-main flow does **not** automatically deploy.

The existing Docker Compose mapping exposes port 3100 on the host. This
change does not modify that mapping because existing deployments may use
direct access to port 3100; any client contacting it directly will lack
the secret and receive strict account-only throttling instead. For ingress
hardening, restrict public access to the app origin with host firewall/
loopback binding after confirming the actual proxy and network topology.
Do not accidentally disrupt other applications sharing the VPS.

### Cloudflare and additional trusted proxy hops

If Nginx receives traffic from Cloudflare, `$remote_addr` may be a
Cloudflare edge address, not the visitor IP. This is **not an auth bypass**,
but many users can share a client bucket. Only enable Nginx's real IP
replacement when `set_real_ip_from` explicitly lists the **current,
validated Cloudflare IPv4/IPv6 ranges**, and Nginx connectivity is restricted
to those trusted hops. Example directives (insert accurate managed CIDRs,
never a blanket `0.0.0.0/0` or `::/0`):

```nginx
# set_real_ip_from <verified Cloudflare CIDR>;
real_ip_header CF-Connecting-IP;
real_ip_recursive off;
```

When a new reverse proxy or CDN is introduced, review trusted hops again.
A direct origin request must never be able to inject an authenticated IP
without knowing the secret; rotate the secret if it leaks.

## Operational checks

- Confirm `AUTH_TRUSTED_PROXY_SECRET` exists on the web container **without
  printing its value**.
- Confirm direct requests with forged `X-Forwarded-For`, `X-Real-IP`,
  `CF-Connecting-IP` or `X-Terumbu-Client-IP` cannot change auth
  identity without the trusted proxy secret.
- Verify login, password recovery and verification continue to function.
  Users passing through a correctly configured proxy should have separate
  per-IP buckets, backed by the durable PostgreSQL `auth_rate_limit_buckets`
  table added in migration 0047.
- Monitor auth rate-limit errors and account lockout reports during rollout;
  do not log raw IPs, email addresses or the proxy secret.

No Midtrans payment flags, refund review records or financial transactions
are changed by this work. Refund SLA incident #132 needs separate review.
