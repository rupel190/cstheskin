<script lang="ts">
  import { onMount } from "svelte";

  let imageUrl = "";
  let guessInput = "";
  let message = "";
  let currentStage = 1;

  async function startGame() {
    await fetch("/api/game/start", { method: "GET" });
    await loadImage();
  }

  async function loadImage() {
    const res = await fetch("/api/image");
    const blob = await res.blob();
    imageUrl = URL.createObjectURL(blob);
  }

  async function submitGuess() {
    const res = await fetch("/api/guess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guess: guessInput }),
    });

    const result = await res.json();
    if (result.correct) {
      message = "🎯 Correct!";
    } else {
      currentStage = result.stage;
      message = "❌ Wrong. Showing next stage...";
      await loadImage();
    }
  }

  onMount(() => {
    startGame();
  });
</script>

<div class="max-w-xl mx-auto p-6 space-y-4 text-center">
  <h1 class="text-2xl font-bold">Guess the CS Skin</h1>
  <img src={imageUrl} alt="CS skin" class="w-full rounded shadow" />
  <input
    bind:value={guessInput}
    placeholder="Your guess..."
    class="w-full px-4 py-2 border rounded"
  />
  <button
    class="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
    on:click={submitGuess}
  >
    Submit Guess
  </button>
  {#if message}
    <p class="text-lg mt-2">{message}</p>
  {/if}
</div>
