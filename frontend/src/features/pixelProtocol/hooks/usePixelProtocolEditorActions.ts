import { useCallback, useEffect } from "react";
import {
  levelFromWorldTemplate,
  makeNewLevel,
  makeNewWorldTemplate,
  sortAdminLevels,
  stripAdminFields,
  withAutoWorldBounds,
  worldTemplateFromLevel,
  type EditorMode,
  type EditorStoredLevel,
  type Selection,
} from "../editorShared";
import {
  deletePixelProtocolCustomLevel,
  deletePixelProtocolLevel,
  deletePixelProtocolWorldTemplate,
  fetchPixelProtocolAdminLevels,
  fetchPixelProtocolCommunityLevels,
  fetchPixelProtocolCustomLevels,
  fetchPixelProtocolWorldTemplates,
  publishPixelProtocolCommunityLevel,
  savePixelProtocolCustomLevel,
  savePixelProtocolLevel,
  savePixelProtocolWorldTemplate,
  type PixelProtocolAdminLevel,
  type PixelProtocolCommunityLevel,
} from "../services/pixelProtocolService";
import {
  listPixelProtocolCustomLevels,
  mergePixelProtocolCustomLevels,
  removePixelProtocolCustomLevel,
  upsertPixelProtocolCustomLevel,
} from "../utils/customLevels";
import {
  listPixelProtocolWorldTemplates,
  mergePixelProtocolWorldTemplates,
  removePixelProtocolWorldTemplate,
  upsertPixelProtocolWorldTemplate,
} from "../utils/worldTemplates";
import { hasCompletedCurrentPixelProtocolLevel } from "../utils/communityCompletion";
import type { LevelDef, WorldTemplate } from "../types";

type EditorActionState = {
  editorMode: EditorMode;
  isAdmin: boolean;
  requestedTemplateId: string | null;
  levels: EditorStoredLevel[];
  worldTemplates: WorldTemplate[];
  draftLevel: LevelDef;
  published: boolean;
  selectedId: string | null;
  validationIsValid: boolean;
  validationErrorMessage: string | null;
  setLevels: React.Dispatch<React.SetStateAction<EditorStoredLevel[]>>;
  setWorldTemplates: React.Dispatch<React.SetStateAction<WorldTemplate[]>>;
  setDraftLevel: React.Dispatch<React.SetStateAction<LevelDef>>;
  setPublished: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelection: React.Dispatch<React.SetStateAction<Selection>>;
  setPreviewLevel: React.Dispatch<React.SetStateAction<LevelDef | null>>;
  setCommunityLevels: React.Dispatch<React.SetStateAction<PixelProtocolCommunityLevel[]>>;
  setStatus: React.Dispatch<React.SetStateAction<string | null>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
};

