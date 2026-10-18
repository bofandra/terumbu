import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("expedition partner language choices are structured and remain multi-valued", () => {
  const source = readFileSync("src/components/partner-expedition-editor.tsx", "utf8");
  const action = readFileSync("src/lib/portal-actions.ts", "utf8");
  assert.match(source, /guideLanguageOptions = \[/);
  assert.match(source, /name="languages" type="checkbox"/);
  assert.match(source, /preservedLanguages/);
  assert.match(source, /Other guide language/);
  assert.match(action, /formLinesOrFallback\(formData, "languages", context\.currentMetadata\.languages\)/);
});

test("arrival suggestions reuse published managed destination hubs without auto-inventing hub values", () => {
  const query = readFileSync("src/lib/queries.ts", "utf8");
  const start = query.indexOf("export async function getDestinationOptions()");
  const end = query.indexOf("type ExpeditionCardsOptions", start);
  assert.ok(start >= 0 && end > start);
  const scope = query.slice(start, end);
  assert.match(scope, /arrivalHubs: destinations\.arrivalHubs/);
  assert.match(scope, /destinationArrivalHubs\(destination\.arrivalHubs\)/);
  const form = readFileSync("src/components/partner-expedition-editor.tsx", "utf8");
  assert.match(form, /arrivalHubSuggestions/);
  assert.match(form, /list="expedition-managed-arrival-hubs"/);
  assert.match(form, /defaultValue=\{detail\.travelInfo\.nearestAirport\}/);
  assert.match(form, /destinations\.find\(\(destination\) => destination\.id === expedition\.destinationId\)\?\.arrivalHubs \?\? \[\]/);
});
