import type { RequestHandler } from '@sveltejs/kit';
import { getGameState } from '$lib/cookie-auth';
import { getRandomUnsolvedSkin } from '$lib/db';

// 🎮 Get a random unsolved skin for the player
export const GET: RequestHandler = async ({ cookies, platform }) => {
  const env = platform!.env;

  try {
    const gameState = getGameState(cookies);

    // Get list of solved skin UUIDs
    const solvedSkinUuids = Object.entries(gameState.skin_progress)
      .filter(([_, progress]) => progress.solved)
      .map(([skinUuid, _]) => skinUuid);

    // Get a random unsolved skin
    const skin = await getRandomUnsolvedSkin(env, solvedSkinUuids);

    if (!skin) {
      return new Response(JSON.stringify({ message: "No more skins available!" }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    return new Response(JSON.stringify({ uuid: skin.uuid, name: skin.name }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err) {
    console.error("Error in /api/game/start:", err);
    return new Response("Internal server error", {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};


