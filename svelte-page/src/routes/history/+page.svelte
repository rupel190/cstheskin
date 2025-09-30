<script lang="ts">
	import { onMount } from "svelte";
	import type { GameHistoryItem } from "../api/history/+server.js";

	interface GameStats {
		totalGames: number;
		solved: number;
		failed: number;
		inProgress: number;
		averageAttempts: number;
	}

	let history: GameHistoryItem[] = [];
	let stats: GameStats = {
		totalGames: 0,
		solved: 0,
		failed: 0,
		inProgress: 0,
		averageAttempts: 0
	};
	let loading = true;
	let filter = 'all'; // 'all', 'solved', 'failed', 'in_progress'

	async function loadHistory() {
		loading = true;
		try {
			const res = await fetch('/api/history');
			const data = await res.json();
			history = data.history || [];
			stats = data.stats || stats;
		} catch (err) {
			console.error('Failed to load history:', err);
		} finally {
			loading = false;
		}
	}

	// TODO(human) - Implement filtering logic
	function getFilteredHistory(history: GameHistoryItem[], filter: string): GameHistoryItem[] {
		// Your task: filter the history array based on the selected filter
		// filter can be: 'all', 'solved', 'failed', 'in_progress'
		// Return the filtered array
		return history;
	}

	$: filteredHistory = getFilteredHistory(history, filter);

	function getStageDisplay(attempts: number, solved: boolean): string {
		if (solved) return `${attempts}/5`;
		if (attempts >= 5) return "5/5";
		return `${attempts}/5`;
	}

	function getStatusColor(status: string): string {
		switch (status) {
			case 'solved': return 'bg-green-100 text-green-800 border-green-200';
			case 'failed': return 'bg-red-100 text-red-800 border-red-200';
			case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
			default: return 'bg-gray-100 text-gray-800 border-gray-200';
		}
	}

	function getStatusIcon(status: string): string {
		switch (status) {
			case 'solved': return '✅';
			case 'failed': return '❌';
			case 'in_progress': return '🎯';
			default: return '❓';
		}
	}

	onMount(() => {
		loadHistory();
	});
</script>

<svelte:head>
	<title>Game History - CS The Skin</title>
</svelte:head>

<div class="max-w-6xl mx-auto p-6">
	<div class="text-center mb-8">
		<h1 class="text-3xl font-bold mb-2">Your Game History</h1>
		<p class="text-gray-600">Track your progress guessing CS skins</p>
	</div>

	{#if loading}
		<div class="text-center py-12">
			<div class="text-lg">Loading your game history...</div>
		</div>
	{:else if history.length === 0}
		<div class="text-center py-12">
			<h2 class="text-xl font-semibold mb-4">No games played yet!</h2>
			<p class="text-gray-600 mb-6">Start playing to build your game history</p>
			<a 
				href="/" 
				class="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
			>
				Play Now
			</a>
		</div>
	{:else}
		<!-- Stats Section -->
		<div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
			<div class="bg-white p-4 rounded-lg border text-center">
				<div class="text-2xl font-bold text-gray-900">{stats.totalGames}</div>
				<div class="text-sm text-gray-600">Total Games</div>
			</div>
			<div class="bg-green-50 p-4 rounded-lg border border-green-200 text-center">
				<div class="text-2xl font-bold text-green-800">{stats.solved}</div>
				<div class="text-sm text-green-600">Solved</div>
			</div>
			<div class="bg-red-50 p-4 rounded-lg border border-red-200 text-center">
				<div class="text-2xl font-bold text-red-800">{stats.failed}</div>
				<div class="text-sm text-red-600">Failed</div>
			</div>
			<div class="bg-blue-50 p-4 rounded-lg border border-blue-200 text-center">
				<div class="text-2xl font-bold text-blue-800">{stats.inProgress}</div>
				<div class="text-sm text-blue-600">In Progress</div>
			</div>
			<div class="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
				<div class="text-2xl font-bold text-gray-800">{stats.averageAttempts}</div>
				<div class="text-sm text-gray-600">Avg Attempts</div>
			</div>
		</div>

		<!-- Filter Buttons -->
		<div class="flex flex-wrap gap-2 mb-6">
			<button
				class="px-4 py-2 rounded-lg font-medium transition-colors"
				class:bg-gray-900={filter === 'all'}
				class:text-white={filter === 'all'}
				class:bg-gray-100={filter !== 'all'}
				class:text-gray-700={filter !== 'all'}
				on:click={() => filter = 'all'}
			>
				All Games ({stats.totalGames})
			</button>
			<button
				class="px-4 py-2 rounded-lg font-medium transition-colors"
				class:bg-green-600={filter === 'solved'}
				class:text-white={filter === 'solved'}
				class:bg-green-100={filter !== 'solved'}
				class:text-green-700={filter !== 'solved'}
				on:click={() => filter = 'solved'}
			>
				✅ Solved ({stats.solved})
			</button>
			<button
				class="px-4 py-2 rounded-lg font-medium transition-colors"
				class:bg-red-600={filter === 'failed'}
				class:text-white={filter === 'failed'}
				class:bg-red-100={filter !== 'failed'}
				class:text-red-700={filter !== 'failed'}
				on:click={() => filter = 'failed'}
			>
				❌ Failed ({stats.failed})
			</button>
			<button
				class="px-4 py-2 rounded-lg font-medium transition-colors"
				class:bg-blue-600={filter === 'in_progress'}
				class:text-white={filter === 'in_progress'}
				class:bg-blue-100={filter !== 'in_progress'}
				class:text-blue-700={filter !== 'in_progress'}
				on:click={() => filter = 'in_progress'}
			>
				🎯 In Progress ({stats.inProgress})
			</button>
		</div>

		<!-- Games Grid -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each filteredHistory as game}
				<div class="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
					<div class="flex items-start justify-between mb-3">
						<h3 class="font-semibold text-gray-900 text-sm leading-tight flex-1 mr-2">
							{game.skinName}
						</h3>
						<span class="text-2xl">{getStatusIcon(game.status)}</span>
					</div>
					
					<div class="flex items-center justify-between">
						<span class={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(game.status)}`}>
							{game.status.replace('_', ' ')}
						</span>
						<span class="text-sm font-mono text-gray-600">
							{getStageDisplay(game.attempts, game.solved)}
						</span>
					</div>
				</div>
			{/each}
		</div>

		{#if filteredHistory.length === 0}
			<div class="text-center py-8">
				<p class="text-gray-600">No games match the selected filter</p>
			</div>
		{/if}

		<!-- Back to Game Button -->
		<div class="text-center mt-12">
			<a 
				href="/" 
				class="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
			>
				← Back to Game
			</a>
		</div>
	{/if}
</div>