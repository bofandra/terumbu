import { getCampaignDetail } from "@/lib/queries";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://terumbu.eco";

export default async function Head({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const campaign = await getCampaignDetail(slug);

  if (!campaign) return null;

  const campaignUrl = new URL(`/campaigns/${campaign.slug}`, appUrl).toString();
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: campaign.title,
      description: campaign.summary,
      url: campaignUrl,
      primaryImageOfPage: campaign.imageUrl ? { "@type": "ImageObject", url: campaign.imageUrl } : undefined,
      about: { "@type": "Thing", name: campaign.category, description: campaign.summary },
      publisher: { "@type": "Organization", name: "Terumbu.eco", url: appUrl }
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: appUrl },
        { "@type": "ListItem", position: 2, name: "Campaigns", item: new URL("/campaigns", appUrl).toString() },
        { "@type": "ListItem", position: 3, name: campaign.title, item: campaignUrl }
      ]
    }
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
      />
    </>
  );
}
