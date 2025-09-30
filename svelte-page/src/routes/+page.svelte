<script lang="ts">
  import { onMount } from "svelte";
  import AutocompleteInput from "$lib/AutocompleteInput.svelte";

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
  let guessHistory: Array<{guess: string, result: 'correct' | 'close' | 'wrong'}> = [];

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
    guessHistory = [];
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

    // Add guess to history
    guessHistory = [...guessHistory, { guess, result: result.guessResult }];

    // Clear guess input after submission
    guess = "";

    if (result.solved) {
      message = "";
      gameOver = true;
      skinName = result.skinName;
      skinSolved = true;
    } else if (result.gameOver) {
      message = ""; // Don't show redundant message since skin name is shown in answer box
      gameOver = true;
      skinName = result.skinName || "Unknown";
      nextSkin = result.nextSkin;
    } else {
      message = ""; // Clear message, history shows the feedback
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

<!-- Background with CS-themed gradient and pattern -->
<div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-orange-900 relative overflow-hidden" style="min-height: 100vh; height: auto;">
  <!-- Animated background elements -->
  <div class="absolute inset-0 opacity-10">
    <div class="absolute top-10 left-10 w-32 h-32 border border-orange-400 rotate-45 animate-pulse"></div>
    <div class="absolute top-1/3 right-20 w-24 h-24 border border-blue-400 rounded-full animate-ping animation-delay-1000"></div>
    <div class="absolute bottom-1/4 left-1/4 w-16 h-16 border border-yellow-400 rotate-12 animate-bounce animation-delay-2000"></div>
  </div>
  
  <!-- Main content -->
  <div class="relative z-10 max-w-2xl mx-auto p-6 space-y-6">
    <!-- Header with glow effect -->
    <div class="text-center pt-8 pb-4">
      <h1 class="text-4xl font-bold bg-gradient-to-r from-orange-400 to-yellow-300 bg-clip-text text-transparent drop-shadow-lg">
        🔫 Guess the CS Skin
      </h1>
      <p class="text-slate-300 mt-2 text-lg">Test your CS:GO knowledge</p>
    </div>

    <!-- Game container with enhanced styling -->
    <div class="bg-black bg-opacity-30 backdrop-blur-sm border border-slate-600 rounded-2xl p-8 shadow-2xl">
      <!-- Image display with frame effect -->
      <div class="relative mb-6">
        <div class="w-full aspect-[4/3] bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl border-2 border-slate-500 overflow-hidden shadow-inner relative">
          <img 
            src={imageUrl} 
            alt="CS skin" 
            class="max-w-full max-h-full object-contain m-auto absolute inset-0"
          />
          <!-- Loading state overlay -->
          {#if !imageUrl}
            <div class="absolute inset-0 flex items-center justify-center">
              <div class="text-slate-400 text-xl animate-pulse">Loading...</div>
            </div>
          {/if}
        </div>
        <!-- Stage indicator -->
        <div class="absolute -top-3 -right-3 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
          Stage {displayedStage}/5
        </div>
      </div>
      <!-- Enhanced stage selector -->
      <div class="flex justify-center space-x-3 mb-6">
        {#each Array(5)
          .fill(0)
          .map((_, i) => i + 1) as stage}
          <button
            class="w-12 h-12 rounded-xl text-sm font-bold border-2 transition-all duration-300 flex items-center justify-center relative overflow-hidden group"
            class:bg-orange-500={displayedStage === stage}
            class:text-white={displayedStage === stage}
            class:border-orange-400={displayedStage === stage}
            class:shadow-lg={displayedStage === stage}
            class:shadow-orange-500={displayedStage === stage}
            class:bg-slate-600={stage <= currentStage && displayedStage !== stage}
            class:text-slate-200={stage <= currentStage && displayedStage !== stage}
            class:border-slate-500={stage <= currentStage && displayedStage !== stage}
            class:bg-slate-800={stage > currentStage && !skinSolved}
            class:text-slate-500={stage > currentStage && !skinSolved}
            class:border-slate-700={stage > currentStage && !skinSolved}
            class:cursor-not-allowed={stage > currentStage && !skinSolved}
            class:bg-green-600={skinSolved && displayedStage !== stage}
            class:text-green-100={skinSolved && displayedStage !== stage}
            class:border-green-500={skinSolved && displayedStage !== stage}
            class:hover:scale-110={stage <= currentStage || skinSolved}
            disabled={stage > currentStage && !skinSolved}
            on:click={() => loadImage(stage.toString())}
          >
            <span class="relative z-10">{stage}</span>
            {#if displayedStage === stage}
              <div class="absolute inset-0 bg-gradient-to-r from-orange-400 to-yellow-400 animate-pulse"></div>
            {/if}
          </button>
        {/each}
      </div>

      <!-- Game controls -->
      {#if !gameOver}
        <div class="space-y-4">
          <AutocompleteInput
            bind:value={guess}
            placeholder="Type skin name..."
            onSubmit={submitGuess}
          />
          <button
            class="w-full px-6 py-4 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            on:click={submitGuess}
            disabled={!guess.trim()}
          >
            💣 Submit Guess
          </button>
        </div>
      {:else}
        <div class="text-center space-y-4">
          {#if skinName}
            <div class="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4 rounded-xl shadow-lg">
              <div class="text-sm opacity-90">Correct Answer:</div>
              <div class="text-xl font-bold">{skinName}</div>
            </div>
          {/if}
          <button
            class="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg"
            on:click={nextGame}
          >
            ➡️ Next Challenge
          </button>
        </div>
      {/if}

      <!-- Guess History -->
      {#if guessHistory.length > 0}
        <div class="mt-6 p-4 bg-slate-700 bg-opacity-50 backdrop-blur-sm border border-slate-600 rounded-xl">
          <div class="text-sm text-slate-400 mb-3">Guess History:</div>
          <div class="space-y-2">
            {#each guessHistory as historyItem}
              <div class="flex items-center justify-between p-2 bg-slate-800 bg-opacity-50 rounded-lg">
                <span class="text-slate-200 font-medium">{historyItem.guess}</span>
                <span class="text-sm">
                  {#if historyItem.result === 'correct'}
                    <span class="text-green-400">✅ Correct</span>
                  {:else if historyItem.result === 'close'}
                    <span class="text-yellow-400">🟡 Close</span>
                  {:else}
                    <span class="text-red-400">❌ Wrong</span>
                  {/if}
                </span>
              </div>
            {/each}
          </div>
        </div>
      {/if}

    </div>
  </div>
</div>
