import { Link } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../auth/context/AuthContext";
import TetrobotsSectionNav from "../components/TetrobotsSectionNav";
import { TETROBOT_LORE_CHARACTERS } from "../data/tetrobotsContent";
import { PATHS } from "../../../routes/paths";
import "../../../styles/tetrobots.css";

export default function TetrobotsPage() {
  const [page, setPage] = useState(0);
  const { user } = useAuth();
  const character = TETROBOT_LORE_CHARACTERS[page];

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

      <TetrobotsSectionNav isLoggedIn={Boolean(user)} />

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

          {character.id !== "pixel" ? (
            <div className="tetrobots-bridge">
              <div>
                <p className="tetrobots-kicker">PASSERELLE NARRATIVE</p>
                <h3>Voir le lien joueur ↔ {character.name.split(" — ")[0]}</h3>
                <p>{character.relationTease}</p>
              </div>
              {user ? (
                <Link
                  to={`/tetrobots/relations?bot=${character.id}`}
                  className="tetrobots-section-nav__link tetrobots-section-nav__link--active"
                >
                  Ouvrir sa relation
                </Link>
              ) : (
                <Link to={PATHS.login} className="tetrobots-section-nav__link">
                  Se connecter pour debloquer la relation
                </Link>
              )}
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
            {page + 1} / {TETROBOT_LORE_CHARACTERS.length}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(TETROBOT_LORE_CHARACTERS.length - 1, p + 1))}
            disabled={page === TETROBOT_LORE_CHARACTERS.length - 1}
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
