<script lang="ts">
  import Discord from "../icons/Discord.svelte";
  import Docs from "../icons/Docs.svelte";
  import Github from "../icons/Github.svelte";
  import InfoCircle from "../icons/InfoCircle.svelte";
  import Tooltip from "../tooltip/Tooltip.svelte";
  import TooltipContent from "../tooltip/TooltipContent.svelte";
  import TooltipTitle from "../tooltip/TooltipTitle.svelte";
  import type { ApplicationMetadata } from "../../types";
  import { getContext } from "svelte";
  import { fly } from "svelte/transition";

  const metadata: ApplicationMetadata = getContext("rill:app:metadata");

  const lineItems = [
    {
      icon: Docs,
      label: "Documentation",
      href: "https://docs.rilldata.com",
      className: "fill-gray-600",
      shrinkIcon: false,
    },
    {
      icon: Discord,
      label: "Ask a question",
      href: "http://bit.ly/3jg4IsF",
      className: "fill-gray-500",
      shrinkIcon: true,
    },
    {
      icon: Github,
      label: "Report an issue",
      href: "https://github.com/rilldata/rill-developer/issues/new?assignees=&labels=bug&template=bug_report.md&title=",
      className: "fill-gray-500",
      shrinkIcon: true,
    },
  ];
</script>

<div
  class="flex flex-col bg-gray-50 pt-3 pb-3 gap-y-1 border-t sticky bottom-0"
>
  {#each lineItems as lineItem}
    <a href={lineItem.href} target="_blank"
      ><div
        class="flex flex-row items-center px-4 py-1 gap-x-2 text-gray-700 font-semibold hover:bg-gray-200"
      >
        <!-- workaround to resize the github and discord icons to match -->
        <div
          class="grid place-content-center"
          style:width="16px"
          style:height="16px"
        >
          <svelte:component
            this={lineItem.icon}
            className={lineItem.className}
            size={lineItem.shrinkIcon ? "14px" : "16px"}
          />
        </div>
        {lineItem.label}
      </div></a
    >
  {/each}
  <div
    class="italic px-4 py-1 text-gray-600 flex flex-row  gap-x-2"
    style:font-size="10px"
  >
    <span class="text-gray-400">
      <Tooltip location="top" alignment="start" distance={16}>
        <a
          href="https://www.rilldata.com/company/careers"
          target="_blank"
          class="text-gray-400 hover:animate-pulse"
        >
          <InfoCircle size="16px" />
        </a>
        <div
          slot="tooltip-content"
          transition:fly={{ duration: 100, y: 8 }}
          style:width="330px"
        >
          <TooltipContent>
            <TooltipTitle>
              <svelte:fragment slot="name">Rill Developer</svelte:fragment>
            </TooltipTitle>
            Come help us create the next great BI tool! Click to see our open roles.
          </TooltipContent>
        </div>
      </Tooltip>
    </span>
    version {metadata.version}{metadata.commitHash
      ? ` – ${metadata.commitHash}`
      : ""}
  </div>
</div>
