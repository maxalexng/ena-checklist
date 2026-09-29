"use client";

import { useFormStatus } from "react-dom";

/** Disabled while the create action runs. Seeding a project takes a few seconds, and with
 * no feedback people clicked again and got duplicate projects. A disabled submit button
 * also blocks Enter-key resubmits from the form's inputs. */
export function CreateProjectButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="roles-add-btn" style={{ padding: "9px 14px" }} disabled={pending}>
      {pending ? "Creating project…" : "Create project"}
    </button>
  );
}
