<script lang="ts">
  import { EntityStatus } from "@rilldata/web-local/common/data-modeler-state-service/entity-state-service/EntityStateService";
  import { crossfade, fly } from "svelte/transition";
  import {
    humanizeDataType,
    NicelyFormattedTypes,
  } from "../../../../util/humanize-numbers";
  import { WithTween } from "../../../data-graphic/functional-components";
  import CrossIcon from "../../../icons/CrossIcon.svelte";
  import Spinner from "../../../Spinner.svelte";
  import Tooltip from "../../../tooltip/Tooltip.svelte";
  import TooltipContent from "../../../tooltip/TooltipContent.svelte";

  export let value: number;
  export let status: EntityStatus;
  export let description: string = undefined;
  export let formatPreset: NicelyFormattedTypes;

  $: valusIsPresent = value !== undefined && value !== null;

  const [send, receive] = crossfade({ fallback: fly });
</script>

<div>
  <Tooltip location="top" distance={16}>
    <h2>
      <slot name="name" />
    </h2>
    <TooltipContent slot="tooltip-content">
      {description}
    </TooltipContent>
  </Tooltip>
  <div style:font-size="1.5rem" style:font-weight="light" class="ui-copy-muted">
    <!-- the default slot will be a tweened number that uses the formatter. One can optionally
    override this by filling the slot in the consuming component. -->
    <slot name="value">
      <div>
        {#if valusIsPresent && status === EntityStatus.Idle}
          <div>
            <WithTween {value} tweenProps={{ duration: 500 }} let:output>
              {#if formatPreset !== NicelyFormattedTypes.NONE}
                {humanizeDataType(output, formatPreset)}
              {:else}
                {output}
              {/if}
            </WithTween>
          </div>
        {:else if status === EntityStatus.Error}
          <CrossIcon />
        {:else if status === EntityStatus.Running}
          <div
            class="absolute p-2"
            in:receive|local={{ key: "spinner" }}
            out:send|local={{ key: "spinner" }}
          >
            <Spinner status={EntityStatus.Running} />
          </div>
        {/if}
      </div>
    </slot>
  </div>
</div>
