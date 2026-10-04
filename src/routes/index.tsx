import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/small-ai" });
  },
  head: () => ({
    meta: [
      { title: "HerPattern Small AI Demo" },
      { name: "description", content: "Interactive demonstration of HerPattern's offline-capable personal-pattern AI." },
      { property: "og:title", content: "HerPattern Small AI Demo" },
      { property: "og:description", content: "Interactive demonstration of HerPattern's offline-capable personal-pattern AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});
