// Kept apart from the Supabase client so client components can build photo URLs
// without pulling the client library into the browser bundle.
export function mediaUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/cafe-media/${path}`;
}
