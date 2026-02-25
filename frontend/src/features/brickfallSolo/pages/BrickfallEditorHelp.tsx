import { useNavigate } from "react-router-dom";
import "../../../styles/brickfall-editor-help.css";

export default function BrickfallEditorHelp() {
  const navigate = useNavigate();

  return (
    <div className="brickfall-editor-help font-['Press_Start_2P']">
      <div className="brickfall-editor-help-shell">
        <div className="brickfall-editor-help-head">
          <h1>Aide - Editeur Brickfall</h1>
          <button className="retro-btn" onClick={() => navigate("/brickfall-editor")}>
            Retour editeur
          </button>
        </div>

        <section className="panel brickfall-editor-help-card">
          <h2>Flux conseille</h2>
          <ol>
            <li>Cree un nouveau niveau puis donne-lui un id unique et un nom.</li>
            <li>Choisis un type de bloc, puis clique dans la grille pour placer.</li>
            <li>Utilise le meme type pour recliquer et supprimer une case.</li>
            <li>Teste ton niveau avec "Jouer ce niveau" avant export.</li>
            <li>Sauvegarde puis exporte en JSON pour partage/versioning.</li>
          </ol>
        </section>

        <section className="panel brickfall-editor-help-card">
          <h2>Types de blocs</h2>
          <ul>
            <li>
              <strong>normal</strong>: bloc standard.
            </li>
            <li>
              <strong>armor</strong>: plus resistant (3 HP).
            </li>
            <li>
              <strong>bonus</strong>: donne un effet positif.
            </li>
            <li>
              <strong>malus</strong>: applique un effet negatif.
            </li>
            <li>
              <strong>explosive</strong>: declenche une explosion.
            </li>
            <li>
              <strong>cursed</strong>: bloc maudit a effet special.
            </li>
            <li>
              <strong>mirror</strong>: bloc miroir a rebond special.
            </li>
          </ul>
        </section>

        <section className="panel brickfall-editor-help-card">
          <h2>Actions principales</h2>
          <ul>
            <li>
              <strong>Sauver</strong>: enregistre localement et tente la synchro BDD.
            </li>
            <li>
              <strong>Nouveau</strong>: repart d'une grille vide.
            </li>
            <li>
              <strong>Export JSON</strong>: telecharge le niveau actif.
            </li>
            <li>
              <strong>Import JSON</strong>: fusionne des niveaux depuis un fichier.
            </li>
            <li>
              <strong>Jouer ce niveau</strong>: lance un test direct du niveau actif.
            </li>
          </ul>
        </section>

        <section className="panel brickfall-editor-help-card">
          <h2>Depannage rapide</h2>
          <ul>
            <li>Si la synchro echoue, le niveau reste sauvegarde en local.</li>
            <li>Si un import echoue, verifie que le JSON respecte le format des niveaux.</li>
            <li>Si un id existe deja, l'import/sauvegarde mettra a jour ce niveau.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
