import type { MetadataRoute } from "next";

// Lets phones install Kape Lokal from the browser ("Add to Home Screen" /
// "Install app"). It then opens full screen, like an app. The start page sends
// visitors to their language, as the website does.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Kape Lokal",
    short_name: "Kape Lokal",
    description: "Find local specialty coffee and matcha cafes near you in Iloilo City.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#1a1411",
    theme_color: "#1a1411",
    categories: ["food", "lifestyle", "travel"],
    icons: [
      { src: "/app-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
