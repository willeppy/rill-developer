import { ActionResponseFactory } from "../data-modeler-service/response/ActionResponseFactory";
import type { DimensionDefinitionEntity } from "../data-modeler-state-service/entity-state-service/DimensionDefinitionStateService";
import {
  EntityType,
  StateType,
} from "../data-modeler-state-service/entity-state-service/EntityStateService";
import type {
  BasicMeasureDefinition,
  MeasureDefinitionEntity,
} from "../data-modeler-state-service/entity-state-service/MeasureDefinitionStateService";
import { getFallbackMeasureName } from "../data-modeler-state-service/entity-state-service/MeasureDefinitionStateService";
import type { MetricsDefinitionEntity } from "../data-modeler-state-service/entity-state-service/MetricsDefinitionEntityService";
import { ValidationState } from "../data-modeler-state-service/entity-state-service/MetricsDefinitionEntityService";
import type { RollupInterval } from "../database-service/DatabaseColumnActions";
import type { BigNumberResponse } from "../database-service/DatabaseMetricsExplorerActions";
import type {
  TimeSeriesRollup,
  TimeSeriesTimeRange,
  TimeSeriesValue,
} from "../database-service/DatabaseTimeSeriesActions";
import {
  ExplorerMetricsDefinitionDoesntExist,
  ExplorerSourceModelDoesntExist,
  ExplorerSourceModelIsInvalid,
  ExplorerTimeDimensionDoesntExist,
} from "../errors/ErrorMessages";
import { DatabaseActionQueuePriority } from "../priority-action-queue/DatabaseActionQueuePriority";
import { getMapFromArray } from "../utils/arrayUtils";
import type { MetricsDefinitionContext } from "./MetricsDefinitionActions";
import { RillDeveloperActions } from "./RillDeveloperActions";
import { RillRequestContext } from "./RillRequestContext";

export interface MetricsViewMetaResponse {
  id?: string;
  name: string;
  timeDimension: {
    name: string;
    timeRange: TimeSeriesTimeRange;
  };
  dimensions: Array<DimensionDefinitionEntity>;
  measures: Array<MeasureDefinitionEntity>;
}

export interface MetricsViewRequestTimeRange {
  start: string;
  end: string;
  granularity: string;
}
export interface MetricsViewDimensionValue {
  name: string;
  in: Array<unknown>;
  like?: Array<unknown>;
}
export type MetricsViewDimensionValues = Array<MetricsViewDimensionValue>;
export interface MetricsViewRequestFilter {
  include: MetricsViewDimensionValues;
  exclude: MetricsViewDimensionValues;
}

export interface MetricsViewTimeSeriesRequest {
  measures: Array<string>;
  time: MetricsViewRequestTimeRange;
  filter?: MetricsViewRequestFilter;
}
export interface MetricsViewTimeSeriesResponse {
  meta: Array<{ name: string; type: string }>;
  // data: Array<{ time: string } & Record<string, number>>;
  data: Array<TimeSeriesValue>;
}

export interface MetricsViewTopListSortEntry {
  name: string;
  direction: "desc" | "asc";
}
export interface MetricsViewTopListRequest {
  measures: Array<string>;
  time: Pick<MetricsViewRequestTimeRange, "start" | "end">;
  limit: number;
  offset: number;
  sort: Array<MetricsViewTopListSortEntry>;
  filter?: MetricsViewRequestFilter;
}
export interface MetricsViewTopListResponse {
  meta: Array<{ name: string; type: string }>;
  data: Array<Record<string, number | string>>;
}

export interface MetricsViewTotalsRequest {
  measures: Array<string>;
  time: Pick<MetricsViewRequestTimeRange, "start" | "end">;
  filter?: MetricsViewRequestFilter;
}
export interface MetricsViewTotalsResponse {
  meta: Array<{ name: string; type: string }>;
  data: Record<string, number>;
}

/**
 * Actions that get info for metrics explore.
 * Based on rill runtime specs.
 */
