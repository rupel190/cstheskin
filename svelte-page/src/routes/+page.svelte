<script lang="ts">
  import { onMount } from "svelte";
  const API_URL = import.meta.env.VITE_API_BASE;

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let playerId = "player123"; // eventually get this from localStorage or your /api/player/new
  let imageUrl = "";
  let guessInput = "";
  let message = "";
  let hints: string[] = [];

  async function fetchImage() {
    const res = await fetch(`${API_URL}/api/skins/random`);
    const { uuid } = await res.json();
    console.log("UUID IN FE: ", uuid);
    const imgres = await fetch(`${API_URL}/api/image?uuid=${uuid}`);
    const blob = await imgres.blob();
    imageUrl = URL.createObjectURL(blob);

    // const data = await res.json();

    // const signed = await fetch(data.image_url);
    // const imgData = await signed.json();
    // imageUrl = imgData.signed_url;
    // drawImage(imageUrl);
  }

  function drawImage(url: string) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
    };
    img.src = url;
  }

  async function submitGuess() {
    const res = await fetch(
      "/api/guess?" +
        new URLSearchParams({
          uuid: "skin-uuid-placeholder",
          guess_input: guessInput,
        }),
    );
    const data = await res.json();
    if (data.correct) {
      message = "🎯 Correct!";
    } else {
      message = "❌ Wrong. Next image stage...";
      await fetchImage();
      await fetchHints();
    }
  }

  async function testApi() {
    console.log("Guess: ", guessInput);
    const res = await fetch(
      "/api/skins?" +
        new URLSearchParams({
          name: guessInput,
        }),
    );
    const data = await res.json();
    console.log("TODO: REMOVE LINE! Data: ", data);

    if (data.length > 0) {
      message = "🎯 Correct: " + data.at(0).name + "!";
    } else {
      message = "❌ Wrong. Proceeding ...";
      await fetchImage();
      await fetchHints();
    }
  }

  async function fetchHints() {
    const res = await fetch(`/api/hints/${playerId}`);
    const data = await res.json();
    hints = data.hints || [];
  }

  onMount(async () => {
    // ctx = canvas.getContext("2d")!;
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

  <button
    on:click={testApi}
    class="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
  >
    TEST API
  </button>

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
