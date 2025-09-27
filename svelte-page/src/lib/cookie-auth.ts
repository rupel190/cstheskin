import type { Cookies } from '@sveltejs/kit';
import { v4 as uuidv4 } from 'uuid';

export interface SkinProgress {
	attempts: number;
	solved: boolean;
}

export interface GameState {
	player_id: string;
	skin_progress: Record<string, SkinProgress>;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(uuid: string): boolean {
	return UUID_REGEX.test(uuid);
}

function parseProgress(progressCookie: string | undefined): Record<string, SkinProgress> {
	if (!progressCookie) return {};

	try {
		const progress = JSON.parse(progressCookie);
		if (typeof progress !== 'object' || progress === null) return {};

		// Validate and sanitize the progress object
		const sanitized: Record<string, SkinProgress> = {};
		for (const [skinUuid, data] of Object.entries(progress)) {
			if (!isValidUUID(skinUuid)) continue;

			if (typeof data === 'object' && data !== null) {
				const { attempts, solved } = data as any;
				if (typeof attempts === 'number' && typeof solved === 'boolean' &&
					attempts >= 0 && attempts <= 5) {
					sanitized[skinUuid] = { attempts, solved };
				}
			}
		}
		return sanitized;
	} catch {
		return {};
	}
}

export function getGameState(cookies: Cookies): GameState {
	let player_id = cookies.get('player_id');

	// Generate new player ID if none exists or invalid
	if (!player_id || !isValidUUID(player_id)) {
		player_id = uuidv4();
		cookies.set('player_id', player_id, {
			path: '/',
			maxAge: 365 * 24 * 60 * 60, // 1 year
			httpOnly: true,
			secure: false // Set to true in production with HTTPS
		});
	}

	const skin_progress = parseProgress(cookies.get('skin_progress'));

	return { player_id, skin_progress };
}

export function updateSkinProgress(cookies: Cookies, skinUuid: string, attempts: number, solved: boolean) {
	if (!isValidUUID(skinUuid) || attempts < 0 || attempts > 5) {
		throw new Error('Invalid skin progress data');
	}

	const gameState = getGameState(cookies);
	gameState.skin_progress[skinUuid] = { attempts, solved };

	cookies.set('skin_progress', JSON.stringify(gameState.skin_progress), {
		path: '/',
		maxAge: 365 * 24 * 60 * 60, // 1 year
		httpOnly: true,
		secure: false // Set to true in production with HTTPS
	});

	return gameState;
}

export function getSkinProgress(gameState: GameState, skinUuid: string): SkinProgress {
	return gameState.skin_progress[skinUuid] || { attempts: 0, solved: false };
}

export function getCurrentStage(progress: SkinProgress): number {
	if (progress.solved) return progress.attempts;
	return Math.min(progress.attempts + 1, 5);
}

export function isCompletedSkin(progress: SkinProgress): boolean {
	return progress.solved;
}

export function isFailedSkin(progress: SkinProgress): boolean {
	return !progress.solved && progress.attempts >= 5;
}