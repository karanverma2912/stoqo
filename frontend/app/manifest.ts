import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Stoqo Inventory",
    short_name: "Stoqo",
    description: "Your stock, in a good place.",
    start_url: "/app",
    display: "standalone",
    background_color: "#f6f7f8",
    theme_color: "#c6f36b",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
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
