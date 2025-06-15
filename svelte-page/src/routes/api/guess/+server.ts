
import type { RequestHandler } from '@sveltejs/kit';
import { fetchCurrentProgress, fetchSkin } from "$lib/db";


// 🎯 Guess
export const GET: RequestHandler = async ({ url, locals, platform }) => {
  const env = platform!.env

  const skinUuid = url.searchParams.get("skinUuid");
  const guess = url.searchParams.get("guess");

  if (!skinUuid || !guess) {
    return new Response("Missing parameters", {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  try {
    const skin = await fetchSkin(env, skinUuid)
    //TODO: fuzzy
    const progress = await fetchCurrentProgress(env, locals.id, skin.id)
    let stage = progress.current_stage
    console.log("Guessing for stage: ", stage);

    if (progress.solved || stage > 5) {
      throw new Error("No guesses left!");
    }

    const solved = skin.name.toLowerCase() === guess.toLowerCase();
    if (solved) {
      console.log("Solved! Inserting progress as playerId: ", locals.id, "skinId:", skin.id, "currentStage: ", stage, " solved: ", solved);
      await insertPlayerProgress(env, locals.id, skin.id, stage, solved);
    } else {
      console.log("Unsolved! Increment current stage and insert progress as playerId: ", locals.id, "skinId:", skin.id, "currentStage: ", stage + 1, " solved: ", solved);
      stage += 1
      await insertPlayerProgress(env, locals.id, skin.id, stage, solved);
    }
    return new Response(JSON.stringify({ stage: stage, solved }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify("Error in handling guess: " + err), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}

