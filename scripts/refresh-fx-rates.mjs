import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const SOURCE_URL = "https://api.frankfurter.dev/v2/rates?base=USD&quotes=EUR,IDR,JPY";
const OUTPUT_PATH = new URL("../src/data/fx-rates.json", import.meta.url);
const RATE_BOUNDS = { EUR: [0.2, 3], IDR: [4000, 50000], JPY: [50, 400] };

/** Fail closed on wrong base, duplicate/missing quotes, mixed dates and implausible responses. */
export function parseFrankfurterRates(rows, now = new Date()) {
  if (!Array.isArray(rows) || rows.length !== 3) {
    throw new Error("FX API must return exactly three supported currency rates");
  }

  const known = new Map();
  const dates = new Set();
  for (const row of rows) {
    const code = typeof row?.quote === "string" ? row.quote.toUpperCase() : "";
    if (row?.base?.toUpperCase() !== "USD" || !(code in RATE_BOUNDS) || known.has(code)) {
      throw new Error("FX API returned an unsupported, duplicate or mismatched currency");
    }
    const amount = row.rate;
    const [min, max] = RATE_BOUNDS[code];
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount < min || amount > max) {
      throw new Error(`FX rate for ${code} is missing or outside a defensive range`);
    }
    if (typeof row.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
      throw new Error("FX API returned an invalid observation date");
    }
    const timestamp = new Date(`${row.date}T00:00:00.000Z`);
    if (!Number.isFinite(timestamp.getTime()) || timestamp.toISOString().slice(0, 10) !== row.date ||
      timestamp.getTime() > now.getTime() || now.getTime() - timestamp.getTime() > 7 * 86400000) {
      throw new Error("FX observation date is invalid, future or stale");
    }
    known.set(code, amount);
    dates.add(row.date);
  }

  if (known.size !== 3 || dates.size !== 1) {
    throw new Error("FX quotes must share the same observation date");
  }

  return {
    asOf: [...dates][0],
    source: "Frankfurter (official-source blended reference rates)",
    usdRates: { USD: 1, EUR: known.get("EUR"), IDR: known.get("IDR"), JPY: known.get("JPY") }
  };
}

export async function refreshFxReference(fetchImpl = fetch, now = new Date()) {
  const result = await fetchImpl(SOURCE_URL, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000)
  });
  if (!result.ok) throw new Error(`FX API returned HTTP ${result.status}`);
  const rows = await result.json();
  return parseFrankfurterRates(rows, now);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  try {
    const validated = await refreshFxReference();
    await writeFile(OUTPUT_PATH, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
    process.stdout.write(`Validated FX reference ${validated.asOf} from ${validated.source}\n`);
  } catch (error) {
    process.stderr.write(`Refused FX refresh: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
