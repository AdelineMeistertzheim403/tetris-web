import EditorHelpPage, {
  type EditorHelpSection,
} from "../../app/components/help/EditorHelpPage";
import { PATHS } from "../../../routes/paths";
import "../../../styles/pixel-protocol-editor.css";
import "../../../styles/pixel-protocol-editor-help.css";
import "../../../styles/tetromaze-editor-help.css";

const HELP_QUICK_LINKS = ["flow", "tools", "hub"];

const HELP_SECTIONS: EditorHelpSection[] = [
  {
    id: "flow",
    title: "Flux conseille",
    icon: "fa-route",
    keywords: ["murs", "spawn", "maison", "power-up", "jouer", "publier"],
    content: (
      <ol>
        <li>Commence par dessiner les murs avec l'outil <strong>Tetromino</strong>.</li>
        <li>Place le spawn joueur puis la maison des tetrobots.</li>
        <li>Configure le nombre de Rookie, Pulse et Apex, puis applique.</li>
        <li>Ajoute les power-ups et les teleporteurs.</li>
        <li>Sauve le niveau puis lance-le avec <strong>Jouer ce niveau</strong>.</li>
        <li>
          Quand tu as termine le niveau en jeu, publie-le dans la galerie joueurs si tu veux le
          partager.
        </li>
      </ol>
    ),
  },
  {
    id: "tools",
    title: "Outils de la barre",
    icon: "fa-toolbox",
    keywords: ["tetromino", "gomme", "spawn", "power-up", "teleporteur"],
    content: (
      <ul>
        <li>
          <strong>Tetromino murs</strong>: place des murs selon la piece et la rotation.
        </li>
        <li>
          <strong>Gomme sol</strong>: remet une case en couloir.
        </li>
        <li>
          <strong>Spawn joueur</strong>: position de depart du joueur.
        </li>
        <li>
          <strong>Maison tetrobots</strong>: place la zone de spawn des bots.
        </li>
        <li>
          <strong>Power-up</strong>: pose le power-up selectionne sur la case.
        </li>
        <li>
          <strong>Teleporteur</strong>: configure une paire A/B, jusqu'a trois paires.
        </li>
      </ul>
    ),
  },
  {
    id: "behaviors",
    title: "Comportements utiles",
    icon: "fa-robot",
    keywords: ["survol", "bordures", "tetrobots", "import", "export", "publication"],
    content: (
      <ul>
        <li>Le survol sur la grille previsualise les cases qui seront modifiees.</li>
        <li>Les bordures exterieures restent toujours des murs.</li>
        <li>Le compteur de tetrobots respecte la limite globale de 12.</li>
        <li>Import et Export JSON permettent de partager et versionner tes niveaux.</li>
        <li>
          La publication communautaire demande une connexion et un clear valide de la version
          courante du niveau.
        </li>
      </ul>
    ),
  },
  {
    id: "hub",
    title: "Hub et galerie joueurs",
    icon: "fa-compass",
    keywords: ["hub", "galerie", "joueurs", "likes", "publie"],
    content: (
      <ul>
        <li>
          Le hub Tetromaze reprend maintenant la meme logique que Pixel Protocol avec campagne,
          custom, galerie joueurs et acces rapide a l'editeur.
        </li>
        <li>
          Un niveau publie apparait dans <strong>Niveaux joueurs</strong> et peut etre relance
          directement depuis le hub ou la galerie.
        </li>
        <li>
          Les autres joueurs peuvent liker ton niveau depuis la galerie communautaire ou apres
          l'avoir termine.
        </li>
        <li>
          L'editeur affiche aussi si le niveau courant est deja publie et combien de likes il a
          recus.
        </li>
      </ul>
    ),
  },
  {
    id: "troubleshooting",
    title: "Depannage rapide",
    icon: "fa-screwdriver-wrench",
    keywords: ["spawn", "bots", "teleporter", "publier", "niveau"],
    content: (
      <ul>
        <li>Si un niveau ne se lance pas, verifie qu'il contient un spawn joueur valide.</li>
        <li>Si les bots semblent mal places, repositionne la maison puis reapplique les tetrobots.</li>
        <li>Si un teleporter ne marche pas, verifie que les deux extremites A et B existent.</li>
        <li>
          Si <strong>Publier</strong> reste indisponible, joue et termine d'abord cette version
          exacte du niveau.
        </li>
      </ul>
    ),
  },
];

export default function TetromazeEditorHelp() {
  return (
    <EditorHelpPage
      title="Aide - Editeur Tetromaze"
      storageKey="tetromaze-editor-help-ui-v2"
      sections={HELP_SECTIONS}
      quickLinks={HELP_QUICK_LINKS}
      backPath={PATHS.tetromazeHub}
      backLabel="Retour hub"
      className="tetromaze-editor-help"
    />
  );
}
