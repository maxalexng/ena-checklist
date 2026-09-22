import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProjectShell } from "@/components/ProjectShell";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).single();

  if (!project) notFound();

  return <ProjectShell projectId={projectId} />;
}
