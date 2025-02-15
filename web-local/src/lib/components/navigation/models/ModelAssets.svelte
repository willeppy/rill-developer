<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { EntityType } from "@rilldata/web-local/common/data-modeler-state-service/entity-state-service/EntityStateService";
  import type { PersistentModelEntity } from "@rilldata/web-local/common/data-modeler-state-service/entity-state-service/PersistentModelEntityService";
  import { getContext } from "svelte";
  import { slide } from "svelte/transition";
  import {
    ApplicationStore,
    dataModelerService,
  } from "../../../application-state-stores/application-store";
  import type {
    DerivedModelStore,
    PersistentModelStore,
  } from "../../../application-state-stores/model-stores";
  import ModelIcon from "../../icons/Model.svelte";
  import NavigationEntry from "../NavigationEntry.svelte";
  import NavigationHeader from "../NavigationHeader.svelte";
  import ModelMenuItems from "./ModelMenuItems.svelte";
  import ModelTooltip from "./ModelTooltip.svelte";

  import { LIST_SLIDE_DURATION } from "@rilldata/web-local/lib/application-config";
  import ColumnProfile from "../../column-profile/ColumnProfile.svelte";
  import RenameAssetModal from "../RenameAssetModal.svelte";

  const store = getContext("rill:app:store") as ApplicationStore;
  const persistentModelStore = getContext(
    "rill:app:persistent-model-store"
  ) as PersistentModelStore;
  const derivedModelStore = getContext(
    "rill:app:derived-model-store"
  ) as DerivedModelStore;

  let showModels = true;

  // type Coll

  let persistentModelEntities: PersistentModelEntity[] = [];
  $: activeEntityID = $store?.activeEntity?.id;
  $: persistentModelEntities =
    ($persistentModelStore && $persistentModelStore.entities) || [];

  $: availableModels = persistentModelEntities.map((query) => {
    let derivedModel = $derivedModelStore.entities.find(
      (model) => model.id === query.id
    );

    return {
      id: query.id,
      modelName: query.name,
      tableSummaryProps: {
        name: query.name,
        cardinality: derivedModel?.cardinality ?? 0,
        profile: derivedModel?.profile ?? [],
        head: derivedModel?.preview ?? [],
        sizeInBytes: derivedModel?.sizeInBytes ?? 0,
        active: query?.id === activeEntityID,
      },
    };
  });

  async function addModel() {
    let response = await dataModelerService.dispatch("addModel", [{}]);
    goto(`/model/${response.id}`);
    // if the models are not visible in the assets list, show them.
    if (!showModels) {
      showModels = true;
    }
  }

  /** rename the model */
  let showRenameModelModal = false;
  let renameModelID = null;
  let renameModelName = null;
  const openRenameModelModal = (modelID: string, modelName: string) => {
    showRenameModelModal = true;
    renameModelID = modelID;
    renameModelName = modelName;
  };
</script>

<NavigationHeader
  bind:show={showModels}
  tooltipText="create a new model"
  on:add={addModel}
  contextButtonID={"create-model-button"}
>
  <ModelIcon size="16px" /> Models
</NavigationHeader>

{#if showModels}
  <div
    class="pb-6 justify-self-end"
    transition:slide={{ duration: LIST_SLIDE_DURATION }}
    id="assets-model-list"
  >
    {#each availableModels as { id, modelName, tableSummaryProps }, i (id)}
      {@const derivedModel = $derivedModelStore.entities.find(
        (t) => t["id"] === id
      )}
      <NavigationEntry
        name={modelName.split(".sql")[0]}
        href={`/model/${id}`}
        open={$page.url.pathname === `/model/${id}`}
      >
        <svelte:fragment slot="more">
          <div transition:slide|local={{ duration: LIST_SLIDE_DURATION }}>
            <ColumnProfile
              indentLevel={1}
              cardinality={tableSummaryProps.cardinality}
              profile={tableSummaryProps.profile}
              head={tableSummaryProps.head}
              entityId={id}
            />
          </div>
        </svelte:fragment>

        <svelte:fragment slot="tooltip-content">
          <ModelTooltip {modelName} />
        </svelte:fragment>

        <svelte:fragment slot="menu-items">
          <ModelMenuItems
            modelID={derivedModel.id}
            on:rename-asset={() => {
              openRenameModelModal(id, modelName);
            }}
          />
        </svelte:fragment>
      </NavigationEntry>
    {/each}
  </div>
{/if}

{#if showRenameModelModal}
  <RenameAssetModal
    entityType={EntityType.Model}
    closeModal={() => (showRenameModelModal = false)}
    entityId={renameModelID}
    currentAssetName={renameModelName.replace(".sql", "")}
  />
{/if}
