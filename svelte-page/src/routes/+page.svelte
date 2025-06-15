<script lang="ts">
  import { onMount } from "svelte";

  let imageUrl = "";
  let guess = "";
  let message = "";
  let currentStage = 1;
  let displayedStage = 1;
  let skinUuid = "invalidUuid";

  async function startGame() {
    const res = await fetch("/game/start", { method: "GET" });
    const data = await res.json();
    skinUuid = data.uuid;
    await loadImage();
  }

  async function loadImage(stage: string = "1") {
    const params = new URLSearchParams({
      skinUuid,
      stage,
    });
    const res = await fetch(`/image?${params.toString()}`, {
      method: "GET",
    });
    const blob = await res.blob();
    displayedStage = Number(stage);
    imageUrl = URL.createObjectURL(blob);
  }

  async function submitGuess() {
    const params = new URLSearchParams({ skinUuid, guess });
    const res = await fetch(`/guess?${params.toString()}`, {
      method: "GET",
    });
    const result = await res.json();

    if (result.solved) {
      message = "🎯 Correct! ->";
    } else {
      message = "❌ Wrong... ->";
    }
    currentStage = result.stage;
    await loadImage(result.stage.toString());
  }

  onMount(() => {
    startGame();
  });
</script>

<div class="max-w-xl mx-auto p-6 space-y-4 text-center">
  <h1 class="text-2xl font-bold">Guess the CS Skin</h1>
  <img src={imageUrl} alt="CS skin" class="w-full rounded shadow" />
  <div class="flex justify-center space-x-2 mb-4">
    {#each Array(5)
      .fill(0)
      .map((_, i) => i + 1) as stage}
      <button
        class="w-8 h-8 rounded-full text-sm font-semibold border transition-all duration-200 flex items-center justify-center"
        class:bg-blue-600={displayedStage === stage}
        class:text-white={displayedStage === stage}
        class:border-blue-600={displayedStage === stage}
        class:bg-gray-100={stage <= currentStage && displayedStage !== stage}
        class:text-gray-800={stage <= currentStage && displayedStage !== stage}
        class:bg-gray-200={stage > currentStage}
        class:text-gray-500={stage > currentStage}
        class:border-gray-300={stage > currentStage}
        class:cursor-not-allowed={stage > currentStage}
        disabled={stage > currentStage}
        on:click={() => loadImage(stage.toString())}
      >
        {stage}
      </button>
    {/each}
  </div>

  <input
    bind:value={guess}
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
