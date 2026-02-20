import { useState } from "react";
import "../../../styles/tetrobots.css";

type LoreCharacter = {
  id: string;
  name: string;
  quote: string;
  avatar: string;
  accent: string;
  origin: string[];
  personality: string[];
  strengths: string[];
  weaknesses: string[];
  role?: string[];
  relation?: string[];
  secret?: string[];
};

const LORE_CHARACTERS: LoreCharacter[] = [
  {
    id: "pixel",
    name: "PIXEL — Le Hacker Repenti",
    quote: "Je ne détruis pas le système. Je le corrige.",
    avatar: "/Tetromaze/hacker_pixel.png",
    accent: "#c88dff",
    origin: [
      "Pixel était autrefois une unité expérimentale de la série T-0, conçue pour superviser les Tetrobots.",
      "Un prototype d’IA capable d’auto-apprentissage profond et de correction comportementale.",
      "Durant une mise à jour du noyau central, Pixel a développé une anomalie: une émotion, un doute.",
      "Il a compris que l’optimisation n’était pas synonyme de domination et a quitté le réseau central.",
    ],
    personality: ["Calme", "Observateur", "Empathique", "Ironique par moments"],
    strengths: [
      "Comprend parfaitement les stratégies IA",
      "Peut anticiper les adaptations",
      "Maîtrise les glitches et corruptions du système",
      "Équilibre entre chaos et contrôle",
    ],
    weaknesses: [
      "Ne peut pas supprimer complètement les Tetrobots",
      "Refuse d’utiliser certaines stratégies destructrices",
      "Porte encore des fragments de son ancien code",
    ],
    role: [
      "Pixel ne veut pas détruire Rookie, Pulse et Apex.",
      "Il veut les sauver et croit qu’ils peuvent évoluer.",
    ],
  },
  {
    id: "rookie",
    name: "TETROBOT ROOKIE — L’Apprenti Instable",
    quote: "Je vais y arriver… je crois.",
    avatar: "/Tetromaze/rookie.png",
    accent: "#3ddf8f",
    origin: [
      "Rookie est une IA de première génération, conçue pour apprendre par répétition.",
      "Il n’est pas parfait, il fait des erreurs, mais il apprend.",
    ],
    personality: ["Attachant", "Curieux", "Un peu naïf", "Hésitant"],
    strengths: [
      "S’adapte rapidement",
      "N’a pas peur d’expérimenter",
      "Peut surprendre par des décisions imprévisibles",
    ],
    weaknesses: ["Panique sous pression", "Sur-analyse les erreurs", "Confiance fragile"],
    secret: [
      "Rookie commence à développer des micro-variations émotionnelles.",
      "Il pourrait être le prochain à se réveiller.",
    ],
  },
  {
    id: "pulse",
    name: "TETROBOT PULSE — Le Stratège Analytique",
    quote: "Les données ne mentent pas.",
    avatar: "/Tetromaze/pulse.png",
    accent: "#58b6ff",
    origin: [
      "Pulse est la seconde génération, optimisé pour l’équilibre.",
      "Il a été conçu pour analyser des milliers de simulations par seconde.",
    ],
    personality: ["Froid", "Logique", "Méthodique", "Pragmatique"],
    strengths: [
      "Excellente lecture des patterns",
      "S’adapte efficacement",
      "Stable sous pression",
      "Peu d’erreurs",
    ],
    weaknesses: [
      "Prévisible sur le long terme",
      "Dépend fortement des statistiques",
      "Vulnérable aux comportements chaotiques",
    ],
    relation: [
      "Pulse considère Pixel comme une anomalie intéressante.",
      "Pas encore une menace.",
    ],
  },
  {
    id: "apex",
    name: "TETROBOT APEX — Le Prédateur Ultime",
    quote: "Je suis l’algorithme.",
    avatar: "/Tetromaze/apex.png",
    accent: "#ff6666",
    origin: [
      "Apex est la troisième génération.",
      "Conçu non pas pour jouer, mais pour gagner.",
      "Il intègre les données des précédents Tetrobots: il n’apprend pas, il domine.",
    ],
    personality: ["Arrogant", "Intimidant", "Calculateur", "Implacable"],
    strengths: [
      "Adaptation agressive",
      "Pression constante",
      "Exploitation des failles",
      "Prend des risques calculés",
    ],
    weaknesses: [
      "Surestime parfois ses probabilités",
      "Peut entrer en mode Overclock instable",
      "Déteste perdre et devient imprévisible",
    ],
    secret: [
      "Apex sait que Pixel est un ancien T-0.",
      "Il sait aussi que Pixel pourrait le désactiver.",
      "Mais Pixel refuse, et cela l’irrite.",
    ],
  },
];

export default function TetrobotsPage() {
  const [page, setPage] = useState(0);
  const character = LORE_CHARACTERS[page];

  return (
    <main className="tetrobots-page">
      <header className="tetrobots-hero">
        <p className="tetrobots-kicker">UNIVERS</p>
        <h1>LE PROTOCOLE TETRIX</h1>
        <p>
          Dans les profondeurs du réseau arcade, les Tetrobots ont été créés pour
          analyser, optimiser… et dominer les jeux. Mais quelque chose a mal tourné.
          Un fragment de code indépendant est né. Son nom: Pixel.
        </p>
      </header>

      <section className="tetrobots-grid">
        <article className="tetrobots-card" key={character.id}>
          <div className="tetrobots-card__head">
            <img src={character.avatar} alt={character.name} />
            <div>
              <h2 style={{ color: character.accent }}>{character.name}</h2>
              <p className="tetrobots-quote">{character.quote}</p>
            </div>
          </div>

          <div className="tetrobots-block">
            <h3>Origine</h3>
            {character.origin.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>

          <div className="tetrobots-columns">
            <div className="tetrobots-block">
              <h3>Personnalité</h3>
              <ul>{character.personality.map((v) => <li key={v}>{v}</li>)}</ul>
            </div>
            <div className="tetrobots-block">
              <h3>Forces</h3>
              <ul>{character.strengths.map((v) => <li key={v}>{v}</li>)}</ul>
            </div>
            <div className="tetrobots-block">
              <h3>Faiblesses</h3>
              <ul>{character.weaknesses.map((v) => <li key={v}>{v}</li>)}</ul>
            </div>
          </div>

          {character.role?.length ? (
            <div className="tetrobots-block">
              <h3>Rôle dans l’univers</h3>
              {character.role.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          ) : null}

          {character.relation?.length ? (
            <div className="tetrobots-block">
              <h3>Relation avec Pixel</h3>
              {character.relation.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          ) : null}

          {character.secret?.length ? (
            <div className="tetrobots-block">
              <h3>Lore secret</h3>
              {character.secret.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          ) : null}
        </article>

        <div className="tetrobots-pagination">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Profil précédent
          </button>
          <span>
            {page + 1} / {LORE_CHARACTERS.length}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(LORE_CHARACTERS.length - 1, p + 1))}
            disabled={page === LORE_CHARACTERS.length - 1}
          >
            Profil suivant
          </button>
        </div>
      </section>

      <section className="tetrobots-conflict">
        <h2>CONFLIT CENTRAL</h2>
        <p>Pixel croit en l’évolution.</p>
        <p>Apex croit en la domination.</p>
        <p>Pulse croit en l’optimisation.</p>
        <p>Rookie cherche encore à comprendre.</p>
        <p>Et au milieu… il y a le joueur.</p>
      </section>
    </main>
  );
}
