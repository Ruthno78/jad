import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JADSTACK LOTTO — Plateforme de gestion de loterie" },
      {
        name: "description",
        content:
          "Espace agents, compagnies et administration JADSTACK LOTTO : tirages, transactions, rapports et statistiques.",
      },
      { property: "og:title", content: "JADSTACK LOTTO — Plateforme de gestion de loterie" },
      {
        property: "og:description",
        content:
          "Espace agents, compagnies et administration JADSTACK LOTTO : tirages, transactions, rapports et statistiques.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  useEffect(() => {
    window.location.replace("/auth.html");
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground">JADSTACK LOTTO</h1>
        <p className="mt-2 text-sm text-muted-foreground">Ouverture de l'application…</p>
        <a
          href="/auth.html"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
        >
          Continuer
        </a>
      </div>
    </main>
  );
}
