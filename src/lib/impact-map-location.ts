/**
 * Shared map rules used by the public map and its test suite.
 * Only actual coordinates in the Indonesia bounding box are mapped.
 * Never coerce null/missing coordinates to (0, 0).
 */
export function isIndonesianImpactSiteLocation(site: { latitude: number; longitude: number }): boolean {
  return Number.isFinite(site.latitude) && Number.isFinite(site.longitude)
    && site.latitude >= -11 && site.latitude <= 6
    && site.longitude >= 94 && site.longitude <= 142;
}

export function summarizeImpactSites<T extends { verifiedEvidenceCount: number }>(sites: readonly T[]) {
  return {
    withVerifiedEvidence: sites.filter((site) => site.verifiedEvidenceCount > 0).length,
    verifiedEvidenceCount: sites.reduce((total, site) => total + Math.max(0, site.verifiedEvidenceCount), 0)
  };
}

/**
 * Public geolocation must never expose exact positions by default.
 * No additional marker jitter is used: rounding produces stable approximate
 * positions that are consistent in maps, previews and server-rendered records.
 */
export type PublicLocationPrecision = "approximate" | "precise";

export function publicMapCoordinates(
  site: { latitude: number; longitude: number },
  precision: string | null | undefined
) {
  if (precision === "precise") return { latitude: site.latitude, longitude: site.longitude };
  return {
    latitude: Math.round(site.latitude * 10) / 10,
    longitude: Math.round(site.longitude * 10) / 10
  };
}
