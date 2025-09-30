<script lang="ts">
	import { onMount } from "svelte";

	export let value = "";
	export let placeholder = "Your guess...";
	export let onSubmit: () => void = () => {};
	export let disabled = false;

	let skinNames: string[] = [];
	let suggestions: string[] = [];
	let showDropdown = false;
	let selectedIndex = -1;
	let inputElement: HTMLInputElement;

	function getSuggestions(query: string, allSkinNames: string[]): string[] {
		const normalizedQuery = query.toLowerCase().trim();
		if (!normalizedQuery) return [];

		const startsWithMatches: string[] = [];
		const containsMatches: string[] = [];

		for (const skinName of allSkinNames) {
			const normalizedSkin = skinName.toLowerCase();
			
			if (normalizedSkin.startsWith(normalizedQuery)) {
				startsWithMatches.push(skinName);
			} else if (normalizedSkin.includes(normalizedQuery)) {
				containsMatches.push(skinName);
			}
			
			// Stop early if we have enough suggestions
			if (startsWithMatches.length + containsMatches.length >= 8) {
				break;
			}
		}

		// Combine results: startsWith matches first, then contains matches
		return [...startsWithMatches, ...containsMatches].slice(0, 8);
	}

	$: {
		if (value.trim().length >= 2) {
			suggestions = getSuggestions(value, skinNames);
			showDropdown = suggestions.length > 0;
		} else {
			suggestions = [];
			showDropdown = false;
		}
		selectedIndex = -1;
	}

	async function loadSkinNames() {
		try {
			const res = await fetch('/api/skins');
			const data = await res.json();
			skinNames = data.skinNames || [];
		} catch (err) {
			console.error('Failed to load skin names:', err);
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (!showDropdown) {
			if (event.key === 'Enter') {
				event.preventDefault();
				handleSubmit();
			}
			return;
		}

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
				break;
			case 'ArrowUp':
				event.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, -1);
				break;
			case 'Enter':
				event.preventDefault();
				if (selectedIndex >= 0) {
					selectSuggestion(selectedIndex);
				} else {
					handleSubmit();
				}
				break;
			case 'Escape':
				event.preventDefault();
				hideDropdown();
				break;
		}
	}

	function selectSuggestion(index: number) {
		value = suggestions[index];
		hideDropdown();
		handleSubmit();
	}

	function hideDropdown() {
		showDropdown = false;
		selectedIndex = -1;
	}

	function handleSubmit() {
		if (value.trim()) {
			hideDropdown();
			onSubmit();
		}
	}

	function handleBlur() {
		// Small delay to allow click on suggestions
		setTimeout(() => {
			hideDropdown();
		}, 150);
	}

	onMount(() => {
		loadSkinNames();
	});
</script>

<div class="relative w-full">
	<input
		bind:this={inputElement}
		bind:value
		{placeholder}
		{disabled}
		class="w-full px-4 py-3 bg-slate-800 border-2 border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-400 transition-all duration-300"
		on:keydown={handleKeyDown}
		on:blur={handleBlur}
		autocomplete="off"
	/>

	{#if showDropdown}
		<div class="absolute z-50 w-full mt-2 bg-slate-800 backdrop-blur-sm border-2 border-slate-600 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
			{#each suggestions as suggestion, index}
				<button
					class="w-full px-4 py-3 text-left text-slate-200 hover:bg-orange-600 focus:bg-orange-600 focus:outline-none border-none bg-transparent cursor-pointer transition-colors duration-200"
					class:bg-orange-500={index === selectedIndex}
					class:text-white={index === selectedIndex}
					on:mousedown|preventDefault={() => selectSuggestion(index)}
					on:mouseenter={() => selectedIndex = index}
				>
					{suggestion}
				</button>
			{/each}
		</div>
	{/if}
</div>