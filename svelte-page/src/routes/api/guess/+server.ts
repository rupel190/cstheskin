
import type { RequestHandler } from '@sveltejs/kit';
import { fetchSkinByUuid, getRandomUnsolvedSkin } from "$lib/db";
import { getGameState, getSkinProgress, updateSkinProgress, getCurrentStage } from "$lib/cookie-auth";

function normalizeString(str: string): string {
  return str.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters except spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

function checkGuess(skinName: string, guess: string): { result: 'correct' | 'close' | 'wrong', matchType?: string } {
  const normalizedGuess = normalizeString(guess);

  // Split by "|" BEFORE normalizing to preserve the separator
  const parts = skinName.split('|');
  const weaponPart = parts[0]?.trim();
  const skinPart = parts[1]?.trim();

  // Now normalize each part
  const normalizedSkin = normalizeString(skinName);
  const normalizedWeapon = weaponPart ? normalizeString(weaponPart) : '';
  const normalizedSkinPart = skinPart ? normalizeString(skinPart) : '';

  // Exact match - fully correct
  if (normalizedSkin === normalizedGuess) {
    return { result: 'correct', matchType: 'exact' };
  }

  // Check if the main skin part matches (after "|") - fully correct
  if (normalizedSkinPart && normalizedGuess === normalizedSkinPart) {
    return { result: 'correct', matchType: 'skin_name' };
  }

  // Check if guess includes skin name words - fully correct
  // TODO: Fix false positives from partial matches
  if (normalizedSkinPart) {
    const skinWords = normalizedSkinPart.split(' ');
    const guessWords = normalizedGuess.split(' ');

    if (skinWords.length > 0 && skinWords.every(skinWord =>
      guessWords.some(guessWord =>
        skinWord.includes(guessWord) || guessWord.includes(skinWord)
      )
    )) {
      return { result: 'correct', matchType: 'skin_words' };
    }

    // Allow partial matches for longer skin names - fully correct
    if (normalizedSkinPart.length > 4 && normalizedSkinPart.includes(normalizedGuess) && normalizedGuess.length >= 4) {
      return { result: 'correct', matchType: 'skin_partial' };
    }
  }

  // Check if only weapon part matches - close guess (yellow)
  if (normalizedWeapon && normalizedGuess === normalizedWeapon) {
    return { result: 'close', matchType: 'weapon_only' };
  }

  // Check if guess matches weapon words - close guess (yellow)
  if (normalizedWeapon) {
    const weaponWords = normalizedWeapon.split(' ');
    const guessWords = normalizedGuess.split(' ');

    if (weaponWords.length > 0 && weaponWords.every(weaponWord =>
      guessWords.some(guessWord =>
        weaponWord.includes(guessWord) || guessWord.includes(weaponWord)
      )
    )) {
      return { result: 'close', matchType: 'weapon_words' };
    }
  }

  return { result: 'wrong' };
}

// Guess
export const GET: RequestHandler = async ({ url, platform, cookies }) => {
  const env = platform!.env;

  const skinUuid = url.searchParams.get("skinUuid");
  const guess = url.searchParams.get("guess");

  if (!skinUuid || !guess) {
    return new Response("Missing parameters", {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  try {
    const gameState = getGameState(cookies);
    const skinProgress = getSkinProgress(gameState, skinUuid);
    const currentStage = getCurrentStage(skinProgress);

    // Check if skin is already solved or failed
    if (skinProgress.solved) {
      return new Response(JSON.stringify({
        error: "Skin already solved",
        stage: skinProgress.attempts,
        solved: true
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    if (skinProgress.attempts >= 5) {
      return new Response(JSON.stringify({
        error: "No guesses left",
        stage: 5,
        solved: false
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const skin = await fetchSkinByUuid(env, skinUuid);
    const guessRgsult = checkGuess(skin.name, guess);
    const solved = guessResult.result === 'correct';

    // Update progress: increment attempts, set solved status
    const newAttempts = skinProgress.attempts + 1;
    updateSkinProgress(cookies, skinUuid, newAttempts, solved);

    console.log(`Guess for skin ${skinUuid}: "${guess}" vs "${skin.name}" - ${solved ? 'CORRECT' : 'WRONG'} (attempt ${newAttempts})`);

    // If this was the last attempt and not solved, suggest next skin
    let nextSkin = undefined;
    if (newAttempts >= 5 && !solved) {
      try {
        // Get updated game state to include this failed skin
        const updatedGameState = getGameState(cookies);
        const completedOrFailedSkins = Object.entries(updatedGameState.skin_progress)
          .filter(([_, progress]) => progress.solved || progress.attempts >= 5)
          .map(([skinUuid, _]) => skinUuid);

        const randomSkin = await getRandomUnsolvedSkin(env, completedOrFailedSkins);
        nextSkin = randomSkin ? { uuid: randomSkin.uuid, name: randomSkin.name } : null;
      } catch (err) {
        console.error("Error getting next skin:", err);
      }
    }

    // If solved, show the stage where they solved it
    // If not solved, show the next stage (attempts + 1, max 5)
    const stageToShow = solved ? newAttempts : Math.min(newAttempts + 1, 5);

    return new Response(JSON.stringify({
      stage: stageToShow,
      solved,
      guessResult: guessResult.result,
      matchType: guessResult.matchType,
      skinName: (solved || newAttempts >= 5) ? skin.name : undefined,
      gameOver: newAttempts >= 5 && !solved,
      nextSkin
    }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (err) {
    console.error("Error in handling guess:", err);
    return new Response(JSON.stringify({ error: "Error in handling guess: " + err }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}

