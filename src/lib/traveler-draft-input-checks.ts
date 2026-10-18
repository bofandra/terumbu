export type TravelerDraftCheck = {
  id: string;
  label: string;
  ready: boolean;
};

function hasText(formData: FormData, key: string) {
  return formData.getAll(key).some((value) => typeof value === "string" && value.trim().length > 0);
}

/** Hints only: authoritative publication checks always run on saved server records. */
export function travelerDraftInputChecks(formData: FormData): TravelerDraftCheck[] {
  return [
    { id: "languages", label: "Guide languages", ready: hasText(formData, "languages") },
    { id: "requirements", label: "Participant requirements", ready: hasText(formData, "requirements") },
    {
      id: "safety",
      label: "Safety and emergency plan",
      ready: hasText(formData, "safety") && hasText(formData, "emergencyPlanSummary")
    },
    {
      id: "itinerary",
      label: "Day-by-day itinerary",
      ready: hasText(formData, "itineraryDayTitle") || hasText(formData, "itineraryActivities")
    },
    {
      id: "accommodation",
      label: "Accommodation details",
      ready: (hasText(formData, "accommodationName") || hasText(formData, "accommodationType")) &&
        hasText(formData, "accommodationDetails")
    },
    {
      id: "arrival",
      label: "Meeting point and arrival",
      ready: hasText(formData, "travelMeetingPoint") &&
        hasText(formData, "travelNearestAirport") &&
        hasText(formData, "travelArrivalGuidance")
    },
    {
      id: "internationalTravel",
      label: "International travel guidance",
      ready: hasText(formData, "travelVisaGuidance") &&
        hasText(formData, "travelInsuranceGuidance") &&
        hasText(formData, "travelLocalTimeZone")
    },
    { id: "packing", label: "Packing essentials", ready: hasText(formData, "travelPackingHighlights") },
    {
      id: "cancellation",
      label: "Cancellation terms",
      ready: hasText(formData, "cancellationLabel") || hasText(formData, "cancellationRefund")
    }
  ];
}