export function usePixelProtocolEditorActions(state: EditorActionState) {
  const {
    editorMode,
    isAdmin,
    requestedTemplateId,
    levels,
    worldTemplates,
    draftLevel,
    published,
    selectedId,
    validationIsValid,
    validationErrorMessage,
    setLevels,
    setWorldTemplates,
    setDraftLevel,
    setPublished,
    setSelectedId,
    setSelection,
    setPreviewLevel,
    setCommunityLevels,
    setStatus,
    setError,
    setLoading,
  } = state;
  const isWorldEditor = editorMode === "world";

  const resetMessages = useCallback(() => {
    setStatus(null);
    setError(null);
  }, [setError, setStatus]);

  const selectLevel = useCallback(
    (level: EditorStoredLevel) => {
      const cleanLevel = withAutoWorldBounds(
        isAdmin ? stripAdminFields(level as PixelProtocolAdminLevel) : level
      );
      setSelectedId(level.id);
      setPublished(level.active ?? false);
      setDraftLevel(cleanLevel);
      setSelection(
        cleanLevel.platforms[0] ? { kind: "platform", id: cleanLevel.platforms[0].id } : null
      );
      setPreviewLevel(null);
      resetMessages();
    },
    [isAdmin, resetMessages, setDraftLevel, setPreviewLevel, setPublished, setSelectedId, setSelection]
  );

  const selectWorldTemplate = useCallback(
    (world: WorldTemplate) => {
      const draft = levelFromWorldTemplate(world);
      setSelectedId(world.id);
      setPublished(false);
      setDraftLevel(draft);
      setSelection(
        draft.decorations?.[0] ? { kind: "decoration", id: draft.decorations[0].id } : null
      );
      setPreviewLevel(null);
      resetMessages();
    },
    [resetMessages, setDraftLevel, setPreviewLevel, setPublished, setSelectedId, setSelection]
  );

  const saveCurrentCustomDraft = useCallback(
    async (levelToSave: LevelDef): Promise<LevelDef> => {
      const merged = upsertPixelProtocolCustomLevel(levelToSave);
      setLevels(merged);
      setSelectedId(levelToSave.id);
      setPublished(false);
      setDraftLevel(levelToSave);

      try {
        const remoteSaved = await savePixelProtocolCustomLevel(levelToSave);
        const mergedRemote: LevelDef = {
          ...remoteSaved,
          worldTopPadding: remoteSaved.worldTopPadding ?? levelToSave.worldTopPadding,
          orbs: remoteSaved.orbs.map((orb) => {
            const draftOrb = levelToSave.orbs.find((item) => item.id === orb.id);
            return {
              ...orb,
              affinity: orb.affinity ?? draftOrb?.affinity ?? "standard",
              grantsSkill: orb.grantsSkill ?? draftOrb?.grantsSkill ?? null,
            };
          }),
        };
        const synced = upsertPixelProtocolCustomLevel(mergedRemote);
        setLevels(synced);
        setDraftLevel(mergedRemote);
        setSelectedId(mergedRemote.id);
        return mergedRemote;
      } catch {
        return levelToSave;
      }
    },
    [setDraftLevel, setLevels, setPublished, setSelectedId]
  );

  const refreshLevels = useCallback(async () => {
    setLoading(true);
    setWorldTemplates(listPixelProtocolWorldTemplates());

    if (isWorldEditor) {
      let worlds = listPixelProtocolWorldTemplates();
      try {
        worlds = mergePixelProtocolWorldTemplates(await fetchPixelProtocolWorldTemplates());
      } catch {
        setError("Mode hors ligne: mondes custom locaux utilises.");
      }
      setWorldTemplates(worlds);
      const requestedWorld =
        requestedTemplateId
          ? worlds.find((world) => world.id === requestedTemplateId) ?? null
          : null;
      if (requestedWorld) {
        selectWorldTemplate(requestedWorld);
      } else if (worlds.length > 0) {
        selectWorldTemplate(worlds[0]);
      } else {
        const freshWorld = makeNewWorldTemplate([]);
        setSelectedId(null);
        setPublished(false);
        setDraftLevel(levelFromWorldTemplate(freshWorld));
        setSelection(null);
      }
      setLoading(false);
      return;
    }

    try {
      const sorted = isAdmin
        ? sortAdminLevels(await fetchPixelProtocolAdminLevels())
        : mergePixelProtocolCustomLevels(await fetchPixelProtocolCustomLevels());
      setLevels(sorted);
      if (!isAdmin) {
        try {
          setCommunityLevels(await fetchPixelProtocolCommunityLevels());
        } catch {
          setCommunityLevels([]);
        }
      }
      if (sorted.length > 0) {
        selectLevel(sorted[0]);
      } else {
        const fresh = makeNewLevel([], isAdmin);
        setSelectedId(null);
        setPublished(isAdmin);
        setDraftLevel(withAutoWorldBounds(fresh));
        setSelection(null);
      }
    } catch (err) {
      if (isAdmin) {
        setError(err instanceof Error ? err.message : "Erreur chargement niveaux admin");
      } else {
        const local = listPixelProtocolCustomLevels();
        setLevels(local);
        if (local.length > 0) {
          selectLevel(local[0]);
        } else {
          setDraftLevel(withAutoWorldBounds(makeNewLevel([], false)));
          setSelection(null);
        }
        setError("Mode hors ligne: niveaux custom locaux utilises.");
      }
    } finally {
      setLoading(false);
    }
  }, [
    isAdmin,
    isWorldEditor,
    requestedTemplateId,
    selectLevel,
    selectWorldTemplate,
    setCommunityLevels,
    setDraftLevel,
    setError,
    setLevels,
    setLoading,
    setPublished,
    setSelectedId,
    setSelection,
    setWorldTemplates,
  ]);

  useEffect(() => {
    void refreshLevels();
  }, [editorMode, isAdmin, requestedTemplateId, refreshLevels]);

  const save = useCallback(
    async (forceActive?: boolean) => {
      if (isWorldEditor) {
        const world = worldTemplateFromLevel(draftLevel);
        const next = upsertPixelProtocolWorldTemplate(world);
        setWorldTemplates(next);
        setSelectedId(world.id);
        setDraftLevel(levelFromWorldTemplate(world));
        try {
          const savedWorld = await savePixelProtocolWorldTemplate(world);
          const synced = upsertPixelProtocolWorldTemplate(savedWorld);
          setWorldTemplates(synced);
          setDraftLevel(levelFromWorldTemplate(savedWorld));
          setStatus("Monde custom sauvegarde.");
        } catch {
          setStatus("Monde custom sauvegarde localement.");
        }
        setError(null);
        return;
      }

      if (!validationIsValid) {
        setError(validationErrorMessage ?? "Le layout des plateformes est invalide.");
        return;
      }

      const active = forceActive ?? published;
      try {
        let savedLevel: LevelDef;
        if (isAdmin) {
          const saved = await savePixelProtocolLevel(draftLevel, active);
          const normalizedSaved = {
            ...saved,
            worldTopPadding: saved.worldTopPadding ?? draftLevel.worldTopPadding,
          };
          setLevels((prev) =>
            sortAdminLevels([normalizedSaved, ...prev.filter((lvl) => lvl.id !== normalizedSaved.id)])
          );
          setSelectedId(normalizedSaved.id);
          setPublished(normalizedSaved.active);
          setDraftLevel(stripAdminFields(normalizedSaved));
          setStatus(active ? "Niveau publie." : "Niveau sauvegarde en brouillon.");
          savedLevel = stripAdminFields(normalizedSaved);
        } else {
          savedLevel = await saveCurrentCustomDraft(draftLevel);
          setStatus(
            savedLevel === draftLevel
              ? "Niveau custom sauvegarde localement."
              : "Niveau custom sauvegarde."
          );
        }
        setSelection(
          savedLevel.platforms[0] ? { kind: "platform", id: savedLevel.platforms[0].id } : null
        );
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur sauvegarde niveau");
      }
    },
    [
      draftLevel,
      isAdmin,
      isWorldEditor,
      published,
      saveCurrentCustomDraft,
      setDraftLevel,
      setError,
      setLevels,
      setPublished,
      setSelectedId,
      setSelection,
      setStatus,
      setWorldTemplates,
      validationErrorMessage,
      validationIsValid,
    ]
  );

  const playCurrentLevel = useCallback(async () => {
    if (isAdmin || isWorldEditor) return null;
    if (!validationIsValid) {
      setError(validationErrorMessage ?? "Corrige le layout avant de jouer.");
      return null;
    }

    const savedLevel = await saveCurrentCustomDraft(draftLevel);
    setStatus("Niveau pret pour le test complet.");
    setError(null);
    return savedLevel;
  }, [
    draftLevel,
    isAdmin,
    isWorldEditor,
    saveCurrentCustomDraft,
    setError,
    setStatus,
    validationErrorMessage,
    validationIsValid,
  ]);

  const publishCurrentLevel = useCallback(async () => {
    if (isAdmin || isWorldEditor) return;
    if (!validationIsValid) {
      setError(validationErrorMessage ?? "Le layout doit etre valide avant publication.");
      return;
    }
    if (!hasCompletedCurrentPixelProtocolLevel(draftLevel)) {
      setError("Tu dois finir cette version exacte du niveau avant de le publier.");
      return;
    }

    try {
      const savedLevel = await saveCurrentCustomDraft(draftLevel);
      const publishedLevel = await publishPixelProtocolCommunityLevel(savedLevel.id);
      setCommunityLevels((current) => {
        const next = [publishedLevel, ...current.filter((item) => item.id !== publishedLevel.id)];
        next.sort((a, b) => b.likeCount - a.likeCount || b.id - a.id);
        return next;
      });
      setStatus("Niveau publie dans la galerie des joueurs.");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur publication niveau");
    }
  }, [
    draftLevel,
    isAdmin,
    isWorldEditor,
    saveCurrentCustomDraft,
    setCommunityLevels,
    setError,
    setStatus,
    validationErrorMessage,
    validationIsValid,
  ]);

  const removeLevel = useCallback(async (levelId: string) => {
    if (!window.confirm(`Supprimer definitivement ${levelId} ?`)) return;
    if (isWorldEditor) {
      const remaining = removePixelProtocolWorldTemplate(levelId);
      try {
        await deletePixelProtocolWorldTemplate(levelId);
      } catch {
        setStatus("Monde supprime localement.");
      }
      setWorldTemplates(remaining);
      setStatus("Monde supprime.");
      if (selectedId !== levelId) return;
      if (remaining.length > 0) {
        selectWorldTemplate(remaining[0]);
      } else {
        const freshWorld = makeNewWorldTemplate([]);
        setSelectedId(null);
        setDraftLevel(levelFromWorldTemplate(freshWorld));
        setSelection(null);
      }
      return;
    }
    try {
      if (isAdmin) {
        await deletePixelProtocolLevel(levelId);
      } else {
        removePixelProtocolCustomLevel(levelId);
        try {
          await deletePixelProtocolCustomLevel(levelId);
        } catch {
          setStatus("Niveau supprime localement.");
        }
      }
      const remaining = isAdmin
        ? sortAdminLevels(levels.filter((lvl) => lvl.id !== levelId))
        : listPixelProtocolCustomLevels();
      setLevels(remaining);
      setStatus("Niveau supprime.");
      if (selectedId !== levelId) return;
      if (remaining.length > 0) {
        selectLevel(remaining[0]);
      } else {
        const fresh = makeNewLevel([], isAdmin);
        setSelectedId(null);
        setPublished(isAdmin);
        setDraftLevel(withAutoWorldBounds(fresh));
        setSelection(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur suppression niveau");
    }
  }, [
    isAdmin,
    isWorldEditor,
    levels,
    selectLevel,
    selectWorldTemplate,
    selectedId,
    setDraftLevel,
    setError,
    setLevels,
    setPublished,
    setSelectedId,
    setSelection,
    setStatus,
    setWorldTemplates,
  ]);

  const startNewLevel = useCallback(() => {
    if (isWorldEditor) {
      const freshWorld = makeNewWorldTemplate(worldTemplates);
      setSelectedId(null);
      setPublished(false);
      setDraftLevel(levelFromWorldTemplate(freshWorld));
      setSelection(null);
      setPreviewLevel(null);
      resetMessages();
      return;
    }

    const fresh = makeNewLevel(levels, isAdmin);
    setSelectedId(null);
    setPublished(false);
    setDraftLevel(withAutoWorldBounds(fresh));
    setSelection(null);
    setPreviewLevel(null);
    resetMessages();
  }, [
    isAdmin,
    isWorldEditor,
    levels,
    resetMessages,
    setDraftLevel,
    setPreviewLevel,
    setPublished,
    setSelectedId,
    setSelection,
    worldTemplates,
  ]);

  return {
    resetMessages,
    selectLevel,
    selectWorldTemplate,
    refreshLevels,
    saveCurrentCustomDraft,
    save,
    playCurrentLevel,
    publishCurrentLevel,
    removeLevel,
    startNewLevel,
  };
}
