<script lang="ts">
  import type { TimeGrain } from "@rilldata/web-local/common/database-service/DatabaseTimeSeriesActions";
  import { createEventDispatcher } from "svelte";
  import CaretDownIcon from "../../../icons/CaretDownIcon.svelte";
  import WithSelectMenu from "../../../menu/wrappers/WithSelectMenu.svelte";
  import { prettyTimeGrain, TimeGrainOption } from "./time-range-utils";

  export let selectedTimeGrain: TimeGrain;
  export let selectableTimeGrains: TimeGrainOption[];

  const dispatch = createEventDispatcher();
  const EVENT_NAME = "select-time-grain";

  $: options = selectableTimeGrains
    ? selectableTimeGrains.map(({ timeGrain, enabled }) => ({
        main: prettyTimeGrain(timeGrain),
        disabled: !enabled,
        key: timeGrain,
        description: !enabled ? "not valid for this time range" : undefined,
      }))
    : undefined;

  const onTimeGrainSelect = (timeGrain: TimeGrain) => {
    dispatch(EVENT_NAME, { timeGrain });
  };
</script>

{#if selectedTimeGrain && selectableTimeGrains}
  <WithSelectMenu
    {options}
    selection={{
      main: prettyTimeGrain(selectedTimeGrain),
      key: selectedTimeGrain,
    }}
    on:select={(event) => onTimeGrainSelect(event.detail.key)}
    let:toggleMenu
    let:active
  >
    <button
      class="px-4 py-2 rounded flex flex-row gap-x-2 hover:bg-gray-200 hover:dark:bg-gray-600 transition-tranform duration-100"
      on:click={toggleMenu}
    >
      <span class="font-bold"
        >by {prettyTimeGrain(selectedTimeGrain)} increments</span
      >
      <span class="transition-transform" class:-rotate-180={active}>
        <CaretDownIcon size="16px" />
      </span>
    </button>
  </WithSelectMenu>
{/if}
