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

// Progress stays in the cookie on purpose — it's per-player throwaway state and putting it in
// D1 would mean a row per visitor for a game nobody has to sign up for.
//
// But a cookie is client-controlled, and `httpOnly` does NOT change that: it stops page
// JavaScript from *reading* the cookie, not the person from *setting* one. Unsigned, anybody
// could send {"<uuid>":{"attempts":5,"solved":true}} and the stage gate in /api/image would
// wave them through to the full skin. So the cookie carries an HMAC and we only trust progress
// whose signature we can reproduce.
//
// Shape: "<base64url json>.<base64url hmac>"

const COOKIE_OPTS = {
	path: '/',
	maxAge: 365 * 24 * 60 * 60, // 1 year
	httpOnly: true,
	secure: true,
	sameSite: 'lax'
} as const;

const enc = new TextEncoder();

function b64url(bytes: ArrayBuffer | Uint8Array): string {
	const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
	return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function unb64url(s: string): string {
	const pad = s.replace(/-/g, '+').replace(/_/g, '/');
	return atob(pad + '='.repeat((4 - (pad.length % 4)) % 4));
}

async function key(secret: string): Promise<CryptoKey> {
	return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
		'sign'
	]);
}

async function sign(payload: string, secret: string): Promise<string> {
	return b64url(await crypto.subtle.sign('HMAC', await key(secret), enc.encode(payload)));
}

/** Constant-time compare, so a wrong signature can't be narrowed down by timing. */
function safeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

/**
 * The signing secret. Set it once with:
 *   npx wrangler secret put COOKIE_SECRET
 *
 * Without it there is nothing to sign with, so every stored progress cookie is rejected and
 * players simply start fresh — annoying, never insecure. It shouts rather than failing quietly.
 */
function secretOf(platform: App.Platform | undefined): string | null {
	const s = (platform?.env as { COOKIE_SECRET?: string } | undefined)?.COOKIE_SECRET;
	if (!s) {
		console.warn('[cookie-auth] COOKIE_SECRET is not set — progress cookies are being discarded. Run: npx wrangler secret put COOKIE_SECRET');
		return null;
	}
	return s;
}

/** Shape-check whatever came out of the cookie. Signature is verified separately. */
function parseProgress(json: string | undefined): Record<string, SkinProgress> {
	if (!json) return {};

	try {
		const progress = JSON.parse(json);
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

/** Verify the HMAC, then shape-check. A bad or unsigned cookie yields no progress. */
async function readProgress(
	cookie: string | undefined,
	secret: string | null
): Promise<Record<string, SkinProgress>> {
	if (!cookie || !secret) return {};

	const dot = cookie.lastIndexOf('.');
	if (dot < 1) return {}; // unsigned — from before signing, or forged

	const payload = cookie.slice(0, dot);
	const given = cookie.slice(dot + 1);
	if (!safeEqual(given, await sign(payload, secret))) return {};

	try {
		return parseProgress(unb64url(payload));
	} catch {
		return {};
	}
}

/**
 * Browsers silently drop a cookie over ~4096 bytes, which would wipe every skin at once. An
 * entry costs ~90 bytes signed, so the ceiling is around 44 — keep well under it and evict the
 * least-recently-touched first. Object key order is insertion order, and touched keys are
 * re-inserted at the end by the caller, so slicing off the front is a genuine LRU.
 */
const MAX_TRACKED_SKINS = 35;

function trim(progress: Record<string, SkinProgress>): Record<string, SkinProgress> {
	const keys = Object.keys(progress);
	if (keys.length <= MAX_TRACKED_SKINS) return progress;
	return Object.fromEntries(keys.slice(-MAX_TRACKED_SKINS).map((k) => [k, progress[k]]));
}

async function writeProgress(
	cookies: Cookies,
	progress: Record<string, SkinProgress>,
	secret: string | null
): Promise<void> {
	if (!secret) return; // nothing to sign with — don't write a cookie we'd reject on read
	const payload = b64url(enc.encode(JSON.stringify(trim(progress))));
	cookies.set('skin_progress', `${payload}.${await sign(payload, secret)}`, COOKIE_OPTS);
}

export async function getGameState(cookies: Cookies, platform?: App.Platform): Promise<GameState> {
	let player_id = cookies.get('player_id');

	// Generate new player ID if none exists or invalid
	if (!player_id || !isValidUUID(player_id)) {
		player_id = uuidv4();
		cookies.set('player_id', player_id, COOKIE_OPTS);
	}

	const skin_progress = await readProgress(cookies.get('skin_progress'), secretOf(platform));

	return { player_id, skin_progress };
}

export async function updateSkinProgress(
	cookies: Cookies,
	skinUuid: string,
	attempts: number,
	solved: boolean,
	platform?: App.Platform
): Promise<GameState> {
	if (!isValidUUID(skinUuid) || attempts < 0 || attempts > 5) {
		throw new Error('Invalid skin progress data');
	}

	const gameState = await getGameState(cookies, platform);
	// Delete-then-set moves the key to the end of insertion order, which is what makes the
	// eviction in `trim` least-recently-touched rather than arbitrary.
	delete gameState.skin_progress[skinUuid];
	gameState.skin_progress[skinUuid] = { attempts, solved };

	await writeProgress(cookies, gameState.skin_progress, secretOf(platform));

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
