"use client";

import { useToggleAssignmentsLocked } from "@/hooks/useProjectInfoMutations";
import { useAutoRelock } from "@/hooks/useAutoRelock";

export function LockFab({ projectId, locked }: { projectId: string; locked: boolean }) {
  const toggleLocked = useToggleAssignmentsLocked(projectId);
  useAutoRelock(projectId, locked);

  return (
    <button
      type="button"
      className={`assign-lock-fab${locked ? " active" : ""}`}
      onClick={() => toggleLocked.mutate({ locked: !locked })}
      title={
        locked
          ? "Locked — role assignments, project info, and step order can't be edited"
          : "Unlocked — auto-relocks after 30s of no activity"
      }
    >
      {locked ? "🔒 Locked" : "🔓 Unlocked"}
    </button>
  );
}
