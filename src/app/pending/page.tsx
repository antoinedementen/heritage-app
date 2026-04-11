import Link from "next/link";

export default function PendingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-heritage-cream px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-4xl font-semibold text-heritage-forest">
            Heritage
          </h1>
        </div>

        <div className="rounded-2xl bg-heritage-white p-8 shadow-[0_4px_24px_rgba(74,55,40,0.08)] border border-heritage-sand/40 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-heritage-gold/10 text-3xl">
            ⏳
          </div>
          <h2 className="font-serif text-2xl font-semibold text-heritage-dark mb-3">
            En attente d&apos;approbation
          </h2>
          <p className="text-sm text-heritage-brown leading-relaxed">
            Votre compte a bien été créé. Un administrateur doit approuver votre
            accès avant que vous puissiez vous connecter.
          </p>
          <p className="mt-3 text-sm text-heritage-brown">
            Vous recevrez un email dès que votre accès sera activé.
          </p>

          <div className="mt-8 flex flex-col gap-3 border-t border-heritage-sand pt-6">
            <Link
              href="/login"
              className="text-sm font-medium text-heritage-forest hover:underline"
            >
              ← Retour à la connexion
            </Link>
            <Link
              href="/invite"
              className="text-sm text-heritage-brown hover:text-heritage-dark"
            >
              Accéder en tant qu&apos;invité avec un code
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
