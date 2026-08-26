import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const naam = process.env.NEXT_PUBLIC_DEMO ? "Libreo (demo)" : "Libreo";
  return {
    name: naam,
    short_name: "Libreo",
    description: "Rapportage over persoonlijke financiën",
    start_url: "/",
    display: "standalone",
    background_color: "#fcfcfb",
    theme_color: "#fcfcfb",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/apple-icon.png", type: "image/png", sizes: "180x180" },
    ],
  };
}
