import EditorHelpPage, {
  type EditorHelpSection,
} from "../../app/components/help/EditorHelpPage";
import { PATHS } from "../../../routes/paths";
import "../../../styles/pixel-protocol-editor.css";
import "../../../styles/pixel-protocol-editor-help.css";
import "../../../styles/brickfall-editor-help.css";

const HELP_QUICK_LINKS = ["flow", "actions", "hub"];

const HELP_SECTIONS: EditorHelpSection[] = [
  {
    id: "flow",
    title: "Flux conseille",
    icon: "fa-route",
    keywords: ["ordre", "niveau", "jouer", "publier", "json"],
    content: (
      <ol>
        <li>Cree un nouveau niveau puis donne-lui un id unique et un nom.</li>
        <li>Choisis un type de bloc, puis clique dans la grille pour placer.</li>
        <li>Utilise le meme type pour recliquer et supprimer une case.</li>
        <li>Teste ton niveau avec <strong>Jouer ce niveau</strong> avant export.</li>
        <li>
          Une fois le niveau termine en jeu, publie-le dans la galerie joueurs si tu veux le
          partager.
        </li>
        <li>Sauvegarde puis exporte en JSON pour partage ou versioning hors galerie.</li>
      </ol>
    ),
  },
  {
    id: "blocks",
    title: "Types de blocs",
    icon: "fa-cubes",
    keywords: ["normal", "armor", "bonus", "malus", "explosive", "cursed", "mirror"],
    content: (
      <ul>
        <li>
          <strong>normal</strong>: bloc standard.
        </li>
        <li>
          <strong>armor</strong>: plus resistant avec 3 HP.
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
          <strong>mirror</strong>: bloc miroir avec rebond specifique.
        </li>
      </ul>
    ),
  },
  {
    id: "actions",
    title: "Actions principales",
    icon: "fa-gamepad",
    keywords: ["sauver", "nouveau", "export", "import", "jouer", "publier"],
    content: (
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
        <li>
          <strong>Publier</strong>: disponible seulement si tu es connecte et que cette version
          exacte du niveau a deja ete terminee.
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
          Le hub Brickfall Solo reprend maintenant la meme presentation que Pixel Protocol avec
          campagne, niveaux custom et galerie joueurs.
        </li>
        <li>
          Un niveau publie apparait dans <strong>Niveaux joueurs</strong> et peut etre lance par
          les autres utilisateurs.
        </li>
        <li>
          Les autres joueurs peuvent liker ton niveau depuis la galerie ou apres avoir fini une
          partie dessus.
        </li>
        <li>
          Le hub et l'editeur signalent aussi si le niveau custom courant est deja publie.
        </li>
      </ul>
    ),
  },
  {
    id: "troubleshooting",
    title: "Depannage rapide",
    icon: "fa-screwdriver-wrench",
    keywords: ["erreur", "synchro", "import", "publier", "grise"],
    content: (
      <ul>
        <li>Si la synchro echoue, le niveau reste sauvegarde en local.</li>
        <li>Si un import echoue, verifie que le JSON respecte bien le format attendu.</li>
        <li>Si un id existe deja, l'import ou la sauvegarde mettra a jour ce niveau.</li>
        <li>
          Si le bouton <strong>Publier</strong> est grise, termine d'abord le niveau en jeu avec
          cette version exacte du layout.
        </li>
      </ul>
    ),
  },
];

export default function BrickfallEditorHelp() {
  return (
    <EditorHelpPage
      title="Aide - Editeur Brickfall"
      storageKey="brickfall-editor-help-ui-v2"
      sections={HELP_SECTIONS}
      quickLinks={HELP_QUICK_LINKS}
      backPath={PATHS.brickfallEditor}
      backLabel="Retour editeur"
      className="brickfall-editor-help"
    />
  );
}
