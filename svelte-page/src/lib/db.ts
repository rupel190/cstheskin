

export async function fetchImage(env: App.Env, skinId: string, stage: string) {
  const image = await env.DEV_DB.prepare(`
      SELECT image_path
      FROM skin_images
      WHERE skin_id = ? AND stage = ?
    `).bind(skinId, stage).first();
  if (!image) {
    throw new Error("Image for " + skinId + " not found.");
  }
  return image;
}

export async function insertPlayer(env: App.Env, playerUuid: string) {
  await env.DEV_DB.prepare(`
       INSERT INTO players(uuid) VALUES(?)
     `).bind(playerUuid).run();
}

export async function insertPlayerProgress(env: App.Env, playerId: string, skinId: string, stage: string, solved: boolean) {
  await env.DEV_DB.prepare(`
       INSERT INTO player_progress (player_id, skin_id, current_stage, solved)
       VALUES(?, ?, ?, ?)
         ON CONFLICT(player_id, skin_id) DO UPDATE SET
           current_stage = excluded.current_stage,
           solved = excluded.solved
     `).bind(playerId, skinId, stage, solved).run();
  console.log("Insert initial player progress, playerId:", playerId, " skinId:", skinId, " stage:", stage, "solved:", solved);
}

export async function nextUnprogressedSkin(env: App.Env, playerId: string) {
  return await env.DEV_DB.prepare(`
     SELECT id, uuid, name FROM skins
     WHERE NOT EXISTS (
       SELECT 1 FROM player_progress
       WHERE player_id = ?
       AND skin_id = skins.id
     )
     ORDER BY created_at ASC
     LIMIT 1
   `).bind(playerId).first();
}

export async function fetchPlayerId(env: App.Env, playerUuid: string) {
  const player = await env.DEV_DB.prepare(`SELECT id FROM players WHERE uuid = ?`)
    .bind(playerUuid)
    .first<{ id: string }>()
  if (!player?.id) {
    throw new Error("Player for " + playerUuid + " not found.");
  }
  return player.id;
}

export async function fetchSkin(env: App.Env, skinUuid: string) {
  const skin = await env.DEV_DB.prepare(`SELECT id, name FROM skins WHERE uuid = ?`).bind(skinUuid).first()
  if (!skin) {
    throw new Error("Skin for " + skinUuid + " not found.");
  }
  return skin;
}

export async function fetchCurrentProgress(env: App.Env, playerId: string, skinId: string) {
  let progress = await env.DEV_DB
    .prepare("SELECT current_stage, solved FROM player_progress WHERE player_id = ? AND skin_id = ? ORDER BY current_stage DESC")
    .bind(playerId, skinId).first();
  if (!progress) {
    console.error("Progress for playerId " + playerId + " and skinId " + skinId + " not found - defaulting to stage 1 and unsolved.");
    progress = { current_stage: 1, solved: false };
  } else {
    progress.current_stage = Number(progress.current_stage);
  }
  return progress;
}

