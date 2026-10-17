import assert from "node:assert/strict";
import test from "node:test";
import { bookingChangeQuote, canPrepareBooking, participantNames } from "../src/lib/expedition-travel";
import { expeditionDepartureMatchesSearch, parseExpeditionSearchFilters, validTravelDate,
  expeditionMatchesMarketplaceFilters, buildDefaultExpeditionMarketplaceMetadata } from "../src/lib/expedition-marketplace";

test("date and party search require the same open departure to fit the whole trip and remaining inventory", () => {
  const now = new Date("2026-10-17T00:00:00Z");
  const departure = { startsAt: new Date("2026-11-01T08:00:00Z"), endsAt: new Date("2026-11-05T08:00:00Z"),
    status: "open", capacity: 8, seatsBooked: 3, heldSeats: 2 };
  const filters = { dateFrom: "2026-11-01", dateTo: "2026-11-05", participants: 3 };
  assert.equal(expeditionDepartureMatchesSearch(departure, filters, now), true);
  assert.equal(expeditionDepartureMatchesSearch(departure, { ...filters, participants: 4 }, now), false);
  assert.equal(expeditionDepartureMatchesSearch(departure, { ...filters, dateTo: "2026-11-04" }, now), false);
  assert.equal(expeditionDepartureMatchesSearch({ ...departure, status: "waitlist" }, filters, now), false);
  assert.equal(expeditionDepartureMatchesSearch(departure, filters, new Date("2026-11-02")), false);
});

test("calendar date parsing rejects impossible dates, unbounded group sizes and non-finite budgets", () => {
  assert.equal(validTravelDate("2026-02-30"), undefined);
  assert.equal(validTravelDate("2028-02-29"), "2028-02-29");
  const filters = parseExpeditionSearchFilters({ participants: "1.5", dateFrom: "bad", maxPrice: "Infinity", budgetCurrency: "XXX" });
  assert.equal(filters.participants, undefined);
  assert.equal(filters.maxPrice, undefined);
  assert.equal(filters.dateFrom, undefined);
  assert.equal(filters.budgetCurrency, undefined);
});

test("budget comparisons preserve canonical prices and convert only known display currencies", () => {
  const card = { title: "Reef", summary: "Reef", region: "Bali", availabilityLabel: "Available", price: 100, currency: "USD",
    marketplace: buildDefaultExpeditionMarketplaceMetadata({ region: "Bali", durationDays: 2, summary: "Reef" }) };
  assert.equal(expeditionMatchesMarketplaceFilters(card, { maxPrice: 100, budgetCurrency: "USD" }), true);
  assert.equal(expeditionMatchesMarketplaceFilters(card, { maxPrice: 99, budgetCurrency: "USD" }), false);
  assert.equal(expeditionMatchesMarketplaceFilters({ ...card, currency: "XXX" }, { maxPrice: 999 }), false);
  assert.equal(card.price, 100);
});

test("booking change quotes use the historical paid unit price and round currency amounts once", () => {
  assert.deepEqual(bookingChangeQuote("100.00", 2, 3), { total: 150, difference: 50 });
  assert.deepEqual(bookingChangeQuote("100.00", 3, 2), { total: 66.67, difference: -33.33 });
  assert.deepEqual(bookingChangeQuote("100.00", 2, 2), { total: 100, difference: 0 });
  assert.deepEqual(bookingChangeQuote("66.67", 2, 3, 100 / 3), { total: 100, difference: 33.33 });
  assert.throws(() => bookingChangeQuote(100, 0, 2));
  assert.throws(() => bookingChangeQuote(100, 2, 13));
});

test("participant changes cannot create unnamed or incorrectly counted travelers", () => {
  assert.deepEqual(participantNames(" Ada Lovelace \n\n Grace Hopper ", 2), ["Ada Lovelace", "Grace Hopper"]);
  assert.throws(() => participantNames("Ada", 2));
  assert.throws(() => participantNames("A", 1));
});

test("preparation and booking changes close when departure starts or payment/booking is reversed", () => {
  const starts = new Date("2026-11-01");
  const now = new Date("2026-10-17");
  assert.equal(canPrepareBooking({ status: "confirmed", paymentStatus: "paid" }, starts, now), true);
  assert.equal(canPrepareBooking({ status: "confirmed", paymentStatus: "paid" }, starts, starts), false);
  assert.equal(canPrepareBooking({ status: "cancelled", paymentStatus: "paid" }, starts, now), false);
  assert.equal(canPrepareBooking({ status: "confirmed", paymentStatus: "refunded" }, starts, now), false);
});
