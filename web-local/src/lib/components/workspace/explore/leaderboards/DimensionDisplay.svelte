<script lang="ts">
  import type { RootConfig } from "@rilldata/web-local/common/config/RootConfig";

  /**
   * DimensionDisplay.svelte
   * -------------------------
   * Create a table with the selected dimension and measures
   * to be displayed in explore
   */
  import type { DimensionDefinitionEntity } from "@rilldata/web-local/common/data-modeler-state-service/entity-state-service/DimensionDefinitionStateService";
  import {
    MetricsExplorerEntity,
    metricsExplorerStore,
  } from "../../../../application-state-stores/explorer-stores";
  import DimensionContainer from "../../../dimension/DimensionContainer.svelte";
  import DimensionHeader from "../../../dimension/DimensionHeader.svelte";
  import DimensionTable from "../../../dimension/DimensionTable.svelte";
  import {
    useMetaDimension,
    useMetaMappedFilters,
    useMetaMeasure,
    useMetaMeasureNames,
    useMetaQuery,
  } from "../../../../svelte-query/queries/metrics-views/metadata";
  import { useTopListQuery } from "../../../../svelte-query/queries/metrics-views/top-list";
  import { useTotalsQuery } from "../../../../svelte-query/queries/metrics-views/totals";
  import { humanizeGroupByColumns } from "../../../../util/humanize-numbers";
  import { getContext } from "svelte";

  import type { MetricsViewDimensionValues } from "@rilldata/web-local/common/rill-developer-service/MetricsViewActions";

  export let metricsDefId: string;
  export let dimensionId: string;

  let searchText = "";
  $: addNull = "null".includes(searchText);

  const config = getContext<RootConfig>("config");

  $: metaQuery = useMetaQuery(config, metricsDefId);

  $: dimensionQuery = useMetaDimension(config, metricsDefId, dimensionId);
  let dimension: DimensionDefinitionEntity;
  $: dimension = $dimensionQuery?.data;

  $: leaderboardMeasureId = metricsExplorer?.leaderboardMeasureId;
  $: leaderboardMeasureQuery = useMetaMeasure(
    config,
    metricsDefId,
    metricsExplorer?.leaderboardMeasureId
  );

  let metricsExplorer: MetricsExplorerEntity;
  $: metricsExplorer = $metricsExplorerStore.entities[metricsDefId];

  let excludeValues: MetricsViewDimensionValues;
  $: excludeValues = metricsExplorer?.filters.exclude;

  $: excludeMode =
    metricsExplorer?.dimensionFilterExcludeMode.get(dimensionId) ?? false;

  $: mappedFiltersQuery = useMetaMappedFilters(
    config,
    metricsDefId,
    metricsExplorer?.filters,
    dimensionId
  );

  $: selectedMeasureNames = useMetaMeasureNames(
    config,
    metricsDefId,
    metricsExplorer?.selectedMeasureIds
  );

  let selectedValues: Array<unknown>;
  $: selectedValues =
    (excludeMode
      ? metricsExplorer?.filters.exclude.find((d) => d.name === dimension?.id)
          ?.in
      : metricsExplorer?.filters.include.find((d) => d.name === dimension?.id)
          ?.in) ?? [];

  let topListQuery;

  $: allMeasures = $metaQuery.data?.measures;

  $: sortByColumn = $leaderboardMeasureQuery.data?.sqlName;
  $: sortDirection = sortDirection || "desc";

  $: if (
    sortByColumn &&
    sortDirection &&
    leaderboardMeasureId &&
    metaQuery &&
    $metaQuery.isSuccess &&
    !$metaQuery.isRefetching
  ) {
    let filterData = JSON.parse(JSON.stringify($mappedFiltersQuery.data));

    if (searchText !== "") {
      let foundDimension = false;

      filterData["include"].forEach((filter) => {
        if (filter.name == dimension?.dimensionColumn) {
          filter.like = [`%${searchText}%`];
          foundDimension = true;
          if (addNull) filter.in.push(null);
        }
      });

      if (!foundDimension) {
        filterData["include"].push({
          name: dimension?.dimensionColumn,
          in: addNull ? [null] : [],
          like: [`%${searchText}%`],
        });
      }
    } else {
      filterData["include"] = filterData["include"].filter((f) => f.in.length);
      filterData["include"].forEach((f) => {
        delete f.like;
      });
    }

    topListQuery = useTopListQuery(config, metricsDefId, dimensionId, {
      measures: $selectedMeasureNames.data,
      limit: 250,
      offset: 0,
      sort: [
        {
          name: sortByColumn,
          direction: sortDirection,
        },
      ],
      time: {
        start: metricsExplorer?.selectedTimeRange?.start,
        end: metricsExplorer?.selectedTimeRange?.end,
      },
      filter: filterData,
    });
  }

  let totalsQuery;
  $: if (
    metricsExplorer &&
    metaQuery &&
    $metaQuery.isSuccess &&
    !$metaQuery.isRefetching
  ) {
    totalsQuery = useTotalsQuery(config, metricsDefId, {
      measures: $selectedMeasureNames.data,
      time: {
        start: metricsExplorer.selectedTimeRange?.start,
        end: metricsExplorer.selectedTimeRange?.end,
      },
    });
  }

  let referenceValues = {};
  $: if ($totalsQuery?.data?.data) {
    allMeasures.map((m) => {
      const isSummableMeasure =
        m?.expression.toLowerCase()?.includes("count(") ||
        m?.expression?.toLowerCase()?.includes("sum(");
      if (isSummableMeasure) {
        referenceValues[m.sqlName] = $totalsQuery.data.data?.[m.sqlName];
      }
    });
  }

  let values = [];
  let columns = [];
  let measureNames = [];

  $: if (!$topListQuery?.isFetching && dimension) {
    values = $topListQuery?.data?.data ?? [];

    /* FIX ME
    /* for now getting the column names from the values
    /* in future use the meta field to get column details
    */
    if (values.length) {
      let columnNames = Object.keys(values[0]).sort();

      columnNames = columnNames.filter(
        (name) => name !== dimension?.dimensionColumn
      );
      columnNames.unshift(dimension?.dimensionColumn);
      measureNames = allMeasures.map((m) => m.sqlName);

      columns = columnNames.map((columnName) => {
        if (measureNames.includes(columnName)) {
          const measure = allMeasures.find((m) => m.sqlName === columnName);
          return {
            name: columnName,
            type: "INT",
            label: measure?.label || measure?.expression,
            total: referenceValues[measure.sqlName] || 0,
            enableResize: false,
          };
        } else
          return {
            name: columnName,
            type: "VARCHAR",
            label: dimension?.labelSingle,
            enableResize: true,
          };
      });
    }
  }

  function onSelectItem(event) {
    const label = values[event.detail][dimension?.dimensionColumn];
    metricsExplorerStore.toggleFilter(metricsDefId, dimension?.id, label);
  }

  function onSortByColumn(event) {
    const columnName = event.detail;
    if (!measureNames.includes(columnName)) return;

    if (columnName === sortByColumn) {
      sortDirection = sortDirection === "desc" ? "asc" : "desc";
    } else {
      metricsExplorerStore.setLeaderboardMeasureId(
        metricsDefId,
        allMeasures.find((m) => m.sqlName === columnName)?.id
      );
      sortDirection = "desc";
    }
  }

  $: if (values) {
    const measureFormatSpec = allMeasures?.map((m) => {
      return { columnName: m.sqlName, formatPreset: m.formatPreset };
    });
    values = humanizeGroupByColumns(values, measureFormatSpec);
  }
</script>

{#if topListQuery}
  <DimensionContainer>
    <DimensionHeader
      {metricsDefId}
      {dimensionId}
      {excludeMode}
      isFetching={$topListQuery?.isFetching}
      on:search={(event) => {
        searchText = event.detail;
      }}
    />

    {#if values && columns.length}
      <DimensionTable
        on:select-item={(event) => onSelectItem(event)}
        on:sort={(event) => onSortByColumn(event)}
        dimensionName={dimension?.dimensionColumn}
        {columns}
        {selectedValues}
        rows={values}
        {sortByColumn}
        {excludeMode}
      />
    {/if}
  </DimensionContainer>
{/if}
