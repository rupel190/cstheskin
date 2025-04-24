const SECRET = "super_secret_server_side_salt"; // TODO: move to env in prod!

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		const { pathname } = url;

		const _cookies = parseCookies(request.headers.get("cookie"));

		let _userToken = _cookies["user"];
		let _playerUuid: string = "invalid_uuid";
		let _playerId: string = "invalid_id";

		if (!_userToken) {
			_playerUuid = await createPlayer();
			_playerId = await fetchPlayerId(_playerUuid)
			// await initPlayer(_playerId);
			_userToken = await generateUserToken(_playerUuid);
		} else {
			_playerUuid = await verifyToken(_userToken);
			_playerId = await fetchPlayerId(_playerUuid);
		}

		if (!_playerUuid) {
			// Invalid user
			return new Response("Unverifiable user ID. Delete cookie.", {
				status: 403,
				headers: {
					"Access-Control-Allow-Origin": "*"
				}
			});
		}


		// 🎮 Start game: Return skin and cookie
		if (pathname === "/api/game/start") {
			try {
				const skin = await nextUnprogressedSkin(_playerId);
				// Return skin
				return new Response(JSON.stringify({ uuid: skin.uuid }), {
					status: 200,
					headers: {
						"Content-Type": "application/json",
						"Set-Cookie": `user=${_userToken}; Path=/; HttpOnly`,
						"Access-Control-Allow-Origin": "*"
					}
				});
			} catch (err) {
				console.error(err);
				return new Response("No unprogressed skins found!", {
					status: 404,
					headers: {
						"Access-Control-Allow-Origin": "*",
						"Set-Cookie": `user=${_userToken}; Path=/; HttpOnly`,
					}
				});
			}
		}


		// 🖼 Get image for specific skin/stage
		if (pathname === "/api/image" && request.method === "GET") {
			const url = new URL(request.url);

			const skinUuid = url.searchParams.get("skinUuid");
			const requestedStage = url.searchParams.get("stage");
			if (!skinUuid || !requestedStage) {
				return new Response("Missing skin UUID or stage parameter.", { status: 400 });
			}

			try {
				const skin = await fetchSkin(skinUuid)
				const progress = await fetchCurrentProgress(_playerId, skin.id);
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


		// 🎯 Guess
		if (pathname === "/api/guess" && request.method === "GET") {
			const url = new URL(request.url);
			const skinUuid = url.searchParams.get("skinUuid");
			const guess = url.searchParams.get("guess");
			// const maxStage = 5;

			if (!skinUuid || !guess) {
				return new Response("Missing parameters", {
					status: 400,
					headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
				});
			}

			try {
				const skin = await fetchSkin(skinUuid)
				//TODO: fuzzy
				const progress = await fetchCurrentProgress(_playerId, skin.id)
				const stage = progress?.current_stage ?? 1;
				console.log("Guessing for stage: ", stage);

				if (progress.solved || stage > 5) {
					throw new Error("No guesses left!");
				}

				const solved = skin.name.toLowerCase() === guess.toLowerCase();
				if (solved) {
					console.log("Solved! Inserting progress as playerId: ", _playerId, "skinId:", skin.id, "currentStage: ", stage, " solved: ", solved);
					await insertPlayerProgress(_playerId, skin.id, stage, solved);
				} else {
					console.log("Unsolved! Increment current stage and insert progress as playerId: ", _playerId, "skinId:", skin.id, "currentStage: ", stage + 1, " solved: ", solved);
					await insertPlayerProgress(_playerId, skin.id, stage + 1, solved);
				}

				return new Response(JSON.stringify({ stage, solved }), {
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



		// 🎮 New user: Initialize player and return cookie value
		async function createPlayer() {
			const uuid = crypto.randomUUID()
			await insertPlayer(uuid);
			return uuid;
		}

		// async function initPlayer(playerId: string) {
		// 	const stage = "1";
		// 	const skin = await nextUnprogressedSkin(playerId)
		//
		// 	await insertPlayerProgress(playerId, skin.id, stage, false);
		// }

		async function insertPlayer(playerUuid: string) {
			await env.devDB.prepare(`
					INSERT INTO players(uuid) VALUES(?)
				`).bind(playerUuid).run();
		}

		async function insertPlayerProgress(playerId: string, skinId: string, stage: string, solved: boolean) {
			await env.devDB.prepare(`
					INSERT INTO player_progress (player_id, skin_id, current_stage, solved)
					VALUES(?, ?, ?, ?)
						ON CONFLICT(player_id, skin_id) DO UPDATE SET
							current_stage = excluded.current_stage,
							solved = excluded.solved
				`).bind(playerId, skinId, stage, solved).run();
			console.log("Insert initial player progress: ", playerId, skinId, stage, solved);
		}

		async function nextUnprogressedSkin(playerId: string) {
			return await env.devDB.prepare(`
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


		async function fetchPlayerId(playerUuid: string) {
			const player = await env.devDB.prepare(`SELECT id FROM players WHERE uuid = ?`).bind(playerUuid).first()
			if (!player.id) {
				throw new Error("Player for " + playerUuid + " not found.");
			}
			return player.id;
		}


		async function fetchSkin(skinUuid: string) {
			const skin = await env.devDB.prepare(`SELECT id, name FROM skins WHERE uuid = ?`).bind(skinUuid).first()
			if (!skin) {
				throw new Error("Skin for " + skinUuid + " not found.");
			}
			return skin;
		}

		//TODO: fetchImage should just take a skinId and a stage!!
		async function fetchImage(skinId: string, stage: string) {
			const image = await env.devDB.prepare(`
		  	SELECT image_path
				FROM skin_images
				WHERE skin_id = ? AND stage = ?
			`).bind(skinId, stage).first();
			if (!image) {
				throw new Error("Image for " + skinId + " not found.");
			}
			return image;
		}

		async function fetchCurrentProgress(playerId: string, skinId: string) {
			const progress = await env.devDB
				.prepare("SELECT current_stage, solved FROM player_progress WHERE player_id = ? AND skin_id = ? ORDER BY current_stage DESC")
				.bind(playerId, skinId).first();
			// if (!progress) {
			// 	throw new Error("Progress for " + playerId + " and " + skinId + " not found.");
			// }
			return progress;
		}

		async function verifyToken(token: string) {
			if (typeof token !== "string") {
				return "invalid_token";
			}
			const [uuid, hash] = token.split(".");
			if (!uuid || !hash) {
				return "invalid_token";
			}
			const expected = await sha256(uuid + ":" + SECRET);
			return expected === hash ? uuid : "invalid_token";
		}

		async function generateUserToken(playerUuid: string) {
			const hash = await sha256(playerUuid + ":" + SECRET);
			return `${playerUuid}.${hash}`;
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

