<script lang="ts">
  import { onMount } from "svelte";

  let imageUrl = "";
  let guess = "";
  let message = "";
  let currentStage = 1;
  let displayedStage = 1;
  let skinUuid = "invalidUuid";
  let gameOver = false;
  let skinName = "";
  let nextSkin: { uuid: string; name: string } | null = null;
  let skinSolved = false;

  async function startGame() {
    const res = await fetch("/api/game/start", { method: "GET" });
    const data = await res.json();
    skinUuid = data.uuid;
    resetGameState();
    await loadImage();
  }

  function resetGameState() {
    currentStage = 1;
    displayedStage = 1;
    gameOver = false;
    skinName = "";
    nextSkin = null;
    message = "";
    guess = "";
    skinSolved = false;
  }

  async function loadImage(stage: string = "1") {
    const params = new URLSearchParams({
      skinUuid,
      stage,
    });
    const res = await fetch(`/api/image?${params.toString()}`, {
      method: "GET",
    });
    const blob = await res.blob();
    displayedStage = Number(stage);
    imageUrl = URL.createObjectURL(blob);
  }

  async function submitGuess() {
    const params = new URLSearchParams({ skinUuid, guess });
    const res = await fetch(`/api/guess?${params.toString()}`, {
      method: "GET",
    });
    const result = await res.json();

    console.log("Guess result:", result);
    console.log("Before update - currentStage:", currentStage, "displayedStage:", displayedStage);

    // Clear guess input after submission
    guess = "";

    if (result.solved) {
      message = `The skin is "${result.skinName}"`;
      gameOver = true;
      skinName = result.skinName;
      skinSolved = true;
    } else if (result.gameOver) {
      message = `😢 Game Over! The skin was "${result.skinName || 'Unknown'}"`;
      gameOver = true;
      skinName = result.skinName || "Unknown";
      nextSkin = result.nextSkin;
    } else if (result.guessResult === 'close') {
      message = "🟡 Close! You got the weapon right, but need the skin name...";
    } else {
      message = "❌ Wrong... try again!";
    }

    currentStage = result.stage;

    // Load the next stage image (or current stage if solved/game over)
    await loadImage(result.stage.toString());

    console.log("After update - currentStage:", currentStage, "displayedStage:", displayedStage);
  }

  async function nextGame() {
    if (nextSkin) {
      skinUuid = nextSkin.uuid;
      resetGameState();
      await loadImage();
    } else {
      await startGame();
    }
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
        class:bg-gray-200={stage > currentStage && !skinSolved}
        class:text-gray-500={stage > currentStage && !skinSolved}
        class:border-gray-300={stage > currentStage && !skinSolved}
        class:cursor-not-allowed={stage > currentStage && !skinSolved}
        class:bg-green-100={skinSolved && displayedStage !== stage}
        class:text-green-700={skinSolved && displayedStage !== stage}
        class:border-green-300={skinSolved && displayedStage !== stage}
        disabled={stage > currentStage && !skinSolved}
        on:click={() => loadImage(stage.toString())}
      >
        {stage}
      </button>
    {/each}
  </div>

  {#if !gameOver}
    <input
      bind:value={guess}
      placeholder="Your guess..."
      class="w-full px-4 py-2 border rounded"
      on:keydown={(e) => e.key === 'Enter' && guess.trim() && submitGuess()}
    />
    <button
      class="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      on:click={submitGuess}
      disabled={!guess.trim()}
    >
      Submit Guess
    </button>
  {:else}
    {#if skinName}
      <div class="text-xl font-semibold text-green-600 mb-4">
        Skin: {skinName}
      </div>
    {/if}
    <button
      class="mt-2 px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-semibold"
      on:click={nextGame}
    >
      Next Skin
    </button>
  {/if}

  {#if message}
    <p class="text-lg mt-4 font-medium">{message}</p>
  {/if}
</div>
