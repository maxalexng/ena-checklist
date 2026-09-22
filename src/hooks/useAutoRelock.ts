import { useEffect, useRef } from "react";
import { useToggleAssignmentsLocked } from "./useProjectInfoMutations";

const AUTO_LOCK_IDLE_MS = 30_000;

/** Auto-relocks the project after 30s of no activity, matching the prototype's own
 * behavior — so an unlocked register doesn't get left open by accident. Only runs while
 * currently unlocked; any click/keydown/input anywhere resets the timer. */
export function useAutoRelock(projectId: string, locked: boolean) {
  const toggleLocked = useToggleAssignmentsLocked(projectId);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (locked) return;

    function reset() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        toggleLocked.mutate({ locked: true });
      }, AUTO_LOCK_IDLE_MS);
    }

    reset();
    document.addEventListener("click", reset, true);
    document.addEventListener("keydown", reset, true);
    document.addEventListener("input", reset, true);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      document.removeEventListener("click", reset, true);
      document.removeEventListener("keydown", reset, true);
      document.removeEventListener("input", reset, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked, projectId]);
}
