import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             "IronTribe Pulse",
    short_name:       "PULSE",
    description:      "Track the habits that drive your progress",
    start_url:        "/",
    display:          "standalone",
    background_color: "#f4f4f5",
    theme_color:      "#2563eb",
    orientation:      "portrait",
    icons: [
      {
        src:   "/icon/192",
        sizes: "192x192",
        type:  "image/png",
      },
      {
        src:   "/icon/512",
        sizes: "512x512",
        type:  "image/png",
        purpose: "maskable",
      },
    ],
  };
}
