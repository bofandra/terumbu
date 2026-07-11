export const expeditionDepartureStatuses = ["open", "waitlist", "full", "private_group", "cancelled"] as const;

export type ExpeditionDepartureStatus = (typeof expeditionDepartureStatuses)[number];

export type DepartureAvailabilityCode =
  | "bookable"
  | "minimum_not_reached"
  | "few_seats_left"
  | "full"
  | "waitlist"
  | "private_group"
  | "cancelled";

export function normalizeExpeditionDepartureStatus(value: unknown, fallback: ExpeditionDepartureStatus = "open"): ExpeditionDepartureStatus {
  const status = String(value ?? "").trim().toLowerCase();

  return expeditionDepartureStatuses.includes(status as ExpeditionDepartureStatus) ? (status as ExpeditionDepartureStatus) : fallback;
}

export function expeditionDepartureAvailability(
  departure: {
    status: unknown;
    capacity: number;
    seatsBooked: number;
    minParticipants?: number | null;
  },
  requestedParticipants = 1
) {
  const status = normalizeExpeditionDepartureStatus(departure.status);
  const capacity = Math.max(0, departure.capacity);
  const seatsBooked = Math.max(0, departure.seatsBooked);
  const availableSeats = Math.max(0, capacity - seatsBooked);
  const requestedSeats = Math.max(1, Math.round(requestedParticipants));
  const rawMinParticipants = departure.minParticipants ?? 1;
  const minParticipants = Number.isFinite(rawMinParticipants) ? Math.max(1, rawMinParticipants) : 1;

  if (status === "cancelled") {
    return {
      availableSeats,
      canBook: false,
      code: "cancelled" as const,
      label: "Cancelled",
      message: "This departure was cancelled by the operator."
    };
  }

  if (status === "private_group") {
    return {
      availableSeats,
      canBook: false,
      code: "private_group" as const,
      label: "Private group",
      message: "This departure is reserved for a private group request."
    };
  }

  if (status === "waitlist") {
    return {
      availableSeats,
      canBook: false,
      code: "waitlist" as const,
      label: "Waitlist",
      message: "This departure is collecting waitlist interest instead of confirmed bookings."
    };
  }

  if (status === "full" || availableSeats <= 0 || requestedSeats > availableSeats) {
    return {
      availableSeats,
      canBook: false,
      code: "full" as const,
      label: "Full",
      message: requestedSeats > availableSeats && availableSeats > 0 ? `Only ${availableSeats} seats remain for this departure.` : "This departure is full."
    };
  }

  if (availableSeats <= 4) {
    return {
      availableSeats,
      canBook: true,
      code: "few_seats_left" as const,
      label: "Few places left",
      message: `${availableSeats} seats remain for this departure.`
    };
  }

  if (seatsBooked + requestedSeats < minParticipants) {
    return {
      availableSeats,
      canBook: true,
      code: "minimum_not_reached" as const,
      label: "Minimum not yet reached",
      message: `This departure needs ${minParticipants} participants before final operator confirmation.`
    };
  }

  return {
    availableSeats,
    canBook: true,
    code: "bookable" as const,
    label: "Confirmed",
    message: "This departure is open for confirmed booking."
  };
}

export function departureStatusAfterSeatChange(status: unknown, capacity: number, nextSeatsBooked: number): ExpeditionDepartureStatus {
  const normalized = normalizeExpeditionDepartureStatus(status);
  const availableSeats = Math.max(0, capacity - Math.max(0, nextSeatsBooked));

  if (normalized === "open" && availableSeats <= 0) {
    return "full";
  }

  if (normalized === "full" && availableSeats > 0) {
    return "open";
  }

  return normalized;
}
