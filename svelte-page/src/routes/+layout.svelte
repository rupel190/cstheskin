<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

<!--
	Site-wide head defaults only. Anything that varies per route — title, description,
	canonical, og:title/description — belongs in that route's own <svelte:head>, because
	Svelte concatenates head content rather than overriding it: a <title> here plus a
	<title> in a page would emit both tags.
-->
<svelte:head>
	<meta name="theme-color" content="#0f172a" />
	<meta property="og:site_name" content="Guess the CS2 Skin" />
	<meta property="og:locale" content="en_US" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

{@render children()}
