<script lang="ts">
  import { createHoverStateActionFactory } from "../actions/hover-state-action-factory";
  import Tooltip from "../tooltip/Tooltip.svelte";
  import TooltipContent from "../tooltip/TooltipContent.svelte";
  export let rotated = false;
  export let suppressTooltip = false;
  export let tooltipText: string;
  export let location = "right";
  // utilize the ID for easier UI testing.
  export let id: string;
  export let width = 16;
  export let height = 16;
  export let isHovered = false;
  export let rounded = false;
  export let border = false;

  const { hovered, captureHoverState } = createHoverStateActionFactory();
  hovered.subscribe((trueOrFalse) => {
    isHovered = trueOrFalse;
  });
</script>

<Tooltip
  {location}
  alignment="middle"
  distance={16}
  suppress={suppressTooltip || tooltipText === undefined}
>
  <button
    on:click
    {id}
    use:captureHoverState
    style:width={`${width}px`}
    style:height={`${height}px`}
    style:grid-column="left-control"
    class:rounded
    class="
        hover:bg-gray-300
        transition-tranform 
        text-gray-500
        duration-100
        grid
        p-0
        items-center
        justify-center
        {border ? 'border' : ''}
        border-transparent
        hover:border-gray-400
        {rotated ? '-rotate-90' : ''}"
  >
    <slot />
  </button>
  <TooltipContent slot="tooltip-content">
    {tooltipText}
  </TooltipContent>
</Tooltip>
