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
