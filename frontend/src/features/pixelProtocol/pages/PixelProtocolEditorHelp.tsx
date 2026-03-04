import { useNavigate } from "react-router-dom";
import "../../../styles/pixel-protocol-editor-help.css";

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

        <section className="panel pp-editor-help-card">
          <h2>Flux conseille</h2>
          <ol>
            <li>Commence par regler l'id, le nom, le monde, la largeur et le nombre d'orbs requises.</li>
            <li>Place d'abord le spawn joueur puis le portail de sortie.</li>
            <li>Construis un chemin principal avec les plateformes stables avant d'ajouter les variantes speciales.</li>
            <li>Ajoute ensuite checkpoints, orbs et ennemis pour rythmer la progression.</li>
            <li>Teste regulierement le niveau avec "Tester le niveau" puis corrige les alertes de validation.</li>
          </ol>
        </section>

        <section className="panel pp-editor-help-card">
          <h2>Rendre le niveau valide</h2>
          <ul>
            <li><strong>Spawn</strong>: il doit permettre de rejoindre au moins une plateforme jouable.</li>
            <li><strong>Chemin</strong>: chaque zone importante doit etre atteignable avec les capacites du monde courant.</li>
            <li><strong>Validation</strong>: la colonne de droite liste les plateformes non atteignables.</li>
            <li><strong>Liens traces</strong>: les lignes sur la grille montrent les transitions detectees depuis le spawn ou entre plateformes.</li>
            <li><strong>Preview</strong>: un layout "valide" mathematiquement doit quand meme etre teste en jeu pour verifier les timings et la lisibilite.</li>
          </ul>
        </section>

        <section className="panel pp-editor-help-card">
          <h2>Mondes et capacites</h2>
          <ul>
            <li><strong>Monde 1</strong>: saut simple uniquement. Pense des ecarts lisibles et des hauteurs assez directes.</li>
            <li><strong>Monde 2</strong>: debloque le <strong>double jump</strong>. Il permet d'atteindre des plateformes plus hautes ou de corriger une trajectoire en l'air.</li>
            <li><strong>Monde 3</strong>: debloque le <strong>dash aerien</strong> et le <strong>hack</strong>. Le dash aide sur les grands trous horizontaux; le hack ouvre la porte a des mecanismes et plateformes hackables.</li>
            <li><strong>Monde 4</strong>: ajoute le <strong>shield</strong>. Il absorbe les impacts et autorise des sections plus agressives avec ennemis et pression.</li>
            <li><strong>Conseil</strong>: quand tu changes le numero de monde du niveau, reverifie toujours la validation et la preview, car les sauts possibles changent reellement.</li>
          </ul>
        </section>

        <section className="panel pp-editor-help-card">
          <h2>Plateformes</h2>
          <ul>
            <li><strong>Ajouter plateforme</strong>: cree une nouvelle plateforme basee sur la selection courante ou un modele par defaut.</li>
            <li><strong>Drag and drop</strong>: tu peux deplacer chaque plateforme directement sur la grille.</li>
            <li><strong>Tetromino</strong>: choisit la forme du bloc parmi I, O, T, L, J, S et Z.</li>
            <li><strong>Rotation</strong>: change l'orientation de la forme sans devoir la recreer.</li>
            <li><strong>Type</strong>: definit le comportement de la plateforme en jeu.</li>
          </ul>
        </section>

        <section className="panel pp-editor-help-card">
          <h2>Types de plateformes</h2>
          <ul>
            <li><strong>stable</strong>: plateforme standard, ideale pour la structure principale.</li>
            <li><strong>bounce</strong>: projette le joueur plus haut, utile pour les chaines verticales.</li>
            <li><strong>unstable</strong>: tombe apres activation, a utiliser avec moderation.</li>
            <li><strong>rotating</strong>: change de rotation automatiquement selon le delai configure.</li>
            <li><strong>glitch</strong>: plateforme piegee ou perturbante, plutot pour augmenter la pression.</li>
            <li><strong>armored</strong>: variante plus robuste visuellement, utile pour marquer les zones solides.</li>
            <li><strong>hackable</strong>: liee aux capacites avancees des mondes plus tardifs.</li>
          </ul>
        </section>

        <section className="panel pp-editor-help-card">
          <h2>Checkpoints, orbs et ennemis</h2>
          <ul>
            <li><strong>Checkpoint</strong>: place un marqueur visible et un point de respawn associe. Le drag recalcule automatiquement le respawn coherent.</li>
            <li><strong>Orb</strong>: objet de collecte necessaire pour ouvrir le portail. Assure-toi qu'au moins le nombre requis d'orbs soit accessible.</li>
            <li><strong>Enemy</strong>: ennemi mobile avec type, position et zone de patrouille min/max X.</li>
            <li><strong>Spawn / Exit</strong>: eux aussi sont deplacables en drag and drop sur la grille.</li>
            <li><strong>Suppression</strong>: la selection courante peut etre retiree avec "Supprimer selection" pour les checkpoints, orbs, ennemis et plateformes.</li>
          </ul>
        </section>

        <section className="panel pp-editor-help-card">
          <h2>Conseils de level design</h2>
          <ul>
            <li>Construis d'abord un parcours simple, puis ajoute la difficulte par couches.</li>
            <li>Evite d'empiler trop de mecanismes dangereux dans le meme ecran sans zone de recuperation.</li>
            <li>Place les checkpoints avant les sequences precises ou punitives.</li>
            <li>Utilise les orbs pour encourager l'exploration, pas seulement comme peage sur la route principale.</li>
            <li>Garde une lecture claire: le joueur doit comprendre rapidement ou aller et quel risque il prend.</li>
          </ul>
        </section>

        <section className="panel pp-editor-help-card">
          <h2>Depannage rapide</h2>
          <ul>
            <li>Si une plateforme reste invalide, rapproche-la d'une surface deja accessible ou ajuste sa hauteur.</li>
            <li>Si un ennemi semble injuste, reduis sa zone min/max X ou eloigne-le d'un saut critique.</li>
            <li>Si le portail est impossible a atteindre, ajoute une plateforme d'approche ou baisse son altitude.</li>
            <li>Si le niveau parait correct mais ne se joue pas bien, lance la preview et ajuste les ecarts en conditions reelles.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