export class MetricsViewActions extends RillDeveloperActions {
  @RillDeveloperActions.MetricsDefinitionAction()
  public async getMetricsViewMeta(
    rillRequestContext: MetricsDefinitionContext,
    _: string
  ) {
    if (!rillRequestContext.record) {
      return ActionResponseFactory.getEntityError(
        ExplorerMetricsDefinitionDoesntExist
      );
    }
    const metricsDef = this.dataModelerStateService
      .getMetricsDefinitionService()
      .getById(rillRequestContext.record.id);

    if (!metricsDef) {
      return ActionResponseFactory.getEntityError(
        ExplorerMetricsDefinitionDoesntExist
      );
    }

    if (!rillRequestContext.record?.sourceModelId) {
      return ActionResponseFactory.getEntityError(
        ExplorerSourceModelDoesntExist
      );
    }

    const validationResp = this.validateMetricsDefinition(
      rillRequestContext.record
    );
    if (validationResp) return validationResp;

    const meta: MetricsViewMetaResponse = {
      name: rillRequestContext.record.metricDefLabel,
      timeDimension: {
        name: rillRequestContext.record.timeDimension,
        timeRange: await this.getTimeRange(rillRequestContext.record),
      },
      measures: await this.getValidMeasures(rillRequestContext.record),
      dimensions: this.getValidDimensions(rillRequestContext.record),
    };
    return ActionResponseFactory.getRawResponse(meta);
  }

  @RillDeveloperActions.MetricsDefinitionAction()
  public async getMetricsViewTimeSeries(
    rillRequestContext: MetricsDefinitionContext,
    metricsDefId: string,
    request: MetricsViewTimeSeriesRequest
  ) {
    if (!rillRequestContext.record?.sourceModelId) return;
    const model = this.dataModelerStateService
      .getEntityStateService(EntityType.Model, StateType.Persistent)
      .getById(rillRequestContext.record.sourceModelId);
    const validationResp = this.validateMetricsDefinition(
      rillRequestContext.record
    );
    if (validationResp) return validationResp;

    const timeSeries: TimeSeriesRollup = await this.databaseActionQueue.enqueue(
      {
        id: metricsDefId,
        priority: DatabaseActionQueuePriority.ActiveModel,
      },
      "generateTimeSeries",
      [
        {
          tableName: model.tableName,
          timestampColumn: rillRequestContext.record.timeDimension,
          measures: await this.getBasicMeasures(
            rillRequestContext.record,
            request.measures
          ),
          filters: request.filter,
          timeRange: {
            ...request.time,
            interval: request.time.granularity,
          },
        },
      ]
    );
    const response: MetricsViewTimeSeriesResponse = {
      meta: [], // TODO
      data: timeSeries.rollup.results,
    };
    return ActionResponseFactory.getRawResponse(response);
  }

  @RillDeveloperActions.MetricsDefinitionAction()
  public async getMetricsViewTopList(
    rillRequestContext: MetricsDefinitionContext,
    metricsDefId: string,
    dimensionId: string,
    request: MetricsViewTopListRequest
  ) {
    if (!rillRequestContext.record?.sourceModelId) return;
    const model = this.dataModelerStateService
      .getEntityStateService(EntityType.Model, StateType.Persistent)
      .getById(rillRequestContext.record.sourceModelId);
    const validationResp = this.validateMetricsDefinition(
      rillRequestContext.record
    );
    if (validationResp) return validationResp;
    const dimension = this.dataModelerStateService
      .getDimensionDefinitionService()
      .getById(dimensionId);

    const data = await this.databaseActionQueue.enqueue(
      {
        id: rillRequestContext.id,
        priority: DatabaseActionQueuePriority.ActiveModel,
      },
      "getLeaderboardValues",
      [
        model.tableName,
        dimension.dimensionColumn,
        await this.getBasicMeasures(
          rillRequestContext.record,
          request.measures
        ),
        {
          filters: request.filter,
          sort: request.sort,
          timeRange: request.time,
          timestampColumn: rillRequestContext.record.timeDimension,
          limit: request.limit,
        },
      ]
    );
    const response: MetricsViewTopListResponse = {
      meta: [], // TODO
      data,
    };
    return ActionResponseFactory.getRawResponse(response);
  }

