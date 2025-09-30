import type { RequestHandler } from "@sveltejs/kit";
import { fetchImageBySkinUuid } from "$lib/db";
import { getGameState, getSkinProgress, getCurrentStage } from "$lib/cookie-auth";

// 🖼 Get image for specific skin/stage
export const GET: RequestHandler = async ({ url, platform, cookies }) => {
  const env = platform?.env!;
  const skinUuid = url.searchParams.get("skinUuid");
  const requestedStageParam = url.searchParams.get("stage");

  if (!skinUuid || !requestedStageParam) {
    return new Response("Missing skin UUID or stage parameter.", { status: 400 });
  }

  const requestedStage = parseInt(requestedStageParam);
  if (isNaN(requestedStage) || requestedStage < 1 || requestedStage > 5) {
    return new Response("Invalid stage parameter. Must be 1-5.", { status: 400 });
  }

  try {
    const gameState = getGameState(cookies);
    const skinProgress = getSkinProgress(gameState, skinUuid);
    const currentStage = getCurrentStage(skinProgress);

    console.log(`Image request - skinUuid: ${skinUuid}, requestedStage: ${requestedStage}, skinProgress:`, skinProgress, `currentStage: ${currentStage}`);

    // Prevent access to stages beyond current progress, unless skin is solved
    if (requestedStage > currentStage && !skinProgress.solved) {
      console.log(`Access denied - requested ${requestedStage} > current ${currentStage}, not solved`);
      return new Response("Requested stage higher than current stage.", {
        status: 403,
        headers: {
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    const image = await fetchImageBySkinUuid(env, skinUuid, requestedStage);
    const file = await env.IMAGES_BUCKET.get(image.image_path);

    if (!file) {
      return new Response("Image file not found in storage", { status: 404 });
    }

    return new Response(file.body, {
      headers: {
        "Content-Type": "image/jpeg",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err) {
    console.error("Error fetching image:", err);
    return new Response("Error fetching image.", {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}

