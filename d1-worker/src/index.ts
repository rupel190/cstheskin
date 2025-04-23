const SECRET = "super_secret_server_side_salt"; // TODO: move to env in prod!

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		const { pathname } = url;

		const cookies = parseCookies(request.headers.get("cookie"));

		let userToken = cookies["user"];
		if (!userToken) {
			userToken = await initUser();
		}

		const playerUuid = await verifyToken(userToken);
		if (!playerUuid) {
			// Invalid user
			return new Response("Unverifiable user ID. Delete cookie.", {
				status: 402,
				headers: {
					"Access-Control-Allow-Origin": "*"
				}
			});
		}


		// 🎮 Start game: Return skin and cookie
		if (pathname === "/api/game/start") {

			const skin = await nextUnprogressedSkin()
			if (!skin) {
				return new Response("No unprogressed skins found!", {
					status: 402,
					headers: {
						"Access-Control-Allow-Origin": "*",
						"Set-Cookie": `user=${userToken}; Path=/; HttpOnly`,
					}
				});
			}
			// Return skin
			return new Response(JSON.stringify({ uuid: skin.uuid }), {
				status: 200,
				headers: {
					"Content-Type": "application/json",
					"Set-Cookie": `user=${userToken}; Path=/; HttpOnly`,
					"Access-Control-Allow-Origin": "*"
				}
			});
		}


		// 🖼 Get image for specific skin/stage
		if (pathname === "/api/image" && request.method === "GET") {
			const url = new URL(request.url);

			const skinUuid = url.searchParams.get("skinUuid");
			if (!skinUuid) {
				return new Response("Missing skin UUID parameter.", { status: 400 });
			}

			const skinId = await fetchSkinId(skinUuid)
			const playerId = await fetchPlayerId()

			const image = await fetchImage(playerId, skinId);
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
		}


		// 🎯 Guess
		if (pathname === "/api/guess" && request.method === "GET") {
			const url = new URL(request.url);
			const skinUuid = url.searchParams.get("skinUuid");
			const guess = url.searchParams.get("guess");
			const maxStage = 5;

			if (!skinUuid || !guess) {
				return new Response("Missing parameters", { status: 400 });
			}
			// Fetch skin
			const skin = await env.devDB
				.prepare("SELECT id, name FROM skins WHERE uuid = ?")
				.bind(skinUuid)
				.first();
			if (!skin) {
				return new Response("Skin not found", { status: 404 });
			}
			// Fetch current stage
			const stageRes = await fetchStage(skin.id)

			// Handle guess
			//TODO: fuzzy
			const currentStage = stageRes?.current_stage ?? 1;
			const solved = skin.name.toLowerCase() === guess.toLowerCase();
			const gameOver = solved || (!solved && currentStage === maxStage);

			await insertPlayerProgress(skinUuid, Math.min(currentStage + 1, maxStage).toString(), solved)

			return new Response(JSON.stringify({ currentStage, solved, gameOver }), {
				headers: {
					"Content-Type": "application/json",
					"Access-Control-Allow-Origin": "*"
				}
			});
		}



		// 🎮 New user: Initialize player and return cookie value
		async function initUser() {
			const uuid = crypto.randomUUID();
			const token = await generateUserToken(uuid);
			await insertPlayer(uuid);

			const stage = "1";
			const skin = await nextUnprogressedSkin()
			await insertPlayerProgress(skin.id, stage, false);

			return token;
		}

		async function insertPlayer(uuid: string) {
			try {
				await env.devDB.prepare(`
					INSERT INTO players(uuid) VALUES(?)
				`).bind(uuid).run();
				// return new Response("Player created", { status: 201 });
				console.log("Player created");
			} catch (err) {
				console.error("Error inserting player:", err);
				console.error("Player already exists", { status: 409 }); // 409 Conflict
			}
		}

		async function insertPlayerProgress(skinUuid: string, stage: string, solved: boolean) {
			await env.devDB.prepare(`
					INSERT INTO player_progress (player_id, skin_id, current_stage, solved)
					VALUES(?, ?, ?, ?)
						ON CONFLICT(player_id, skin_id) DO UPDATE SET
							current_stage = excluded.current_stage,
							solved = excluded.solved
				`).bind(fetchPlayerId(), fetchSkinId(skinUuid), stage, solved).run();
		}

		async function nextUnprogressedSkin() {
			return await env.devDB.prepare(`
				SELECT id, uuid, name FROM skins
				WHERE NOT EXISTS (
					SELECT 1 FROM player_progress
					WHERE player_id = (SELECT id FROM players WHERE uuid = ?)
					AND skin_id = skins.id
				)
				ORDER BY created_at ASC
				LIMIT 1
			`).bind(playerUuid).first();
		}

		async function fetchPlayerId() {
			const playerId = await env.devDB.prepare(`SELECT id FROM players WHERE uuid = ?`).bind(playerUuid).first()
			if (!playerId) {
				return new Response("Skin UUID could not be resolved.", {
					status: 400,
					headers: {
						"Access-Control-Allow-Origin": "*"
					}
				});
			}
			return playerId;
		}
		async function fetchSkinId(skinUuid: string) {
			const skinId = await env.devDB.prepare(`SELECT id FROM skins WHERE uuid = ?`).bind(skinUuid).first()
			if (!skinId) {
				return new Response("User UUID could not be resolved.", {
					status: 400,
					headers: {
						"Access-Control-Allow-Origin": "*"
					}
				});
			}
			return skinId;
		}

		async function fetchImage(playerId: string, skinId: string) {
			const image = await env.devDB.prepare(`
		  	SELECT stage, image_path
				FROM skin_images
				WHERE skin_id = ? AND stage = (
					SELECT stage
					FROM player_progress
					WHERE player_id = ? AND skin_id = ?
					ORDER BY DESC
				)
			`).bind(skinId, playerId, skinId).first();
			if (!image) {
				return new Response("Image for player not found", { status: 404 });
			}
			return image;
		}

		async function fetchStage(skinId: string) {
			return await env.devDB
				.prepare("SELECT current_stage FROM player_progress WHERE player_id = ? AND skin_id = ?")
				.bind(await fetchPlayerId(), skinId)
				.first();
		}

		async function verifyToken(token: string) {
			if (typeof token !== "string") {
				return null;
			}
			const [uuid, hash] = token.split(".");
			if (!uuid || !hash) {
				return null;
			}
			const expected = await sha256(uuid + ":" + SECRET);
			return expected === hash ? uuid : null;
		}

		async function generateUserToken(uuid: string) {
			const hash = await sha256(uuid + ":" + SECRET);
			return `${uuid}.${hash}`;
		}

		function parseCookies(header: string | null) {
			return Object.fromEntries((header || "").split(";").map(part => part.trim().split("=")));
		}

		async function sha256(msg: string) {
			const data = new TextEncoder().encode(msg);
			const digest = await crypto.subtle.digest("SHA-256", data);
			return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
		}

		return new Response("Not found", { status: 404 });
	}
};