  @RillDeveloperActions.MetricsDefinitionAction()
  public async getMetricsViewTotals(
    rillRequestContext: MetricsDefinitionContext,
    metricsDefId: string,
    request: MetricsViewTotalsRequest
  ) {
    if (!rillRequestContext.record?.sourceModelId) return;
    const model = this.dataModelerStateService
      .getEntityStateService(EntityType.Model, StateType.Persistent)
      .getById(rillRequestContext.record.sourceModelId);
    const validationResp = this.validateMetricsDefinition(
      rillRequestContext.record
    );
    if (validationResp) return validationResp;

    const bigNumberResponse: BigNumberResponse =
      await this.databaseActionQueue.enqueue(
        {
          id: rillRequestContext.id,
          priority: DatabaseActionQueuePriority.ActiveModel,
        },
        "getBigNumber",
        [
          model.tableName,
          await this.getBasicMeasures(
            rillRequestContext.record,
            request.measures
          ),
          request.filter,
          rillRequestContext.record.timeDimension,
          request.time,
        ]
      );
    const response: MetricsViewTotalsResponse = {
      meta: [], // TODO
      data: bigNumberResponse.bigNumbers,
    };
    return ActionResponseFactory.getRawResponse(response);
  }

  private async getTimeRange(
    metricsDef: MetricsDefinitionEntity
  ): Promise<TimeSeriesTimeRange> {
    const model = this.dataModelerStateService
      .getEntityStateService(EntityType.Model, StateType.Persistent)
      .getById(metricsDef.sourceModelId);
    const rollupInterval: RollupInterval =
      await this.databaseActionQueue.enqueue(
        {
          id: metricsDef.id,
          priority: DatabaseActionQueuePriority.ActiveModel,
        },
        "estimateIdealRollupInterval",
        [model.tableName, metricsDef.timeDimension]
      );
    return {
      interval: rollupInterval.rollupInterval,
      start: rollupInterval.minValue,
      end: rollupInterval.maxValue,
    } as TimeSeriesTimeRange;
  }

  private getValidDimensions(metricsDef: MetricsDefinitionEntity) {
    const derivedModel = this.dataModelerStateService
      .getEntityStateService(EntityType.Model, StateType.Derived)
      .getById(metricsDef.sourceModelId);
    if (!derivedModel) {
      return [];
    }

    const columnMap = getMapFromArray(
      derivedModel.profile,
      (column) => column.name
    );

    return this.dataModelerStateService
      .getDimensionDefinitionService()
      .getManyByField("metricsDefId", metricsDef.id)
      .filter((dimension) => columnMap.has(dimension.dimensionColumn));
  }

  private async getValidMeasures(metricsDef: MetricsDefinitionEntity) {
    const measures = this.dataModelerStateService
      .getMeasureDefinitionService()
      .getManyByField("metricsDefId", metricsDef.id);
    const validMeasures = (
      await Promise.all(
        measures.map(async (measure) => {
          if ("expressionIsValid" in measure) return { ...measure };
          // backwards compatibility
          const measureValidation = await this.rillDeveloperService.dispatch(
            RillRequestContext.getNewContext(),
            "validateMeasureExpression",
            [metricsDef.id, measure.id, measure.expression]
          );
          return {
            ...measure,
            ...(measureValidation.data as MeasureDefinitionEntity),
          };
        })
      )
    ).filter((measure) => measure.expressionIsValid === ValidationState.OK);
    validMeasures.forEach((measure, index) => {
      measure.sqlName = getFallbackMeasureName(index, measure.sqlName);
    });
    return validMeasures;
  }

  private async getBasicMeasures(
    metricsDef: MetricsDefinitionEntity,
    measureIds: Array<string>
  ): Promise<Array<BasicMeasureDefinition>> {
    const measureIdsSet = new Set(measureIds);
    return (await this.getValidMeasures(metricsDef)).filter(
      (measure) =>
        measureIdsSet.has(measure.id) || measureIdsSet.has(measure.sqlName)
    );
  }

  private validateMetricsDefinition(metricsDef: MetricsDefinitionEntity) {
    const model = this.dataModelerStateService
      .getEntityStateService(EntityType.Model, StateType.Persistent)
      .getById(metricsDef.sourceModelId);
    if (!model) {
      return ActionResponseFactory.getEntityError(
        ExplorerSourceModelDoesntExist
      );
    }

    const derivedModel = this.dataModelerStateService
      .getEntityStateService(EntityType.Model, StateType.Derived)
      .getById(metricsDef.sourceModelId);
    if (derivedModel.error) {
      return ActionResponseFactory.getEntityError(ExplorerSourceModelIsInvalid);
    }
    if (
      !metricsDef.timeDimension ||
      derivedModel.profile.findIndex(
        (column) => column.name === metricsDef.timeDimension
      ) === -1
    ) {
      return ActionResponseFactory.getEntityError(
        ExplorerTimeDimensionDoesntExist
      );
    }

    return undefined;
  }
}
