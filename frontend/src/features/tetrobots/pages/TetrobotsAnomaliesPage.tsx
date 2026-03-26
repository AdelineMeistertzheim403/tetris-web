import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/context/AuthContext";
import { useAchievements } from "../../achievements/hooks/useAchievements";
import TetrobotsSectionNav from "../components/TetrobotsSectionNav";
import {
  ALL_TETROBOT_ANOMALIES,
  getTetrobotAnomalyProgress,
  getTetrobotAnomalyStage,
  getTetrobotFinaleState,
  isTetrobotAnomalyFound,
  TETROBOT_ANOMALY_SPEAKER_META,
} from "../logic/tetrobotAnomalies";
import "../../../styles/tetrobots.css";

const COLLECTION_LABELS = {
  system: "fragments noyau",
  star_wars: "archive Star Wars",
  back_to_future: "archive Retour vers le futur",
  hybrid: "archive hybride",
} as const;

const FRAGMENTS_PER_PAGE = 6;

export default function TetrobotsAnomaliesPage() {
  const { user } = useAuth();
  const { stats } = useAchievements();

  const progress = useMemo(() => getTetrobotAnomalyProgress(stats.counters), [stats.counters]);
  const stage = useMemo(() => getTetrobotAnomalyStage(progress.coreFound), [progress.coreFound]);
  const finaleState = useMemo(() => getTetrobotFinaleState(stats.counters), [stats.counters]);
  const entries = useMemo(
    () =>
      ALL_TETROBOT_ANOMALIES.map((entry, index) => ({
        ...entry,
        order: index + 1,
        found: isTetrobotAnomalyFound(stats.counters, entry.id),
      })),
    [stats.counters]
  );
  const initialSelectedEntry = entries.find((entry) => entry.found) ?? entries[0] ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedEntry?.id ?? null);
  const [currentPage, setCurrentPage] = useState(() =>
    Math.floor(((initialSelectedEntry?.order ?? 1) - 1) / FRAGMENTS_PER_PAGE)
  );
  const totalPages = Math.max(1, Math.ceil(entries.length / FRAGMENTS_PER_PAGE));
  const pageStart = currentPage * FRAGMENTS_PER_PAGE;
  const paginatedEntries = entries.slice(pageStart, pageStart + FRAGMENTS_PER_PAGE);

  const selectedEntry =
    entries.find((entry) => entry.id === selectedId) ??
    entries.find((entry) => entry.found) ??
    entries[0] ??
    null;
  const selectedSpeaker = selectedEntry
    ? TETROBOT_ANOMALY_SPEAKER_META[selectedEntry.bot]
    : null;
  const totalPercent =
    progress.totalCount > 0 ? (progress.totalFound / progress.totalCount) * 100 : 0;
  const corePercent =
    progress.coreCount > 0 ? (progress.coreFound / progress.coreCount) * 100 : 0;
  const popPercent = progress.popCount > 0 ? (progress.popFound / progress.popCount) * 100 : 0;

  useEffect(() => {
    if (currentPage <= totalPages - 1) return;
    setCurrentPage(totalPages - 1);
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!selectedEntry) return;

    const selectedPage = Math.floor((selectedEntry.order - 1) / FRAGMENTS_PER_PAGE);
    if (selectedPage !== currentPage) {
      setCurrentPage(selectedPage);
    }
  }, [currentPage, selectedEntry]);

  return (
    <main className="tetrobots-page">
      <header className="tetrobots-hero">
        <p className="tetrobots-kicker">ARCHIVES</p>
        <h1>JOURNAL DES ANOMALIES</h1>
        <p>
          Pixel archive ici les fragments corrompus qui remontent parfois dans le chatbot du
          dashboard. Analyse les phrases suspectes, confirme les vraies anomalies et reconstruis
          les vieilles archives culturelles absorbees par le reseau.
        </p>
      </header>

      <TetrobotsSectionNav isLoggedIn={Boolean(user)} />

      <section className="tetrobots-anomalies">
        <div className="tetrobots-anomalies__summary">
          <article className="tetrobots-anomalies__metric tetrobots-anomalies__metric--primary">
            <span>Breche globale</span>
            <strong>
              {progress.totalFound}/{progress.totalCount}
            </strong>
            <div className="tetrobots-anomalies__bar" aria-hidden="true">
              <span style={{ width: `${totalPercent}%` }} />
            </div>
          </article>

          <article className="tetrobots-anomalies__metric">
            <span>Fragments systeme</span>
            <strong>
              {progress.coreFound}/{progress.coreCount}
            </strong>
            <div className="tetrobots-anomalies__bar" aria-hidden="true">
              <span style={{ width: `${corePercent}%` }} />
            </div>
          </article>

          <article className="tetrobots-anomalies__metric tetrobots-anomalies__metric--pop">
            <span>Archives pop</span>
            <strong>
              {progress.popFound}/{progress.popCount}
            </strong>
            <div className="tetrobots-anomalies__bar" aria-hidden="true">
              <span style={{ width: `${popPercent}%` }} />
            </div>
          </article>
        </div>

        <article className="tetrobots-anomalies__stage">
          <p className="tetrobots-kicker">ETAT DU RESEAU</p>
          <h2 style={{ color: stage.accent }}>{stage.title}</h2>
          <p>{stage.text}</p>
          {progress.totalFound >= progress.totalCount ? (
            <p className="tetrobots-anomalies__final-line">"Tu n'etais pas cense voir ca."</p>
          ) : null}
        </article>

        {finaleState.choice ? (
          <article className="tetrobots-anomalies__stage tetrobots-anomalies__stage--choice">
            <p className="tetrobots-kicker">ISSUE ACTIVE</p>
            <h2 style={{ color: finaleState.deepLayerUnlocked ? "#ffe39d" : "#d6b0ff" }}>
              {finaleState.choice === "break"
                ? "COUCHE PROFONDE OUVERTE"
                : "PIXEL SURVEILLE LE CANAL"}
            </h2>
            <p>
              {finaleState.choice === "break"
                ? "Pixel ne masque plus la couche profonde. Le dashboard est maintenant traverse par des lignes post-revelation."
                : "Le systeme est revenu en surface, mais Pixel laisse des traces volontaires dans les dialogues."}
            </p>
          </article>
        ) : null}

        <div className="tetrobots-anomalies__layout">
          <div className="tetrobots-anomalies__grid" aria-label="Liste des fragments archives">
            {paginatedEntries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={`tetrobots-anomalies__card${
                  entry.found ? " tetrobots-anomalies__card--found" : ""
                }${selectedEntry?.id === entry.id ? " tetrobots-anomalies__card--active" : ""}`}
                onClick={() => setSelectedId(entry.id)}
              >
                <span className="tetrobots-anomalies__card-id">#{entry.order}</span>
                <span className="tetrobots-anomalies__card-status">
                  {entry.found ? "FRAGMENT IDENTIFIE" : "ANOMALIE A VERIFIER"}
                </span>
                <span className="tetrobots-anomalies__card-bot" style={{ color: TETROBOT_ANOMALY_SPEAKER_META[entry.bot].accent }}>
                  {TETROBOT_ANOMALY_SPEAKER_META[entry.bot].label}
                </span>
                <span className="tetrobots-anomalies__card-hint">{entry.hint}</span>
              </button>
            ))}
          </div>

          {selectedEntry ? (
            <aside className="tetrobots-anomalies__detail">
              <p className="tetrobots-kicker">DETAIL DU FRAGMENT</p>
              <div className="tetrobots-anomalies__detail-head">
                <div>
                  <h2>Fragment #{selectedEntry.order}</h2>
                  <p
                    className="tetrobots-anomalies__detail-speaker"
                    style={{ color: selectedSpeaker?.accent }}
                  >
                    {selectedSpeaker?.label} · {COLLECTION_LABELS[selectedEntry.collection]}
                  </p>
                </div>
                <span
                  className={`tetrobots-anomalies__detail-state${
                    selectedEntry.found ? " tetrobots-anomalies__detail-state--found" : ""
                  }`}
                >
                  {selectedEntry.found ? "archivee" : "verrouillee"}
                </span>
              </div>

              <div className="tetrobots-anomalies__detail-block">
                <h3>Indice</h3>
                <p>{selectedEntry.hint}</p>
              </div>

              {selectedEntry.found ? (
                <>
                  <div className="tetrobots-anomalies__detail-block">
                    <h3>Phrase detectee</h3>
                    <p>{selectedEntry.text}</p>
                  </div>

                  <div className="tetrobots-anomalies__detail-block">
                    <h3>Source identifiee</h3>
                    <p>{selectedEntry.reference}</p>
                  </div>

                  <div className="tetrobots-anomalies__detail-block">
                    <h3>Niveau de corruption</h3>
                    <p>{selectedEntry.difficulty}</p>
                  </div>
                </>
              ) : (
                <div className="tetrobots-anomalies__detail-block tetrobots-anomalies__detail-block--locked">
                  <h3>Archive incomplete</h3>
                  <p>
                    Le texte exact et sa provenance restent masques tant que le fragment n&apos;a
                    pas ete confirme depuis le dashboard.
                  </p>
                </div>
              )}
            </aside>
          ) : null}
        </div>

        {entries.length > FRAGMENTS_PER_PAGE ? (
          <div className="tetrobots-pagination tetrobots-anomalies__pagination">
            <button
              type="button"
              onClick={() => {
                const nextPage = Math.max(0, currentPage - 1);
                setCurrentPage(nextPage);
                setSelectedId(
                  entries[nextPage * FRAGMENTS_PER_PAGE]?.id ?? selectedId
                );
              }}
              disabled={currentPage === 0}
            >
              Fragments precedents
            </button>
            <span>
              Page {currentPage + 1} / {totalPages} · Fragments {pageStart + 1}-
              {Math.min(pageStart + FRAGMENTS_PER_PAGE, entries.length)}
            </span>
            <button
              type="button"
              onClick={() => {
                const nextPage = Math.min(totalPages - 1, currentPage + 1);
                setCurrentPage(nextPage);
                setSelectedId(
                  entries[nextPage * FRAGMENTS_PER_PAGE]?.id ?? selectedId
                );
              }}
              disabled={currentPage === totalPages - 1}
            >
              Fragments suivants
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
