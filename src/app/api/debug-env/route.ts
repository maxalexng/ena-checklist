// TEMPORARY diagnostic route — reveals no secret values, only length and the index/code of
// the first non-Latin1 character (if any) in each Supabase env var, to track down a
// "ByteString" header-encoding error that only reproduces on Vercel. Remove after use.
function firstBadChar(value: string | undefined) {
  if (!value) return { length: 0, badIndex: -1, badCode: null };
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code > 255) return { length: value.length, badIndex: i, badCode: code };
  }
  return { length: value.length, badIndex: -1, badCode: null };
}

export async function GET() {
  return Response.json({
    url: firstBadChar(process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: firstBadChar(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  });
}
