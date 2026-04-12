import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import { AuthProvider } from "@/providers/auth-provider";
import { QueryProvider } from "@/providers/query-provider";
import { ToastProvider } from "@/providers/toast-provider";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  title: {
    default: "Heritage — Votre généalogie familiale",
    template: "%s · Heritage",
  },
  description: "Construisez, enrichissez et partagez votre arbre généalogique en famille — avec photos, événements, lieux et documents.",
  keywords: ["généalogie", "arbre généalogique", "famille", "histoire familiale", "heritage"],
  authors: [{ name: "Heritage" }],
  creator: "Heritage",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Heritage",
    title: "Heritage — Votre généalogie familiale",
    description: "Préservez et partagez l'histoire de votre famille.",
  },
  twitter: {
    card: "summary",
    title: "Heritage — Votre généalogie familiale",
    description: "Préservez et partagez l'histoire de votre famille.",
  },
  robots: {
    index: false, // Private family app — don't index
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${dmSans.variable} ${playfairDisplay.variable} h-full`}
    >
      <body className="min-h-full bg-heritage-cream text-heritage-dark antialiased">
        <QueryProvider>
          <AuthProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
