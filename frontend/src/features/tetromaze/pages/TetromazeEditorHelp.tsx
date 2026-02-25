import { useNavigate } from "react-router-dom";
import "../../../styles/tetromaze-editor-help.css";

export default function TetromazeEditorHelp() {
  const navigate = useNavigate();

  return (
    <div className="tetromaze-editor-help font-['Press_Start_2P']">
      <div className="tetromaze-editor-help-shell">
        <div className="tetromaze-editor-help-head">
          <h1>Aide - Editeur Tetromaze</h1>
          <button className="retro-btn" onClick={() => navigate("/tetromaze")}>Retour Hub</button>
        </div>

        <section className="panel tetromaze-editor-help-card">
          <h2>Flux conseille</h2>
          <ol>
            <li>Commence par dessiner les murs avec l'outil Tetromino.</li>
            <li>Place le spawn joueur puis la maison des tetrobots.</li>
            <li>Configure le nombre de Rookie/Pulse/Apex (max total 12), puis applique.</li>
            <li>Ajoute les power-ups et les teleporteurs.</li>
            <li>Sauve le niveau puis lance-le avec "Jouer ce niveau".</li>
          </ol>
        </section>

        <section className="panel tetromaze-editor-help-card">
          <h2>Outils de la barre</h2>
          <ul>
            <li><strong>Tetromino murs</strong>: place des murs selon la piece et la rotation.</li>
            <li><strong>Gomme sol</strong>: remet une case en couloir.</li>
            <li><strong>Spawn joueur</strong>: position de depart du joueur.</li>
            <li><strong>Maison tetrobots</strong>: place la zone de spawn des bots.</li>
            <li><strong>Power-up</strong>: pose le power-up selectionne sur la case.</li>
            <li><strong>Teleporteur</strong>: configure une paire A/B (jusqu'a 3 paires).</li>
          </ul>
        </section>

        <section className="panel tetromaze-editor-help-card">
          <h2>Comportements utiles</h2>
          <ul>
            <li>Le survol sur la grille previsualise les cases qui seront modifiees.</li>
            <li>Les bordures exterieures restent toujours des murs.</li>
            <li>Le compteur de tetrobots respecte la limite globale de 12.</li>
            <li>Import/Export JSON permet de partager et versionner tes niveaux.</li>
          </ul>
        </section>

        <section className="panel tetromaze-editor-help-card">
          <h2>Depannage rapide</h2>
          <ul>
            <li>Si un niveau ne se lance pas, verifie qu'il contient un spawn joueur valide.</li>
            <li>Si les bots semblent mal places, repositionne la maison puis reapplique les tetrobots.</li>
            <li>Si un teleporter ne marche pas, verifie que les deux extremites A/B existent.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
