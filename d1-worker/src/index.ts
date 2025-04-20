// src/index.ts
var index_default = {
	async fetch(request, env) {
		const url = new URL(request.url);
		const { pathname } = url
		const { searchParams } = url

		console.log("HOLADRIAO", request, pathname, searchParams);

		function withCors(response: Response) {
			return new Response(response.body, {
				status: response.status,
				headers: {
					...Object.fromEntries(response.headers),
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type",
				},
			});
		}


		// Insert new skin
		if (pathname === "/api/skins/insert") {
			console.log("Insert skin!");
			try {
				const name = searchParams.get("name")?.trim();
				const encryptedName = searchParams.get("encrypted_name")?.trim();

				if (!name || !encryptedName) {
					return withCors(new Response("Missing name or encrypted_name", { status: 400 }));
				}

				const skinUuid = crypto.randomUUID();

				await env.devDB
					.prepare(`
						INSERT INTO skins (uuid, name, encrypted_name)
						VALUES (?, ?, ?)
						ON CONFLICT(uuid)
						DO UPDATE SET name = excluded.name, encrypted_name = excluded.encrypted_name
					`)
					.bind(skinUuid, name, encryptedName)
					.run();
				return withCors(Response.json({ message: "Skin created, reference images using", uuid: skinUuid }));
			} catch (error) {
				console.error("Error inserting skin:", error);
				return withCors(new Response("Internal Server Error", { status: 500 }));
			}
		}

		// Insert new player
		if (request.method === "GET" && pathname === "/api/player/new") {
			try {
				const name = searchParams.get("name");
				const playerUuid = crypto.randomUUID(); // Generate unique UUID

				if (!name) {
					await env.devDB
						.prepare("INSERT INTO players (uuid) VALUES (?)")
						.bind(playerUuid)
						.run() // Use .run() for INSERT
				} else {
					await env.devDB
						.prepare("INSERT INTO players (uuid, name) VALUES (?, ?)")
						.bind(playerUuid, name)
						.run()
				}
				return withCors(Response.json({ message: "Player created", uuid: playerUuid }));
			} catch (error) {
				console.error("Error inserting player:", error);
				return withCors(new Response("Internal Server Error", { status: 500 }));
			}
		}

		// (Debug) Get skin by name
		if (request.method === "GET" && pathname === "/api/skins") {
			try {
				let name = searchParams.get("name");
				const query = await env.devDB.prepare("SELECT * FROM skins WHERE name = ?").bind(name);
				const { results } = await query.all();
				console.log("Query results:", results);
				return withCors(Response.json(results));
			} catch (error) {
				console.error("Error executing query:", error);
				return withCors(new Response("Internal Server Error", { status: 500 }));
			}
		}

		// Get skin details by uuid
		if (request.method === "GET" && pathname === "/api/skins") {
			try {
				const uuid = searchParams.get("uuid");
				const query = await env.devDB.prepare("SELECT * FROM skins WHERE uuid = ?").bind(uuid);
				const { results } = await query.all();
				console.log("fetched skin: ", results);
				return withCors(Response.json(results));
			} catch (error) {
				console.error("Error executing query:", error);
				return withCors(new Response("Internal Server Error", { status: 500 }));
			}
		}


		// Get most recently added skin uuid
		if (request.method === "GET" && url.pathname === "/api/skins/latest") {
			// Fetch random skin
			const result = await env.devDB
				.prepare(
					"SELECT uuid FROM skins ORDER BY created_at DESC"
				)
				.first();
			console.log("Most recently added skin: ", result)
			return withCors(Response.json(result));
		}

		// TODO: Get random skin uuids
		if (request.method === "GET" && url.pathname === "/api/skins/random") {
			// Fetch random skin
			const result = await env.devDB
				.prepare(
					"SELECT uuid FROM skins ORDER BY created_at DESC"
				)
				.first();
			console.log("Random skin: ", result)
			return withCors(Response.json(result));
		}



		// (DEBUG) Get player by uuid
		if (url.pathname === "/api/player") {
			try {
				const uuid = searchParams.get("uuid");
				const { results } = await env.devDB.prepare(
					"SELECT * FROM players WHERE uuid = ?")
					.bind(uuid)
					.all();
				return withCors(Response.json(results));

			} catch (error) {
				console.error("Error getting player by uuid:", error);
				return withCors(new Response("Internal Server Error", { status: 500 }));
			}
		}

		// Get player progress per uuid
		if (request.method === "GET" && url.pathname === "/api/progress") {
			try {
				const uuid = searchParams.get("uuid");
				const { results } = await env.devDB.prepare(
					"SELECT skin, current_stage, solved FROM player_progress WHERE player_id = (SELECT id FROM players WHERE uuid = ?)")
					.bind(uuid)
					.all();
				return withCors(Response.json(results));

			} catch (error) {
				console.error("Error getting player progress by uuid:", error);
				return withCors(new Response("Internal Server Error", { status: 500 }));
			}
		}

		// Get image for skin and stage
		if (request.method === "GET" && url.pathname === "/api/image") {
			const uuid = searchParams.get("uuid");
			const stage = searchParams.get("stage") || "1";

			console.log("\nuuid:", uuid, "| stage:", stage)
			console.log("ENV R2 available?", typeof env.IMAGES_BUCKET, env.IMAGES_BUCKET);
			const list = await env.IMAGES_BUCKET.list();
			console.log("Available objects in R2:", list.objects.map(o => o.key));

			try {
				const imageResult = await env.devDB
					.prepare(`
						SELECT image_path FROM skin_images
						WHERE skin_id = (SELECT id FROM skins WHERE uuid = ?)
						AND stage = ?`)
					.bind(uuid, stage)
					.first();
				console.log("Query result:", imageResult);


				if (!imageResult) {
					return withCors(new Response("Image not found: " + imageResult, { status: 404 }));
				}
				const object = await env.IMAGES_BUCKET.get(imageResult.image_path);
				if (!object) {
					return withCors(new Response("Image not in R2: " + imageResult.image_path, { status: 404 }));
				}

				return withCors(new Response(object.body, {
					headers: {
						"Content-Type": "image/jpeg", // or detect from filename
						"Cache-Control": "public, max-age=3600"
					}
				}));
			} catch (error) {
				console.error("Error fetching image from R2:", error);
				return withCors(new Response("Error fetching image", { status: 500 }));
			}
		}

		// Insert new image data for skin
		/*
		 * Example json input
			{
				"uuid": "0d7cd531-4b37-4437-ad0f-cb73e976026a",
				"images": [
					{ "stage": 1, "image_path": "redline_test1.png" },
					{ "stage": 2, "image_path": "redline_test2.png" },
					{ "stage": 3, "image_path": "redline_test3.png" },
					{ "stage": 4, "image_path": "redline_test4.png" },
					{ "stage": 5, "image_path": "redline_test5.png" }
				]
			}
			* */
		if (request.method === "POST" && url.pathname === "/api/image") {
			try {
				const { uuid, images } = await request.json();

				if (!uuid || !Array.isArray(images)) {
					return withCors(new Response("Invalid payload", { status: 400 }));
				}

				const skin = await env.devDB
					.prepare("SELECT id FROM skins WHERE uuid = ?")
					.bind(uuid)
					.first();

				if (!skin) {
					return withCors(new Response("Skin for given uuid not found", { status: 404 }));
				}

				const stmt = await env.devDB.prepare(`
					INSERT INTO skin_images (skin_id, stage, image_path)
					VALUES (?, ?, ?)
					ON CONFLICT(skin_id, stage)
					DO UPDATE SET image_path = excluded.image_path
				`);

				for (const { stage, image_path } of images) {
					await stmt.bind(skin.id, stage, image_path).run();
				}

				return withCors(Response.json({ message: "Images upserted successfully" }));
			} catch (error) {
				console.error("Error inserting/updating skin images:", error);
				return withCors(new Response("Internal Server Error", { status: 500 }));
			}
		}

		//



		// 💷 Guess 🎰 the 🎰 skin 💷
		if (url.pathname === "/api/guess/") {
			try {
				const { uuid, guess_input } = await request.json();

				const { results } = await env.devDB.prepare(
					"SELECT count(*) FROM skins WHERE uuid = ? AND name = ?")
					.bind(uuid, guess_input)
					.first();
				return withCors(Response.json(results));

			} catch (error) {
				console.error("Error getting image by skin and stage:", error);
				return withCors(new Response("Internal Server Error", { status: 500 }));
			}
		}

		// Save player progress
		if (request.method === "POST" && url.pathname === "/api/progress") {
			try {
				const { player_uuid, skin_uuid, current_stage, solved } = await request.json();

				await env.devDB
					.prepare(`
							INSERT INTO player_progress (player_id, skin_id, current_stage, solved)
							VALUES (
									(SELECT id FROM players WHERE uuid = ?),
									(SELECT id FROM skins WHERE uuid = ?),
									?, ?
							)
							ON CONFLICT(player_id, skin_id)
							DO UPDATE SET
									current_stage = excluded.current_stage,
									solved = excluded.correct`)
					.bind(player_uuid, skin_uuid, current_stage, solved)
					.run() // Use .run() for INSERT
				return withCors(Response.json({ message: "Player progress updated" }));
			} catch (error) {
				console.error("Error inserting player:", error);
				return withCors(new Response("Internal Server Error", { status: 500 }));
			}
		}


		if (pathname === "/") {
			return withCors(new Response("Worker is running! Try hitting a real /api/ endpoint."));
		}

		if (pathname === "/favicon.ico") {
			return withCors(new Response(null, { status: 204 }));
		}
		return new Response(
			JSON.stringify({ error: "Endpoint not found", path: url.pathname }),
			{ status: 404, headers: { "Content-Type": "application/json" } }
		);

	}
};
export {
	index_default as default
};
//# sourceMappingURL=index.js.map
