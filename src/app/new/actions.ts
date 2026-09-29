"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createProject, findRecentDuplicateProject } from "@/lib/projects/createProject";

export async function createProjectAction(formData: FormData) {
  const reference = String(formData.get("reference") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const initialism = String(formData.get("initialism") || "").trim();

  if (!reference) {
    redirect(`/new?error=${encodeURIComponent("Reference is required")}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const input = { reference, title, address, initialism };
  const userId = user?.id ?? null;
  const project =
    (await findRecentDuplicateProject(supabase, input, userId)) ?? (await createProject(supabase, input, userId));

  redirect(`/projects/${project.id}`);
}
