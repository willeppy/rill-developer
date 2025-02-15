<script lang="ts">
  import { fly, slide } from "svelte/transition";
  import Cancel from "../icons/Cancel.svelte";
  import Check from "../icons/Check.svelte";
  import Spacer from "../icons/Spacer.svelte";
  import BarAndLabel from "../viz/BarAndLabel.svelte";
  export let value: number; // should be between 0 and 1.
  export let color = "bg-blue-200 dark:bg-blue-600";
  export let isActive = false;
  export let excluded = false;

  let hovered = false;
  const onHover = () => {
    hovered = true;
  };
  const onLeave = () => {
    hovered = false;
  };
  /** used for overly-large bar values */
  let zigZag =
    "M" +
    Array.from({ length: 7 })
      .map((_, i) => {
        return `${15 - 4 * (i % 2)} ${1.7 * (i * 2)}`;
      })
      .join(" L");
</script>

<button
  transition:slide|local={{ duration: 200 }}
  on:mouseover={onHover}
  on:mouseleave={onLeave}
  on:focus={onHover}
  on:blur={onLeave}
  on:click
  class="block flex flex-row w-full text-left transition-color"
>
  <div style:width="22px" style:height="22px" class="grid place-items-center">
    {#if isActive && !excluded}
      <Check size="20px" />
    {:else if isActive && excluded}
      <Cancel size="20px" />
    {:else}
      <Spacer />
    {/if}
  </div>
  <BarAndLabel
    {color}
    {value}
    showHover
    showBackground={false}
    tweenParameters={{ duration: 200 }}
    justify={false}
  >
    <div
      class="grid leaderboard-entry items-center gap-x-3"
      style:height="22px"
    >
      <div
        class="justify-self-start text-left w-full text-ellipsis overflow-hidden whitespace-nowrap"
      >
        <div class:font-italic={isActive}>
          <slot name="title" />
        </div>
      </div>
      <div class="justify-self-end  overflow-hidden">
        <slot name="right" />
      </div>
    </div>
  </BarAndLabel>
</button>
<!-- if the value is greater than 100%, we should add this little serration -->
{#if value > 1.001}
  <div transition:fly={{ duration: 200, x: 20 }}>
    <svg
      style="
      position:absolute;
      right: 0px;
      transform: translateY(-22px);
    "
      width="15"
      height="22"
    >
      <path d={zigZag} fill="white" />
    </svg>
  </div>
{/if}

<style>
  .leaderboard-entry {
    grid-template-columns: auto max-content;
  }
</style>
