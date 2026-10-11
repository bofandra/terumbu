/**
 * Read a webhook body without buffering arbitrarily large unsigned input.
 * Signatures are checked against the exact UTF-8 text only after the byte limit.
 */
export class RequestBodyTooLargeError extends Error {
  constructor() {
    super("Request body exceeds the permitted size.");
    this.name = "RequestBodyTooLargeError";
  }
}

export async function readBoundedRequestBody(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number
): Promise<string> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new RangeError("maxBytes must be a positive safe integer");
  }
  if (!body) return "";

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let bytesRead = 0;
  let finished = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        finished = true;
        break;
      }
      if (value.byteLength > maxBytes - bytesRead) {
        throw new RequestBodyTooLargeError();
      }
      bytesRead += value.byteLength;
      chunks.push(value);
    }
  } finally {
    if (!finished) {
      // Stop consuming the connection when the limit is exceeded or a read fails.
      try {
        await reader.cancel();
      } catch {
        // The original read/limit error is the relevant one for the caller.
      }
    }
    reader.releaseLock();
  }

  const bytes = new Uint8Array(bytesRead);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  // Reject malformed UTF-8 rather than silently replacing signed bytes.
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}
