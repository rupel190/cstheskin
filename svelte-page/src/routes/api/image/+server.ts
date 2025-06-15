import type { RequestHandler } from "@sveltejs/kit";
import { fetchImage, fetchCurrentProgress, fetchSkin } from "$lib/db";


// 🖼 Get image for specific skin/stage
export const GET: RequestHandler = async ({ url, locals, platform }) => {
  const env = platform?.env!;
  const skinUuid = url.searchParams.get("skinUuid");
  const requestedStage = url.searchParams.get("stage");

  if (!skinUuid || !requestedStage) {
    return new Response("Missing skin UUID or stage parameter.", { status: 400 });
  }

  try {
    const skin = await fetchSkin(skinUuid)
    // Avoid insecure direct object access
    const progress = await fetchCurrentProgress(env, locals.uuid, skin.id);
    console.log("Current progress: ", progress?.current_stage, requestedStage);

    if (requestedStage > progress?.current_stage) {
      return new Response("Requested stage higher than current stage.", {
        status: 403,
        headers: {
          "Content-Type": "image/jpeg",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    const image = await fetchImage(skin.id, requestedStage);
    const file = await env.IMAGES_BUCKET.get(image.image_path);
    if (!file) {
      return new Response("Image file not in R2", { status: 404 });
    }
    return new Response(file.body, {
      headers: {
        "Content-Type": "image/jpeg",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err) {
    console.error("Error fetching image: ", err);
    return new Response("Error fetching image.", {
      status: 500,
      headers: {
        "Content-Type": "image/jpeg",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

}

