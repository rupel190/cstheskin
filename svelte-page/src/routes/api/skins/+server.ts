import type { RequestHandler } from '@sveltejs/kit';
import { getAllSkins } from '$lib/db';

// TODO: Get only relevant
// 📝 Get all skin names for autocomplete
export const GET: RequestHandler = async ({ platform }) => {
  const env = platform!.env;

  try {
    const result = await getAllSkins(env);

    // Extract just the names for autocomplete - keep it lightweight
    const skinNames = result.results.map((skin: any) => skin.name);

    return new Response(JSON.stringify({
      skinNames: skinNames.sort() // Sort alphabetically for better UX
    }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600" // Cache for 1 hour
      }
    });

  } catch (err) {
    console.error("Error in /api/skins:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch skin names" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};
