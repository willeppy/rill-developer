<script lang="ts">
  import { TOOLTIP_STRING_LIMIT } from "@rilldata/web-local/lib/application-config";
  import { createEventDispatcher, getContext } from "svelte";
  import {
    INTERVALS,
    STRING_LIKES,
    TIMESTAMPS,
  } from "../../../duckdb-data-types";
  import { formatDataType } from "../../../util/formatters";
  import { createShiftClickAction } from "../../../util/shift-click-action";
  import { FormattedDataType } from "../../data-types";
  import notificationStore from "../../notifications";
  import Shortcut from "../../tooltip/Shortcut.svelte";
  import StackingWord from "../../tooltip/StackingWord.svelte";
  import Tooltip from "../../tooltip/Tooltip.svelte";
  import TooltipContent from "../../tooltip/TooltipContent.svelte";
  import TooltipShortcutContainer from "../../tooltip/TooltipShortcutContainer.svelte";
  import TooltipTitle from "../../tooltip/TooltipTitle.svelte";
  import BarAndLabel from "../../viz/BarAndLabel.svelte";
  import type { VirtualizedTableConfig } from "../types";

  const config: VirtualizedTableConfig = getContext("config");
  const isDimensionTable = config.table === "DimensionTable";

  export let row;
  export let column;
  export let value;
  export let formattedValue;
  export let type;
  export let barValue = 0;
  export let rowActive = false;
  export let suppressTooltip = false;
  export let rowSelected = false;
  export let atLeastOneSelected = false;
  export let excludeMode = false;
  export let positionStatic = false;

  let cellActive = false;

  const dispatch = createEventDispatcher();

  const { shiftClickAction } = createShiftClickAction();

  function onFocus() {
    dispatch("inspect", row.index);
    cellActive = true;
  }

  function onSelectItem() {
    dispatch("select-item", row.index);
  }

  function onBlur() {
    cellActive = false;
  }

  /** Because this table is virtualized,
   * it's a bit harder to get the proper
   * row-based hover highlighting. So let's
   * use javascript to solve this issue.
   */
  let activityStatus;
  $: {
    if (cellActive) {
      activityStatus = "bg-gray-200 dark:bg-gray-600";
    } else if (rowActive && !cellActive) {
      activityStatus = "bg-gray-100 dark:bg-gray-700";
    } else {
      activityStatus = "surface";
    }
  }

  // Super important special case: if there is not at least one "active" (selected) value,
  // we need to set *all* items to be included, because by default if a user has not
  // selected any values, we assume they want all values included in all calculations.
  $: excluded = atLeastOneSelected
    ? excludeMode
      ? rowSelected
      : !rowSelected
    : false;

  $: barColor = excluded
    ? "bg-gray-200 dark:bg-gray-700"
    : "bg-blue-200 dark:bg-blue-700";

  $: tooltipValue =
    value && STRING_LIKES.has(type) && value.length >= TOOLTIP_STRING_LIMIT
      ? value?.slice(0, TOOLTIP_STRING_LIMIT) + "..."
      : value;
</script>

<Tooltip location="top" distance={16} suppress={suppressTooltip}>
  <div
    on:mouseover={onFocus}
    on:mouseout={onBlur}
    on:focus={onFocus}
    on:blur={onBlur}
    on:click={onSelectItem}
    class="
      {positionStatic ? 'static' : 'absolute'}
      z-9 
      text-ellipsis 
      whitespace-nowrap 
      {isDimensionTable ? 'pr-5' : 'border-r border-b'}
      {activityStatus}
      "
    style:left="{column.start}px"
    style:top="{row.start}px"
    style:width="{column.size}px"
    style:height="{row.size}px"
  >
    <BarAndLabel
      customBackgroundColor="rgba(0,0,0,0)"
      showBackground={false}
      justify="left"
      value={barValue}
      color={barColor}
    >
      <button
        class="
          {config.rowHeight <= 28 ? 'py-1' : 'py-2'}
          {isDimensionTable ? '' : 'px-4'}
          text-left w-full text-ellipsis overflow-x-hidden whitespace-nowrap
          "
        use:shiftClickAction
        on:shift-click={async () => {
          let exportedValue = value;
          if (INTERVALS.has(type)) {
            exportedValue = formatDataType(value, type);
          } else if (TIMESTAMPS.has(type)) {
            exportedValue = `TIMESTAMP '${value}'`;
          }
          await navigator.clipboard.writeText(exportedValue);
          notificationStore.send({ message: `copied value to clipboard` });
          // update this to set the active animation in the tooltip text
        }}
      >
        <FormattedDataType
          value={formattedValue || value}
          {type}
          customStyle={excluded
            ? "font-normal ui-copy-disabled-faint"
            : "font-medium ui-copy"}
          inTable
        />
      </button>
    </BarAndLabel>
  </div>
  <TooltipContent slot="tooltip-content" maxWidth="360px">
    <TooltipTitle>
      <FormattedDataType slot="name" value={tooltipValue} {type} dark />
    </TooltipTitle>
    <TooltipShortcutContainer>
      <div>
        <StackingWord key="shift">copy</StackingWord> this value to clipboard
      </div>
      <Shortcut>
        <span style="font-family: var(--system);">⇧</span> + Click
      </Shortcut>
    </TooltipShortcutContainer>
  </TooltipContent>
</Tooltip>
