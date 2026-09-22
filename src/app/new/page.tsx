import Link from "next/link";
import { createProjectAction } from "./actions";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="shell" style={{ maxWidth: "560px" }}>
      <div className="masthead">
        <div className="title-block">
          <span className="eyebrow">New Project</span>
          <h1>Create a project</h1>
          <p className="subtitle">
            Seeds a full checklist from the current template — every item starts at
            &quot;Not started&quot;.
          </p>
        </div>
      </div>

      <form
        action={createProjectAction}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "12px",
          padding: "20px",
          boxShadow: "var(--shadow)",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span className="mono" style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--ink-soft)" }}>
            Reference *
          </span>
          <input name="reference" required placeholder="ENA-21207" className="search-input" />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span className="mono" style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--ink-soft)" }}>
            Title
          </span>
          <input name="title" placeholder="Project title" className="search-input" />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span className="mono" style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--ink-soft)" }}>
            Address
          </span>
          <input name="address" className="search-input" />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span className="mono" style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--ink-soft)" }}>
            Initialism
          </span>
          <input name="initialism" placeholder="2AH" className="search-input" />
        </label>

        {error && <div style={{ color: "var(--danger)", fontSize: "13px" }}>{error}</div>}

        <div style={{ display: "flex", gap: "10px" }}>
          <button type="submit" className="roles-add-btn" style={{ padding: "9px 14px" }}>
            Create project
          </button>
          <Link href="/" className="summary-btn" style={{ display: "inline-flex", alignItems: "center" }}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
