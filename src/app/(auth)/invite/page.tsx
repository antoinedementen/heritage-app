// Redirige vers /invite/[code] avec un marqueur vide
// La page [code] détecte "_" et affiche directement le formulaire de saisie
import { redirect } from "next/navigation";

export default function InviteRootPage() {
  redirect("/invite/_");
}

export const dynamic = "force-dynamic";
