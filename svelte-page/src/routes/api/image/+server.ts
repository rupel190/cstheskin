import type { RequestHandler } from "@sveltejs/kit";
import { fetchImage, fetchCurrentProgress, fetchSkin } from "$lib/db";
import { initPlayerSession } from "$lib/auth";


// 🖼 Get image for specific skin/stage
export const GET: RequestHandler = async ({ url, locals, platform, cookies }) => {
  const env = platform?.env!;
  const skinUuid = url.searchParams.get("skinUuid");
  const requestedStage = url.searchParams.get("stage");

  if (!skinUuid || !requestedStage) {
    return new Response("Missing skin UUID or stage parameter.", { status: 400 });
  }

  // Initialize authentication
  try {
    await initPlayerSession(env, cookies, locals);
  } catch (err) {
    return new Response("Unauthorized", { status: 403 });
  }

  try {
    const skin = await fetchSkin(env, skinUuid)
    console.log("PARAMS CHECK: locals.id:", locals.id, "skin.id:", skin.id, "types:", typeof locals.id, typeof skin.id);
    // Avoid insecure direct object access
    const progress = await fetchCurrentProgress(env, locals.id, skin.id);
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

    const image = await fetchImage(env, skin.id, requestedStage);
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

