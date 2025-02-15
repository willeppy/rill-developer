<script lang="ts">
  import { getContext, onMount } from "svelte";
  import { drag } from "../../drag";
  import RillLogo from "../icons/RillLogo.svelte";
  import Spacer from "../icons/Spacer.svelte";
  import Portal from "../Portal.svelte";
  import Footer from "./Footer.svelte";

  import HideLeftSidebar from "@rilldata/web-local/lib/components/icons/HideLeftSidebar.svelte";
  import SurfaceViewIcon from "@rilldata/web-local/lib/components/icons/SurfaceView.svelte";
  import SurfaceControlButton from "@rilldata/web-local/lib/components/surface/SurfaceControlButton.svelte";
  import { tweened } from "svelte/motion";
  import { Readable, Writable, writable } from "svelte/store";
  import MetricsDefinitionAssets from "./dashboards/MetricsDefinitionAssets.svelte";
  import ModelAssets from "./models/ModelAssets.svelte";
  import TableAssets from "./sources/TableAssets.svelte";

  let mounted = false;
  onMount(() => {
    mounted = true;
  });

  /** FIXME: come up with strong defaults here when needed */
  const navigationLayout =
    (getContext("rill:app:navigation-layout") as Writable<{
      value: number;
      visible: boolean;
    }>) || writable({ value: 300, visible: true });

  const navigationWidth =
    (getContext("rill:app:navigation-width-tween") as Readable<number>) ||
    writable(300);

  const navVisibilityTween =
    (getContext("rill:app:navigation-visibility-tween") as Readable<number>) ||
    tweened(0, { duration: 50 });
</script>

<div
  aria-hidden={!$navigationLayout?.visible}
  class="box-border	assets fixed"
  style:left="{-$navVisibilityTween * $navigationWidth}px"
>
  <div
    class="
  border-r 
  border-transparent 
  fixed 
  overflow-auto 
  border-gray-200 
  transition-colors
  h-screen
  bg-white
"
    class:hidden={$navVisibilityTween === 1}
    class:pointer-events-none={!$navigationLayout?.visible}
    style:top="0px"
    style:width="{$navigationWidth}px"
  >
    <!-- draw handler -->
    {#if $navigationLayout?.visible}
      <Portal>
        <div
          on:dblclick={() => {
            navigationLayout.update((state) => {
              state.value = 300;
              return state;
            });
          }}
          class="fixed drawer-handler w-4 hover:cursor-col-resize -translate-x-2 h-screen"
          style:left="{(1 - $navVisibilityTween) * $navigationWidth}px"
          use:drag={{
            minSize: 300,
            maxSize: 500,
            side: "assetsWidth",
            store: navigationLayout,
          }}
        />
      </Portal>
    {/if}

    <div class="w-full flex flex-col h-full">
      <div class="grow" style:outline="1px solid black">
        <header
          style:height="var(--header-height)"
          class="sticky top-0 grid align-center bg-white z-50"
        >
          <h1
            class="grid grid-flow-col justify-start gap-x-3 p-4 items-center content-center"
          >
            {#if mounted}
              <a href="/">
                <RillLogo size="16px" iconOnly />
              </a>
            {:else}
              <Spacer size="16px" />
            {/if}
            <a href="/" class="font-bold text-black"> Rill Developer </a>
          </h1>
        </header>
        <TableAssets />
        <ModelAssets />
        <MetricsDefinitionAssets />
      </div>
      <Footer />
    </div>
  </div>
</div>

<SurfaceControlButton
  left="{($navigationWidth - 12 - 24) * (1 - $navVisibilityTween) +
    12 * $navVisibilityTween}px"
  on:click={() => {
    //assetsVisible.set(!$assetsVisible);
    navigationLayout.update((state) => {
      state.visible = !state.visible;
      return state;
    });
  }}
  show={true}
>
  {#if $navigationLayout?.visible}
    <HideLeftSidebar size="20px" />
  {:else}
    <SurfaceViewIcon size="16px" mode={"hamburger"} />
  {/if}
  <svelte:fragment slot="tooltip-content">
    {#if $navVisibilityTween === 0} close {:else} show {/if} sidebar
  </svelte:fragment>
</SurfaceControlButton>
