<script lang="ts">
  import { onMount } from "svelte";
  const API_URL = import.meta.env.VITE_API_BASE;
  console.log("API_URL from env:", API_URL);

  let playerId = "player123"; // eventually get this from localStorage or your /api/player/new
  let imageUrl = "";
  let guessInput = "";
  let message = "";
  let hints: string[] = [];

  let currentUuid = "skin-uuid-placeholder";
  let currentStage = 1;

  function api(path: string) {
    return `${API_URL}${path}`;
  }

  async function submitGuess() {
    console.log("Guess: ", guessInput);
    const res = await fetch(
      api("/api/skins?") +
        new URLSearchParams({
          uuid: currentUuid,
          name: guessInput,
        }),
    );
    // Verify result
    const data = await res.json();
    console.log("Data: ", data);
    console.log("current stage b4: ", currentStage);
    if (await verifyGuess(data)) {
      // Win
      console.log("Correct skin guess DINGIDNGINDFGINDGIDDINGDING", data);
      //TODO: show final stage solution
    } else if (currentStage < 5) {
      currentStage++;
      console.log("current stage af: ", currentStage);
      // proceed
      await fetchImage();
    } else {
      // Loss
      //TODO: Update player stats or whatever
      // show solution

      //TODO: Obviously unsafe, especially as GET request. Maybe handle more of the game logic in backend later anyways.
      const res = await fetch(
        api("/api/skins?") +
          new URLSearchParams({
            uuid: currentUuid,
          }),
      );
      const skin = await res.json();
      console.log("Loss! Current skin details: ", skin, res);
    }
  }

  async function verifyGuess(data: { name: string }[]) {
    const first = data?.[0];
    if (first?.name) {
      message = "🎯 Correct: " + first.name + "!";
      return true;
    } else {
      message = "❌ Wrong";
      return false;
    }
  }

  async function fetchImage() {
    console.log(
      "Searching image with UUID: ",
      currentUuid,
      " and stage: ",
      currentStage,
    );

    const imgres = await fetch(
      api("/api/image?") +
        new URLSearchParams({
          uuid: currentUuid,
          stage: currentStage.toString(),
        }),
    );
    const blob = await imgres.blob();
    imageUrl = URL.createObjectURL(blob);
  }

  async function fetchLatest() {
    const res = await fetch(api(`/api/skins/latest`));
    const { uuid } = await res.json();
    console.log("uuid for latest: ", uuid);
    currentUuid = uuid;
  }

  async function fetchHints() {
    const res = await fetch(api(`/api/hints/${playerId}`));
    const data = await res.json();
    hints = data.hints || [];
  }

  onMount(async () => {
    // ctx = canvas.getContext("2d")!;
    console.log("Mounting...");
    await fetchLatest();
    await fetchImage();
  });
</script>

<div class="max-w-xl mx-auto p-6 space-y-6 text-center">
  <h1 class="text-3xl font-bold">🎮 CsTheSkin: Guess the CS Skin</h1>

  <div class="border rounded shadow overflow-hidden bg-gray-100">
    <img src={imageUrl} alt="mystery skin" class="w-full" />
    <!-- <canvas bind:this={canvas} class="w-full max-h-[200px]"></canvas> -->
  </div>

  <div class="flex justify-center space-x-2 mt-4">
    {#each Array(5)
      .fill(0)
      .map((_, i) => i + 1) as stage}
      <div
        class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
              border-2 transition-all duration-200"
        class:bg-blue-600={currentStage === stage}
        class:text-white={currentStage === stage}
        class:border-blue-600={currentStage === stage}
        class:bg-gray-100={currentStage !== stage}
        class:text-gray-800={currentStage !== stage}
      >
        {stage}
      </div>
    {/each}
  </div>

  <input
    type="text"
    bind:value={guessInput}
    placeholder="Enter your guess"
    class="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-400"
  />

  <button
    on:click={submitGuess}
    class="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
  >
    Submit Guess
  </button>

  <!-- <button -->
  <!--   on:click={testApi} -->
  <!--   class="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" -->
  <!-- > -->
  <!--   TEST API -->
  <!-- </button> -->

  {#if message}
    <p class="text-lg mt-4">{message}</p>
  {/if}

  {#if hints.length}
    <div class="text-left mt-6">
      <h2 class="font-bold text-lg mb-2">Hints Unlocked</h2>
      <ul class="list-disc list-inside">
        {#each hints as hint}
          <li>{hint}</li>
        {/each}
      </ul>
    </div>
  {/if}
</div>
