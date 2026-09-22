import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./login/actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, reference, title, address, current_stage, archived")
    .eq("archived", false)
    .order("created_at", { ascending: false });

  return (
    <div className="shell">
      <div className="masthead">
        <div className="title-block">
          <span className="eyebrow">ENA</span>
          <h1>Submissions Register</h1>
          <p className="subtitle">{user?.email}</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <Link href="/new" className="roles-add-btn" style={{ display: "inline-flex", alignItems: "center" }}>
            + New Project
          </Link>
          <form action={signOut}>
            <button type="submit" className="summary-btn">
              Sign out
            </button>
          </form>
        </div>
      </div>

      {!projects || projects.length === 0 ? (
        <div className="empty-state">No projects yet. Create the first one.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="agency"
              style={{ display: "block", padding: "16px 18px", textDecoration: "none", color: "inherit" }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: "12px", flexWrap: "wrap" }}>
                <span className="code-badge">{p.reference}</span>
                <h3 style={{ fontSize: "16px" }}>{p.title || "(untitled)"}</h3>
              </div>
              {p.address && (
                <p style={{ color: "var(--ink-soft)", fontSize: "13px", marginTop: "4px" }}>{p.address}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
