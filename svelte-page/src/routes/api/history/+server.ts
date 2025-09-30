import type { RequestHandler } from '@sveltejs/kit';
import { getGameState } from '$lib/cookie-auth';
import { fetchSkinByUuid } from '$lib/db';

export interface GameHistoryItem {
	skinUuid: string;
	skinName: string;
	attempts: number;
	solved: boolean;
	status: 'solved' | 'failed' | 'in_progress';
}

// 📊 Get player's game history
export const GET: RequestHandler = async ({ cookies, platform }) => {
	const env = platform!.env;

	try {
		const gameState = getGameState(cookies);
		const historyItems: GameHistoryItem[] = [];

		// Process each skin in the progress
		for (const [skinUuid, progress] of Object.entries(gameState.skin_progress)) {
			try {
				const skin = await fetchSkinByUuid(env, skinUuid);
				
				let status: 'solved' | 'failed' | 'in_progress';
				if (progress.solved) {
					status = 'solved';
				} else if (progress.attempts >= 5) {
					status = 'failed';
				} else {
					status = 'in_progress';
				}

				historyItems.push({
					skinUuid,
					skinName: skin.name,
					attempts: progress.attempts,
					solved: progress.solved,
					status
				});
			} catch (err) {
				console.warn(`Could not fetch skin ${skinUuid}:`, err);
				// Skip skins that can't be fetched (maybe deleted from DB)
			}
		}

		// Sort by completion status: solved first, then failed, then in progress
		// Within each group, sort by attempts (fewer attempts = better performance)
		historyItems.sort((a, b) => {
			const statusOrder = { 'solved': 0, 'failed': 1, 'in_progress': 2 };
			const statusDiff = statusOrder[a.status] - statusOrder[b.status];
			
			if (statusDiff !== 0) return statusDiff;
			
			// Within same status, sort by attempts
			return a.attempts - b.attempts;
		});

		const stats = {
			totalGames: historyItems.length,
			solved: historyItems.filter(item => item.status === 'solved').length,
			failed: historyItems.filter(item => item.status === 'failed').length,
			inProgress: historyItems.filter(item => item.status === 'in_progress').length,
			averageAttempts: historyItems.length > 0 
				? Math.round((historyItems.reduce((sum, item) => sum + item.attempts, 0) / historyItems.length) * 10) / 10
				: 0
		};

		return new Response(JSON.stringify({
			history: historyItems,
			stats
		}), {
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*"
			}
		});

	} catch (err) {
		console.error("Error in /api/history:", err);
		return new Response(JSON.stringify({ error: "Failed to fetch game history" }), {
			status: 500,
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*"
			}
		});
	}
};