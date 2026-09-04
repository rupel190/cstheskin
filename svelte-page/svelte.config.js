import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		// Served from rupel.xyz/guesstheskin, not its own subdomain. Every internal link and
		// fetch has to go through `$app/paths`'s `base` — SvelteKit does NOT rewrite string
		// literals, so a bare "/api/guess" would hit rupel.xyz's static worker and 404.
		paths: { base: '/guesstheskin' }
	}
};

export default config;
