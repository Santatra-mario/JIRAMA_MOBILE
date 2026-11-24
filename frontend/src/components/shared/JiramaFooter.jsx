import { ExternalLink, Headset, MapPin, PhoneCall } from 'lucide-react';

/** Footer d'identification de l'agence — informations publiques répertoriées. */
export default function JiramaFooter() {
  return (
    <footer className="jr-jirama-footer relative z-10 border-t border-jr-bordure bg-jr-surface/90 px-4 py-4 backdrop-blur sm:px-6 lg:pl-72 lg:pr-8">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3 text-xs text-jr-faible sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-extrabold tracking-wide text-jr-titre">JIRAMA — Antsirabe</p>
          <p className="mt-0.5">Suivi des consommations d’eau et d’électricité · Madagascar</p>
          <p className="mt-1">Adresse répertoriée : Avenue de l’Indépendance, Andranomadio, Antsirabe 110, BP 36.</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <a href="https://www.google.com/maps/search/?api=1&query=JIRAMA+Antsirabe+Andranomadio" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-jr-doux hover:text-jr-lien">
            <MapPin size={14} /> Localisation <ExternalLink size={11} />
          </a>
          <a href="tel:+261204448311" className="inline-flex items-center gap-1.5 font-semibold text-jr-doux hover:text-jr-lien">
            <PhoneCall size={14} /> +261 20 44 483 11
          </a>
          <a href="tel:547" className="inline-flex items-center gap-1.5 font-semibold text-jr-doux hover:text-jr-lien" title="Numéro national gratuit de la JIRAMA">
            <Headset size={14} /> Assistance nationale : 547
          </a>
          <a href="https://www.jirama.mg/" target="_blank" rel="noreferrer" className="font-semibold text-jr-lien hover:underline">
            Site officiel JIRAMA <ExternalLink size={11} className="inline" />
          </a>
        </div>
        <p className="shrink-0 text-[10px] sm:text-right">© {new Date().getFullYear()} JIRAMA Antsirabe</p>
      </div>
    </footer>
  );
}
