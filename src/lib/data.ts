export const navItems = [
  { label: "Donate", href: "/campaigns" },
  { label: "Explore", href: "/expeditions" },
  { label: "Academy", href: "/academy" },
  { label: "Impact Map", href: "/impact-map" }
];

export const impactStats = [
  { label: "Corals restored", value: "125,000", tone: "coral" },
  { label: "Mangroves planted", value: "85,000", tone: "kelp" },
  { label: "Ocean heroes", value: "12,500", tone: "ocean" },
  { label: "Raised for conservation", value: "Rp8.2B", tone: "sand" }
];

export const campaigns = [
  {
    slug: "restore-raja-ampat-reefs",
    title: "Restore Raja Ampat Reefs",
    category: "Coral Restoration",
    region: "Raja Ampat, Southwest Papua",
    summary:
      "Help local conservation teams plant and monitor 10,000 coral fragments across damaged reef zones.",
    imageUrl:
      "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?auto=format&fit=crop&w=1200&q=80",
    raised: 250_000_000,
    goal: 350_000_000,
    donors: 2350,
    daysLeft: 40,
    impact: "7,200 coral fragments funded",
    partner: "Yayasan Bahari Lestari",
    verification: "Field verified"
  },
  {
    slug: "mangrove-shield-bali",
    title: "Mangrove Shield for North Bali",
    category: "Mangrove Restoration",
    region: "Buleleng, Bali",
    summary:
      "Fund community nurseries, coastal planting days, and survival monitoring for a stronger shoreline.",
    imageUrl:
      "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1200&q=80",
    raised: 92_000_000,
    goal: 150_000_000,
    donors: 890,
    daysLeft: 25,
    impact: "18,400 mangrove seedlings prepared",
    partner: "Koperasi Pesisir Hijau",
    verification: "Document verified"
  },
  {
    slug: "cleanup-komodo-coast",
    title: "Cleanup Komodo Coastline",
    category: "Ocean Cleanup",
    region: "Labuan Bajo, East Nusa Tenggara",
    summary:
      "Support cleanup boats, waste sorting, and school education programs around island communities.",
    imageUrl:
      "https://images.unsplash.com/photo-1546026423-cc4642628d2b?auto=format&fit=crop&w=1200&q=80",
    raised: 63_000_000,
    goal: 100_000_000,
    donors: 510,
    daysLeft: 18,
    impact: "12 tons of plastic targeted",
    partner: "Komodo Ocean Watch",
    verification: "Basic verified"
  }
];

export const expeditions = [
  {
    slug: "raja-ampat-coral-restoration",
    title: "Raja Ampat Coral Restoration Expedition",
    region: "Raja Ampat",
    duration: "4 days / 3 nights",
    price: 2_500_000,
    rating: "4.9",
    imageUrl:
      "https://images.unsplash.com/photo-1546026423-cc4642628d2b?auto=format&fit=crop&w=1200&q=80",
    summary:
      "Plant coral fragments, join reef monitoring, and learn directly from local field teams."
  },
  {
    slug: "wakatobi-reef-monitoring",
    title: "Wakatobi Reef Monitoring Weekend",
    region: "Wakatobi",
    duration: "3 days / 2 nights",
    price: 1_850_000,
    rating: "4.8",
    imageUrl:
      "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?auto=format&fit=crop&w=1200&q=80",
    summary:
      "Practice reef survey basics, document restoration sites, and support community guides."
  }
];

export const courses = [
  {
    title: "Ocean Explorer",
    level: "Beginner",
    duration: "45 min",
    summary: "Coral basics, ocean threats, and how restoration projects are measured."
  },
  {
    title: "Coral Guardian",
    level: "Intermediate",
    duration: "2 hours",
    summary: "Restoration methods, monitoring indicators, and field safety preparation."
  },
  {
    title: "ESG for Coastal Conservation",
    level: "Professional",
    duration: "3 hours",
    summary: "How companies can fund, verify, and report nature-positive outcomes."
  }
];

export const impactSites = [
  {
    name: "Raja Ampat Reef Garden",
    type: "Coral",
    region: "Southwest Papua",
    progress: 72
  },
  {
    name: "North Bali Mangrove Belt",
    type: "Mangrove",
    region: "Bali",
    progress: 61
  },
  {
    name: "Komodo Cleanup Route",
    type: "Cleanup",
    region: "East Nusa Tenggara",
    progress: 48
  },
  {
    name: "Wakatobi Learning Hub",
    type: "Academy",
    region: "Southeast Sulawesi",
    progress: 84
  }
];

