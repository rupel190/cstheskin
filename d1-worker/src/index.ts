export interface Env {
	// If you set another name in the Wrangler config file for the value for 'binding',
	// replace "DB" with the variable name you defined.
	devDB: D1Database;
}

export default {
	async fetch(request, env): Promise<Response> {
		const { pathname } = new URL(request.url);

		if (pathname === "/api/skins") {
			// If you did not use `DB` as your binding name, change it here
			const { results } = await env.devDB.prepare(
				"SELECT * FROM skins where name = ?",
			)
				.bind("redlangos")
				.all();
			return Response.json(results);
		}

		return new Response(
			"Call /api/skins to get a skin per name",
		);
	},
} satisfies ExportedHandler<Env>;
