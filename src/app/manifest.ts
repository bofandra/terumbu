import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Terumbu.eco",
    short_name: "Terumbu",
    description: "Conservation funding, expeditions, academy learning, and verified impact tracking.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f4ea",
    theme_color: "#07343f",
    icons: []
  };
}
