<script lang="ts">
  import { RootConfig } from "@rilldata/web-local/common/config/RootConfig";
  import { EntityStatus } from "@rilldata/web-local/common/data-modeler-state-service/entity-state-service/EntityStateService";
  import type { MeasureDefinitionEntity } from "@rilldata/web-local/common/data-modeler-state-service/entity-state-service/MeasureDefinitionStateService";
  import { getContext } from "svelte";
  import { crossfade, fly } from "svelte/transition";
  import {
    MetricsExplorerEntity,
    metricsExplorerStore,
  } from "../../application-state-stores/explorer-stores";
  import { useMetaQuery } from "../../svelte-query/queries/metrics-views/metadata";
  import { SelectMenu } from "../menu";
  import Spinner from "../Spinner.svelte";

  export let metricsDefId;

  const config = getContext<RootConfig>("config");

  // query the `/meta` endpoint to get the valid measures
  $: metaQuery = useMetaQuery(config, metricsDefId);
  $: measures = $metaQuery.data?.measures;

  let metricsExplorer: MetricsExplorerEntity;
  $: metricsExplorer = $metricsExplorerStore.entities[metricsDefId];

  function handleMeasureUpdate(event: CustomEvent) {
    metricsExplorerStore.setLeaderboardMeasureId(
      metricsDefId,
      event.detail.key
    );
  }

  function formatForSelector(measure: MeasureDefinitionEntity) {
    if (!measure) return undefined;
    return {
      ...measure,
      key: measure.id,
      main: measure.label?.length ? measure.label : measure.expression,
    };
  }

  let [send, receive] = crossfade({ fallback: fly });

  /** this should be a single element */
  // reset selections based on the active leaderboard measure
  let activeLeaderboardMeasure;
  $: activeLeaderboardMeasure =
    measures?.length &&
    metricsExplorer?.leaderboardMeasureId &&
    formatForSelector(
      measures.find(
        (measure) => measure.id === metricsExplorer?.leaderboardMeasureId
      ) ?? undefined
    );

  /** this controls the animation direction */

  $: options =
    measures?.map((measure) => {
      let main = measure.label?.length ? measure.label : measure.expression;
      return {
        ...measure,
        key: measure.id,
        main,
      };
    }) || [];

  /** set the selection only if measures is not undefined */
  $: selection = measures ? activeLeaderboardMeasure : [];
</script>

<div>
  {#if measures && options.length && selection}
    <div
      class="flex flex-row items-center ui-copy-muted"
      style:grid-column-gap=".4rem"
      in:send={{ key: "leaderboard-metric" }}
    >
      <div>Dimension Leaders by</div>

      <SelectMenu
        {options}
        {selection}
        alignment="end"
        on:select={handleMeasureUpdate}
      >
        <span class="font-bold">{selection?.main}</span>
      </SelectMenu>
    </div>
  {:else}
    <div
      class="flex flex-row items-center"
      style:grid-column-gap=".4rem"
      in:receive={{ key: "loading-leaderboard-metric" }}
    >
      pulling leaderboards <Spinner status={EntityStatus.Running} />
    </div>
  {/if}
</div>
