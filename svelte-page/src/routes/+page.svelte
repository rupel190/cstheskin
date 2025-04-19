<script lang="ts">
  import { onMount } from "svelte";
  const API_URL = import.meta.env.VITE_API_BASE;
  console.log("API_URL from env:", API_URL);

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
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
    if (await verifyGuess(data)) {
      console.log("Correct skin guess DINGIDNGINDFGINDGIDDINGDING"); // TODO
      switch (currentStage) {
        case 0:
          break;
        case 1:
          console.log("Win at stage 1");
          break;
        case 2:
          console.log("Win at stage 2");
          break;
        case 3:
          console.log("Win at stage 3");
          break;
        case 4:
          console.log("Win at stage 4");
          break;
        case 5:
          console.log("Win at stage 5");
          break;
        default:
          break;
      }
    } else {
      currentStage++;
      await fetchImage();
      //TODO: Update counter or  whatever
    }
  }

  async function verifyGuess(data: { name: string }[]) {
    const first = data?.[0];
    if (first?.name) {
      message = "🎯 Correct: " + first.name + "!";
      return true;
    } else {
      message = "❌ Wrong. Proceeding ...";
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
