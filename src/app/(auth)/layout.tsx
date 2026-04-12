import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Heritage — Connexion",
    template: "%s · Heritage",
  },
  description: "Connectez-vous à Heritage pour accéder à l'arbre généalogique de votre famille.",
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
