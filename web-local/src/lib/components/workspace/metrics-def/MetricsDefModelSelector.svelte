<script lang="ts">
  import type { MetricsDefinitionEntity } from "@rilldata/web-local/common/data-modeler-state-service/entity-state-service/MetricsDefinitionEntityService";
  import type { PersistentModelStore } from "../../../application-state-stores/model-stores";
  import ModelIcon from "../../icons/Model.svelte";
  import { updateMetricsDefsWrapperApi } from "../../../redux-store/metrics-definition/metrics-definition-apis";
  import { getMetricsDefReadableById } from "../../../redux-store/metrics-definition/metrics-definition-readables";
  import { store } from "../../../redux-store/store-root";
  import { getContext } from "svelte";

  export let metricsDefId: string;

  $: selectedMetricsDef = getMetricsDefReadableById(metricsDefId);

  $: sourceModelDisplayValue =
    $selectedMetricsDef?.sourceModelId || "__DEFAULT_VALUE__";

  const persistentModelStore = getContext(
    "rill:app:persistent-model-store"
  ) as PersistentModelStore;

  function updateMetricsDefinitionHandler(
    metricsDef: Partial<MetricsDefinitionEntity>
  ) {
    store.dispatch(
      updateMetricsDefsWrapperApi({
        id: metricsDefId,
        changes: metricsDef,
      })
    );
  }
</script>

<div class="flex items-center mb-3">
  <div class="flex items-center gap-x-2" style="width:9em">
    <ModelIcon size="16px" /> model
  </div>
  <div>
    <select
      class="italic hover:bg-gray-100 rounded border border-6 border-transparent hover:font-bold hover:border-gray-100"
      style="background-color: #FFF; width:18em"
      value={sourceModelDisplayValue}
      on:change={(evt) => {
        updateMetricsDefinitionHandler({ sourceModelId: evt.target.value });
      }}
    >
      <option value="__DEFAULT_VALUE__" disabled selected
        >select a model...</option
      >
      {#each $persistentModelStore?.entities || [] as entity}
        <option value={entity.id}>{entity.name}</option>
      {/each}
    </select>
  </div>
</div>
