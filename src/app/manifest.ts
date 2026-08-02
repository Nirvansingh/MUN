import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MUN Research Hub",
    short_name: "MUN Hub",
    description:
      "Comprehensive research library for Model United Nations delegates — country battle cards, resolutions, speeches, and more.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#111318",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
