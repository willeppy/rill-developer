<script lang="ts">
  import type { ApplicationStore } from "@rilldata/web-local/lib/application-state-stores/application-store";
  import { getContext } from "svelte";

  import { EntityStatus } from "@rilldata/web-local/common/data-modeler-state-service/entity-state-service/EntityStateService";
  import Spinner from "@rilldata/web-local/lib/components/Spinner.svelte";
  import Tooltip from "@rilldata/web-local/lib/components/tooltip/Tooltip.svelte";
  import TooltipContent from "@rilldata/web-local/lib/components/tooltip/TooltipContent.svelte";

  const store = getContext("rill:app:store") as ApplicationStore;

  let applicationStatus = 0;
  let asTimer;
  function debounceStatus(status: EntityStatus) {
    clearTimeout(asTimer);
    asTimer = setTimeout(() => {
      applicationStatus = status;
    }, 100);
  }

  $: debounceStatus($store?.status as unknown as EntityStatus);

  const applicationStatusTooltipMap = {
    [EntityStatus.Idle]: "idle",
    [EntityStatus.Running]: "running",
    [EntityStatus.Exporting]: "exporting a model resultset",
    [EntityStatus.Importing]: "importing a source",
    [EntityStatus.Profiling]: "profiling",
  };

  $: applicationStatusTooltip = applicationStatusTooltipMap[applicationStatus];
</script>

<div>
  <div class="text-gray-400">
    <Tooltip location="left" alignment="center" distance={16}>
      <Spinner status={applicationStatus || EntityStatus.Idle} size="20px" />
      <TooltipContent slot="tooltip-content"
        >{applicationStatusTooltip}
      </TooltipContent>
    </Tooltip>
  </div>
</div>
