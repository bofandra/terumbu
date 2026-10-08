/** Keep field evidence scoped to the campaign that supplied it, even for shared sites. */
export function impactSiteCampaignScopeKey(campaignId: string, impactSiteId: string) {
  return `${campaignId}:${impactSiteId}`;
}
