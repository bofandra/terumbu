#!/usr/bin/env node

/**
 * Read-only merchant sandbox smoke probe.
 *
 * Set MIDTRANS_ENV=sandbox, MIDTRANS_SERVER_KEY, and
 * MIDTRANS_SANDBOX_ORDER_ID. Does not POST, charge, cancel, or refund funds.
 * Deliberately redacts provider order ID and all customer details.
 */
const env = process.env;
if (env.MIDTRANS_ENV !== "sandbox") {
  console.error("Refusing Midtrans smoke probe: MIDTRANS_ENV must explicitly equal sandbox.");
  process.exitCode = 2;
} else if (!env.MIDTRANS_SERVER_KEY || !env.MIDTRANS_SANDBOX_ORDER_ID ||
           !/^[A-Za-z0-9_-]{1,100}$/.test(env.MIDTRANS_SANDBOX_ORDER_ID)) {
  console.error("Set a sandbox server key and a valid sandbox order ID in environment variables.");
  process.exitCode = 2;
} else {
  const orderId = env.MIDTRANS_SANDBOX_ORDER_ID;
  const url = "https://api.sandbox.midtrans.com/v2/" + encodeURIComponent(orderId) + "/status";
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: "Basic " + Buffer.from(env.MIDTRANS_SERVER_KEY + ":").toString("base64"),
        Accept: "application/json"
      },
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) {
      console.error("Sandbox GET Status did not succeed (HTTP " + response.status + ").");
      process.exitCode = 1;
    } else {
      const body = await response.json();
      if (body.order_id !== orderId || typeof body.transaction_status !== "string") {
        console.error("Sandbox GET Status response is malformed or from a different order.");
        process.exitCode = 1;
      } else {
        // Never dump the raw response, server key, customer identity or order ID.
        console.log(JSON.stringify({
          environment: "sandbox",
          verifiedOrderMatch: true,
          providerTransactionStatus: body.transaction_status,
          refundEntries: Array.isArray(body.refunds) ? body.refunds.length : 0,
          bankAcknowledgmentSeen: Array.isArray(body.refunds) &&
            body.refunds.some(x => typeof x?.bank_confirmed_at === "string"),
          readOnly: true
        }, null, 2));
      }
    }
  } catch {
    console.error("Sandbox GET Status network or JSON check failed.");
    process.exitCode = 1;
  }
}
