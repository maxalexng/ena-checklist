"use client";

import { useToggleAssignmentsLocked } from "@/hooks/useProjectInfoMutations";
import { useAutoRelock } from "@/hooks/useAutoRelock";

/** The floating buttons at the top right on every tab: Top, then the lock button. The
 * checklist's Next to-do sits under these as the third (see .checklist-fabs). */
export function LockFab({ projectId, locked }: { projectId: string; locked: boolean }) {
  const toggleLocked = useToggleAssignmentsLocked(projectId);
  useAutoRelock(projectId, locked);

  return (
    <div className="fab-stack">
      <button type="button" className="fab" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
        ↑ Top
      </button>
      <button
        type="button"
        className={`fab assign-lock-fab${locked ? " active" : ""}`}
        onClick={() => toggleLocked.mutate({ locked: !locked })}
        title={
          locked
            ? "Locked — role assignments, project info, and step order can't be edited"
            : "Unlocked — auto-relocks after 30s of no activity"
        }
      >
        {locked ? "🔒 Locked" : "🔓 Unlocked"}
      </button>
    </div>
  );
}
