import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, reference, title, address")
    .eq("id", projectId)
    .single();

  if (!project) notFound();

  const { count: itemCount } = await supabase
    .from("checklist_items")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  return (
    <div className="shell">
      <div className="masthead">
        <div className="title-block">
          <span className="eyebrow">{project.reference}</span>
          <h1>{project.title || "(untitled)"}</h1>
          <p className="subtitle">{project.address}</p>
        </div>
        <Link href="/" className="summary-btn">
          ← All projects
        </Link>
      </div>

      <div className="empty-state">
        Project seeded with {itemCount ?? 0} checklist items.
        <br />
        Overview / Checklist / Timeline tabs are built in the next phase.
      </div>
    </div>
  );
}
