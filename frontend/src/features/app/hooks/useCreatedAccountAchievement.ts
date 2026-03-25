import { useEffect, useRef } from "react";

type CreatedAccountAchievementArgs = {
  checkAchievements: (context: { custom: { created_account: true } }) => void;
  userId: number | string | null | undefined;
};

export function useCreatedAccountAchievement({
  checkAchievements,
  userId,
}: CreatedAccountAchievementArgs) {
  const checkAchievementsRef = useRef(checkAchievements);

  useEffect(() => {
    checkAchievementsRef.current = checkAchievements;
  }, [checkAchievements]);

  useEffect(() => {
    if (!userId) return;

    const storageKey = `achievement-created-account:${userId}`;

    try {
      if (sessionStorage.getItem(storageKey)) return;
      checkAchievementsRef.current({ custom: { created_account: true } });
      sessionStorage.setItem(storageKey, "1");
    } catch {
      checkAchievementsRef.current({ custom: { created_account: true } });
    }
  }, [userId]);
}
