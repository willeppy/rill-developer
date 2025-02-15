<script lang="ts">
  import Explore from "@rilldata/web-local/lib/components/icons/Explore.svelte";
  import Metrics from "@rilldata/web-local/lib/components/icons/Metrics.svelte";
  import Model from "@rilldata/web-local/lib/components/icons/Model.svelte";
  import Source from "@rilldata/web-local/lib/components/icons/Source.svelte";
  import WorkspaceContainer from "../core/WorkspaceContainer.svelte";

  const steps = [
    {
      heading: "Import your data source",
      description:
        "Add to your sources by clicking on the + icon, or by dragging a csv or parquet file to this window.",
      icon: Source,
    },
    {
      heading: "Model your sources into one big table",
      description:
        "Build intuition about your sources and use SQL to model them into an analytics-ready resource.",
      icon: Model,
    },
    {
      heading: "Define your metrics and dimensions",
      description:
        "Define aggregate metrics and break out dimensions for your modeled data.",
      icon: Metrics,
    },
    {
      heading: "Explore your metrics dashboard",
      description:
        "Interactively explore line charts and leaderboards to uncover insights.",
      icon: Explore,
    },
  ];
</script>

<WorkspaceContainer assetID="onboarding" inspector={false}>
  <div class="mt-10 p-2 place-content-center h-screen" slot="body">
    <div class="text-center">
      <div class="font-bold">Getting started</div>
      <p>Building data intuition at every step of analysis</p>
    </div>
    <div class="p-5 pt-2">
      {#each steps as step (step.heading)}
        <div
          class="flex items-center p-6 mt-3 bg-gray-50 rounded-lg border border-gray-200"
        >
          <div>
            <svelte:component this={step.icon} color="grey" size="3em" />
          </div>
          <div class="ml-5">
            <h5 class="font-bold">{step.heading}</h5>
            <p class="italic">{step.description}</p>
          </div>
        </div>
      {/each}
    </div>
  </div>
</WorkspaceContainer>
