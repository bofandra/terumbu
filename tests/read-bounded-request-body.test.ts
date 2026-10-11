import assert from "node:assert/strict";
import test from "node:test";

import { readBoundedRequestBody, RequestBodyTooLargeError } from "../src/lib/read-bounded-request-body";

function stream(...chunks: Uint8Array[]) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    }
  });
}

test("a streamed UTF-8 webhook body is preserved even across multibyte chunk boundaries", async () => {
  const raw = '{"message":"terumbu 🪸"}';
  const encoded = new TextEncoder().encode(raw);
  const split = encoded.indexOf(0xf0) + 2;
  assert.equal(await readBoundedRequestBody(
    stream(encoded.subarray(0, split), encoded.subarray(split)), encoded.byteLength
  ), raw);
});

test("payloads at the byte limit pass; those over it are rejected even without content-length", async () => {
  const bytes = new TextEncoder().encode("x".repeat(64));
  assert.equal(await readBoundedRequestBody(stream(bytes), 64), "x".repeat(64));
  assert.equal(await readBoundedRequestBody(stream(bytes.subarray(0, 32), bytes.subarray(32)), 64),
    "x".repeat(64));
  let cancelled = false;
  const oversized = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes.subarray(0, 40));
      controller.enqueue(bytes.subarray(40));
    },
    cancel() {
      cancelled = true;
    }
  });
  await assert.rejects(() => readBoundedRequestBody(oversized, 63), RequestBodyTooLargeError);
  assert.equal(cancelled, true);
});

test("rejects a single oversized chunk and malformed UTF-8", async () => {
  await assert.rejects(() => readBoundedRequestBody(stream(new Uint8Array(65)), 64),
    RequestBodyTooLargeError);
  await assert.rejects(() => readBoundedRequestBody(stream(Uint8Array.from([0xff])), 64), TypeError);
});

test("handles a missing body and refuses an invalid size limit", async () => {
  assert.equal(await readBoundedRequestBody(null, 64), "");
  await assert.rejects(() => readBoundedRequestBody(null, 0), RangeError);
});
