import { useNavigate } from "react-router-dom";
import "../../../styles/pixel-protocol-editor-help.css";

type HelpSectionProps = {
  title: string;
  children: React.ReactNode;
};

function HelpSection({ title, children }: HelpSectionProps) {
  return (
    <details className="panel pp-editor-help-card">
      <summary>{title}</summary>
      <div className="pp-editor-help-card__body">{children}</div>
    </details>
  );
}

export default function PixelProtocolEditorHelp() {
  const navigate = useNavigate();

  return (
    <div className="pp-editor-help font-['Press_Start_2P']">
      <div className="pp-editor-help-shell">
        <div className="pp-editor-help-head">
          <h1>Aide - Editeur Pixel Protocol</h1>
          <button className="retro-btn" onClick={() => navigate("/pixel-protocol/editor")}>
            Retour editeur
          </button>
        </div>

        <HelpSection title="Schema des zones">
          <div className="pp-editor-help-map">
            <div className="pp-editor-help-map__box pp-editor-help-map__box--1">
              <strong>1</strong>
              <span>Liste des niveaux</span>
            </div>
            <div className="pp-editor-help-map__box pp-editor-help-map__box--2">
              <strong>2</strong>
              <span>Parametres du niveau</span>
            </div>
            <div className="pp-editor-help-map__box pp-editor-help-map__box--3">
              <strong>3</strong>
              <span>Toolbar de creation</span>
            </div>
            <div className="pp-editor-help-map__box pp-editor-help-map__box--4">
              <strong>4</strong>
              <span>Grille et preview</span>
            </div>
            <div className="pp-editor-help-map__box pp-editor-help-map__box--5">
              <strong>5</strong>
              <span>Etat du layout / Validation / Elements</span>
            </div>
            <div className="pp-editor-help-map__box pp-editor-help-map__box--6">
              <strong>6</strong>
              <span>Inspecteur Selection</span>
            </div>
          </div>
          <ol>
            <li><strong>1</strong>: charge, supprime ou joue un niveau custom deja cree.</li>
            <li><strong>2</strong>: regroupe l'identite du niveau, les <strong>Dimensions gameplay</strong>, le <strong>Monde decoratif</strong> et les <strong>Objectifs / points clefs</strong>. Cette zone peut etre repliee.</li>
            <li><strong>3</strong>: ajoute rapidement plateformes, checkpoints, orbs et ennemis.</li>
            <li><strong>4</strong>: zone de travail principale avec drag and drop et visualisation du niveau.</li>
            <li><strong>5</strong>: resume l'etat du niveau, signale les erreurs et liste les elements presents.</li>
            <li><strong>6</strong>: edite precisement l'element actuellement selectionne.</li>
          </ol>
        </HelpSection>

        <HelpSection title="Flux conseille">
          <ol>
            <li>Depuis le hub Pixel Protocol, choisis d'abord <strong>Mode monde</strong> ou <strong>Mode niveau</strong>.</li>
            <li>En <strong>Mode monde</strong>, cree ou modifie un decor reutilisable avec les decorations.</li>
            <li>En <strong>Mode niveau</strong>, regle d'abord les <strong>Dimensions gameplay</strong>, puis choisis un monde dans <strong>Monde decoratif</strong>.</li>
            <li>Place ensuite le spawn, le portail et les elements de gameplay sur cette base visuelle.</li>
            <li>Teste regulierement le niveau avec "Tester le niveau" puis corrige les alertes de validation.</li>
          </ol>
        </HelpSection>

        <HelpSection title="Dimensions gameplay vs decor">
          <ul>
            <li><strong>Dimensions gameplay</strong>: elles controlent le sol, la hauteur jouable et la marge camera du niveau.</li>
            <li><strong>Monde decoratif</strong>: il applique les decors et la largeur visuelle du monde lie, sans redefinir la hauteur gameplay.</li>
            <li><strong>Resume decoratif</strong>: le panneau affiche en lecture seule la largeur, la hauteur et la marge du decor selectionne.</li>
            <li><strong>Warning largeur</strong>: si le decor est plus etroit que le niveau gameplay, l'editeur affiche maintenant une alerte.</li>
          </ul>
        </HelpSection>

        <HelpSection title="Rendre le niveau valide">
          <ul>
            <li><strong>Spawn</strong>: il doit permettre de rejoindre au moins une plateforme jouable.</li>
            <li><strong>Chemin</strong>: chaque zone importante doit etre atteignable avec les capacites du monde courant.</li>
            <li><strong>Validation</strong>: la colonne de droite liste les plateformes non atteignables.</li>
            <li><strong>Liens traces</strong>: les lignes sur la grille montrent les transitions detectees depuis le spawn ou entre plateformes.</li>
            <li><strong>Preview</strong>: un layout "valide" mathematiquement doit quand meme etre teste en jeu pour verifier les timings et la lisibilite.</li>
          </ul>
        </HelpSection>

        <HelpSection title="Mondes et capacites">
          <ul>
            <li><strong>Monde 1</strong>: saut simple uniquement. Pense des ecarts lisibles et des hauteurs assez directes.</li>
            <li><strong>Monde 2</strong>: debloque le <strong>double jump</strong>. Il permet d'atteindre des plateformes plus hautes ou de corriger une trajectoire en l'air.</li>
            <li><strong>Monde 3</strong>: debloque le <strong>dash aerien</strong> et le <strong>hack</strong>. Le dash aide sur les grands trous horizontaux; le hack ouvre la porte a des mecanismes et plateformes hackables.</li>
            <li><strong>Monde 4</strong>: ajoute le <strong>shield</strong>. Il absorbe les impacts et autorise des sections plus agressives avec ennemis et pression.</li>
            <li><strong>Skills via orbs speciales</strong>: les capacites avancees ne dependent pas uniquement du monde. Elles peuvent etre donnees par une orb qui debloque un module Pixel.</li>
            <li><strong>Conseil</strong>: quand tu changes le numero de monde du niveau, reverifie toujours la validation et la preview, car les sauts possibles changent reellement.</li>
          </ul>
        </HelpSection>

        <HelpSection title="Plateformes">
          <ul>
            <li><strong>Ajouter plateforme</strong>: cree une nouvelle plateforme basee sur la selection courante ou un modele par defaut.</li>
            <li><strong>Drag and drop</strong>: tu peux deplacer chaque plateforme directement sur la grille.</li>
            <li><strong>Tetromino</strong>: choisit la forme du bloc parmi I, O, T, L, J, S et Z.</li>
            <li><strong>Rotation</strong>: change l'orientation de la forme sans devoir la recreer.</li>
            <li><strong>Type</strong>: definit le comportement de la plateforme en jeu.</li>
          </ul>
        </HelpSection>

        <HelpSection title="Types de plateformes">
          <ul>
            <li><strong>stable</strong>: plateforme standard, ideale pour la structure principale.</li>
            <li><strong>bounce</strong>: projette le joueur plus haut, utile pour les chaines verticales.</li>
            <li><strong>boost</strong>: impulsion forte verticale + horizontale, utile pour des sections vitesse.</li>
            <li><strong>unstable</strong>: tombe apres activation, a utiliser avec moderation.</li>
            <li><strong>moving</strong>: plateforme mobile (axe X/Y) avec pattern ping-pong ou loop.</li>
            <li><strong>rotating</strong>: change de rotation automatiquement selon le delai configure.</li>
            <li><strong>glitch</strong>: plateforme piegee ou perturbante, plutot pour augmenter la pression.</li>
            <li><strong>corrupted</strong>: ralentit Pixel et applique un malus de corruption.</li>
            <li><strong>magnetic</strong>: attire legerement Pixel pour faciliter les approches de saut.</li>
            <li><strong>ice</strong>: friction reduite, controle plus glissant.</li>
            <li><strong>gravity</strong>: inverse temporairement la gravite du joueur.</li>
            <li><strong>grapplable</strong>: seul type qui accepte le <strong>Data Grapple</strong>. Utilise-le pour rendre les points d'accroche lisibles et intentionnels.</li>
            <li><strong>armored</strong>: variante plus robuste visuellement, utile pour marquer les zones solides.</li>
            <li><strong>hackable</strong>: liee aux capacites avancees des mondes plus tardifs.</li>
          </ul>
        </HelpSection>

        <HelpSection title="Mode Monde (decorations)">
          <ul>
            <li><strong>Choix du mode</strong>: il se fait maintenant dans le <strong>hub Pixel Protocol</strong>, avant d'ouvrir l'editeur.</li>
            <li><strong>Mode Niveau</strong>: edition gameplay (plateformes, checkpoints, orbs, ennemis).</li>
            <li><strong>Mode Monde</strong>: edition des decors SVG (sans collision, purement visuel).</li>
            <li><strong>Reutilisation</strong>: un monde sauvegarde peut ensuite etre choisi dans le mode niveau.</li>
            <li><strong>Lien dynamique</strong>: un niveau reference son monde via <strong>Monde decoratif</strong>. Si le monde est modifie plus tard, le niveau recupere automatiquement le nouveau decor a l'execution.</li>
            <li><strong>Decorations</strong>: chaque element peut etre deplace, redimensionne, colore, tourne, anime et passe entre les layers <strong>far/mid/near</strong>.</li>
            <li><strong>Parallax simple</strong>: combine plusieurs layers avec opacites differentes pour creer de la profondeur.</li>
            <li><strong>Performance</strong>: les SVG sont legers et editables sans exporter des images.</li>
          </ul>
        </HelpSection>

        <HelpSection title="Creer un monde decoratif">
          <ol>
            <li>Depuis le hub, ouvre <strong>l'editeur custom</strong> ou <strong>admin</strong> en <strong>Mode monde</strong>.</li>
            <li>Definis d'abord le cadre global: <strong>ID</strong>, <strong>Nom</strong>, <strong>Largeur</strong>, <strong>Hauteur</strong> et <strong>Marge haute</strong>.</li>
            <li>Ajoute un fond avec des decorations de layer <strong>far</strong> pour poser l'ambiance generale.</li>
            <li>Ajoute ensuite les structures visuelles en <strong>mid</strong>: flux de donnees, piliers, circuits, skyline.</li>
            <li>Reserve le layer <strong>near</strong> aux elements forts lisibles a l'ecran: hubs, anneaux, oeil IA, glitchs, silhouettes tetromino.</li>
            <li>Utilise les animations <strong>flow</strong>, <strong>pulse</strong> et <strong>glitch</strong> avec moderation pour garder une lecture claire.</li>
            <li>Teste plusieurs opacites avant de sauvegarder: un monde trop charge masque la lisibilite du gameplay ensuite.</li>
            <li>Une fois le monde sauvegarde, retourne en <strong>Mode niveau</strong> et selectionne-le dans <strong>Monde decoratif</strong>.</li>
          </ol>
        </HelpSection>

        <HelpSection title="JSON d'exemple de monde">
          <p>Plusieurs <strong>WorldTemplate</strong> d'exemple sont embarques directement dans l'editeur.</p>
          <ul>
            <li>Ils couvrent plusieurs ambiances: <strong>Neon Foundry</strong>, <strong>Glitch Cathedral</strong>, <strong>Data Archives</strong> et <strong>Apex Core</strong>.</li>
            <li>Ils montrent differents usages des layers <strong>far</strong>, <strong>mid</strong> et <strong>near</strong>, ainsi que des animations, rotations, flips et opacites.</li>
            <li>Tu peux t'en servir comme base pour comprendre la structure JSON d'un monde ou pour fabriquer un nouveau decor plus rapidement.</li>
            <li>En <strong>Mode monde</strong>, en custom comme en admin, tu peux charger l'un de ces mondes avec les <strong>boutons d'exemple</strong>, importer un autre JSON avec l'icone <strong>fichier fleche vers le haut</strong>, puis exporter ton monde courant avec l'icone <strong>fichier fleche vers le bas</strong>.</li>
          </ul>
          <p>Themes disponibles :</p>
          <ul>
            <li><strong>Neon Foundry</strong>: forge neon / industrie numerique.</li>
            <li><strong>Glitch Cathedral</strong>: vertical / sanctuaire corrompu.</li>
            <li><strong>Data Archives</strong>: serveurs / techno propre.</li>
            <li><strong>Apex Core</strong>: boss final / coeur IA.</li>
          </ul>
          <p>Structure minimale attendue :</p>
          <pre>{`{
  "id": "world-mon-exemple",
  "name": "Mon Monde",
  "worldWidth": 4096,
  "worldHeight": 960,
  "worldTopPadding": 192,
  "decorations": [
    {
      "id": "dec-1",
      "type": "grid_background",
      "x": 0,
      "y": 96,
      "width": 512,
      "height": 320,
      "layer": "far",
      "animation": "none"
    }
  ]
}`}</pre>
        </HelpSection>

        <HelpSection title="Checkpoints, orbs et ennemis">
          <ul>
            <li><strong>Checkpoint</strong>: place un marqueur visible et un point de respawn associe. Le drag recalcule automatiquement le respawn coherent.</li>
            <li><strong>Orb standard</strong>: objet de collecte necessaire pour ouvrir le portail. Assure-toi qu'au moins le nombre requis d'orbs soit accessible.</li>
            <li><strong>Orb speciale</strong>: selectionne une orb puis regle <strong>Affinite</strong> et <strong>Skill</strong> dans l'inspecteur pour en faire une orb de competence.</li>
            <li><strong>Enemy</strong>: ennemi mobile avec type, position et zone de patrouille min/max X.</li>
            <li><strong>Spawn / Exit</strong>: eux aussi sont deplacables en drag and drop sur la grille.</li>
            <li><strong>Suppression</strong>: la selection courante peut etre retiree avec "Supprimer selection" pour les checkpoints, orbs, ennemis et plateformes.</li>
          </ul>
        </HelpSection>

        <HelpSection title="Ajouter une competence">
          <ol>
            <li>Ajoute d'abord une orb sur la grille.</li>
            <li>Selectionne cette orb dans la liste ou directement sur le canvas.</li>
            <li>Dans l'inspecteur, choisis une <strong>Affinite</strong> autre que <strong>standard</strong>.</li>
            <li>Choisis ensuite la <strong>Skill</strong> a debloquer.</li>
            <li>Place l'orb sur une plateforme lisible ou sur une branche secondaire si tu veux recompenser l'exploration.</li>
            <li>Teste la sequence en preview pour verifier que la competence sert juste apres son acquisition.</li>
          </ol>
        </HelpSection>

        <HelpSection title="Competences disponibles">
          <ul>
            <li><strong>OVERJUMP</strong>: ajoute un double saut ameliore. Ideal pour les routes verticales ou les recuperations en l'air.</li>
            <li><strong>DATA_GRAPPLE</strong>: active le grappin sur les plateformes <strong>grapplable</strong>. Pense a afficher clairement les points d'accroche sur le parcours.</li>
            <li><strong>PHASE_SHIFT</strong>: permet de traverser certaines surfaces et d'eviter les Tetrobots pendant un court instant.</li>
            <li><strong>PULSE_SHOCK</strong>: repousse ou stun les ennemis proches. Utile avant des sauts sous pression.</li>
            <li><strong>OVERCLOCK_MODE</strong>: augmente vitesse et saut pendant quelques secondes. Bon pour des segments de vitesse.</li>
            <li><strong>TIME_BUFFER</strong>: rembobine environ 2 secondes. A reserver aux sequences precises ou punitives.</li>
            <li><strong>PLATFORM_SPAWN</strong>: cree une plateforme temporaire. Ideal pour les sauvetages de chute ou les mini puzzles.</li>
          </ul>
        </HelpSection>

        <HelpSection title="Affinites et touches">
          <ul>
            <li><strong>Blue</strong>: mobilite. Utilise-la pour OVERJUMP ou DATA_GRAPPLE.</li>
            <li><strong>Red</strong>: combat. Convient bien a PULSE_SHOCK.</li>
            <li><strong>Green</strong>: systeme / construction. Convient a PLATFORM_SPAWN.</li>
            <li><strong>Purple</strong>: glitch / temps / phase. Convient a PHASE_SHIFT et TIME_BUFFER.</li>
            <li><strong>Touches</strong>: Grapple <strong>G</strong>, Phase <strong>F</strong>, Shock <strong>Q</strong>, Overclock <strong>C</strong>, Time Buffer <strong>X</strong>, Platform Spawn <strong>V</strong>.</li>
          </ul>
        </HelpSection>

        <HelpSection title="Legende des icones">
          <div className="pp-editor-help-icons">
            <span><i className="fa-solid fa-file-circle-plus" /> cree un nouveau niveau vide</span>
            <span><i className="fa-solid fa-rotate-right" /> recharge la liste des niveaux</span>
            <span><i className="fa-solid fa-circle-question" /> ouvre l'aide de l'editeur</span>
            <span><i className="fa-solid fa-arrow-left" /> retourne au hub Pixel Protocol</span>
            <span><i className="fa-solid fa-expand" /> affiche les parametres du niveau</span>
            <span><i className="fa-solid fa-compress" /> masque les parametres du niveau</span>
            <span><i className="fa-solid fa-floppy-disk" /> sauvegarde le niveau courant</span>
            <span><i className="fa-solid fa-wand-magic-sparkles" /> charge le monde decoratif d'exemple dans le mode monde</span>
            <span><i className="fa-solid fa-file-arrow-up" /> importe un monde JSON dans le mode monde</span>
            <span><i className="fa-solid fa-file-arrow-down" /> exporte le monde courant en JSON</span>
            <span><i className="fa-solid fa-vial-circle-check" /> lance un test local du niveau</span>
            <span><i className="fa-solid fa-play" /> joue le niveau custom selectionne</span>
            <span><i className="fa-solid fa-cubes" /> ajoute une nouvelle plateforme</span>
            <span><i className="fa-solid fa-flag" /> ajoute un checkpoint</span>
            <span><i className="fa-solid fa-circle-nodes" /> ajoute une data-orb</span>
            <span><i className="fa-solid fa-robot" /> ajoute un ennemi Tetrobot</span>
            <span><i className="fa-solid fa-trash-can" /> supprime l'element selectionne</span>
            <span><i className="fa-solid fa-upload" /> publie un niveau admin</span>
            <span><i className="fa-solid fa-folder-open" /> charge un niveau dans l'editeur</span>
            <span><i className="fa-solid fa-trash" /> supprime un niveau de la liste</span>
          </div>
        </HelpSection>

        <HelpSection title="Hub et navigation">
          <ul>
            <li><strong>Ouvrir editeur custom</strong> ou <strong>editeur admin</strong>: ouvre maintenant un choix entre <strong>Mode niveau</strong> et <strong>Mode monde</strong>.</li>
            <li><strong>Mondes custom</strong>: le hub affiche aussi la liste des mondes sauvegardes et permet d'ouvrir directement l'un d'eux en edition.</li>
            <li><strong>Mode monde admin</strong>: il existe aussi, mais reste base sur le meme stockage local des mondes decoratifs si aucun backend dedie n'est branche.</li>
          </ul>
        </HelpSection>

        <HelpSection title="Conseils de level design">
          <ul>
            <li>Construis d'abord un parcours simple, puis ajoute la difficulte par couches.</li>
            <li>Evite d'empiler trop de mecanismes dangereux dans le meme ecran sans zone de recuperation.</li>
            <li>Place les checkpoints avant les sequences precises ou punitives.</li>
            <li>Utilise les orbs pour encourager l'exploration, pas seulement comme peage sur la route principale.</li>
            <li>Garde une lecture claire: le joueur doit comprendre rapidement ou aller et quel risque il prend.</li>
          </ul>
        </HelpSection>

        <HelpSection title="Depannage rapide">
          <ul>
            <li>Si une plateforme reste invalide, rapproche-la d'une surface deja accessible ou ajuste sa hauteur.</li>
            <li>Si un ennemi semble injuste, reduis sa zone min/max X ou eloigne-le d'un saut critique.</li>
            <li>Si le portail est impossible a atteindre, ajoute une plateforme d'approche ou baisse son altitude.</li>
            <li>Si le niveau parait correct mais ne se joue pas bien, lance la preview et ajuste les ecarts en conditions reelles.</li>
          </ul>
        </HelpSection>
      </div>
    </div>
  );
}
