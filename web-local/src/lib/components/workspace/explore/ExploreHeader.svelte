<script lang="ts">
  import { goto } from "$app/navigation";
  import { RootConfig } from "@rilldata/web-local/common/config/RootConfig";
  import { BehaviourEventMedium } from "@rilldata/web-local/common/metrics-service/BehaviourEventTypes";
  import {
    MetricsEventScreenName,
    MetricsEventSpace,
  } from "@rilldata/web-local/common/metrics-service/MetricsTypes";
  import { useQueryClient } from "@sveltestack/svelte-query";
  import { getContext } from "svelte";
  import { metricsExplorerStore } from "../../../application-state-stores/explorer-stores";
  import { navigationEvent } from "../../../metrics/initMetrics";
  import { getMetricsDefReadableById } from "../../../redux-store/metrics-definition/metrics-definition-readables";
  import { invalidateMetricsViewData } from "../../../svelte-query/queries/metrics-views/invalidation";
  import { useMetaQuery } from "../../../svelte-query/queries/metrics-views/metadata";
  import { Button } from "../../button";
  import MetricsIcon from "../../icons/Metrics.svelte";
  import Filters from "./filters/Filters.svelte";
  import TimeControls from "./time-controls/TimeControls.svelte";

  export let metricsDefId: string;

  const config = getContext<RootConfig>("config");

  const queryClient = useQueryClient();

  $: metaQuery = useMetaQuery(config, metricsDefId);
  // TODO: move this "sync" to a more relevant component
  $: if (metricsDefId && $metaQuery && metricsDefId === $metaQuery.data?.id) {
    if (
      !$metaQuery.data?.measures?.length ||
      !$metaQuery.data?.dimensions?.length
    ) {
      goto(`/dashboard/${metricsDefId}/edit`);
    } else if (!$metaQuery.isError && !$metaQuery.isFetching) {
      // FIXME: understand this logic before removing invalidateMetricsViewData
      invalidateMetricsViewData(queryClient, metricsDefId);
    }
    metricsExplorerStore.sync(metricsDefId, $metaQuery.data);
  }

  $: metricsDefinition = getMetricsDefReadableById(metricsDefId);

  const viewMetrics = (metricsDefId: string) => {
    goto(`/dashboard/${metricsDefId}/edit`);

    navigationEvent.fireEvent(
      metricsDefId,
      BehaviourEventMedium.Button,
      MetricsEventSpace.Workspace,
      MetricsEventScreenName.Dashboard,
      MetricsEventScreenName.MetricsDefinition
    );
  };
</script>

<section id="header" class="w-full flex flex-col">
  <!-- top row
    title and call to action
  -->
  <div class="flex justify-between w-full pt-3 pl-1 pr-4">
    <!-- title element -->
    <h1 style:line-height="1.1">
      <div class="pl-4 pt-1" style:font-size="24px">
        {#if $metricsDefinition}
          {$metricsDefinition?.metricDefLabel}
        {/if}
      </div>
    </h1>
    <!-- top right CTAs -->
    <div>
      <Button type="secondary" on:click={() => viewMetrics(metricsDefId)}>
        <div class="flex items-center gap-x-2">
          Edit Metrics <MetricsIcon />
        </div>
      </Button>
    </div>
  </div>
  <!-- bottom row -->
  <div class="px-2 pt-1">
    <TimeControls {metricsDefId} />
    {#key metricsDefId}
      <Filters {metricsDefId} />
    {/key}
  </div>
</section>
