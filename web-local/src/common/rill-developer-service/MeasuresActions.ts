import { ActionResponseFactory } from "../data-modeler-service/response/ActionResponseFactory";
import {
  EntityType,
  StateType,
} from "../data-modeler-state-service/entity-state-service/EntityStateService";
import type { MeasureDefinitionEntity } from "../data-modeler-state-service/entity-state-service/MeasureDefinitionStateService";
import { ValidationState } from "../data-modeler-state-service/entity-state-service/MetricsDefinitionEntityService";
import { ExplorerSourceModelDoesntExist } from "../errors/ErrorMessages";
import { parseExpression } from "../expression-parser/parseExpression";
import { DatabaseActionQueuePriority } from "../priority-action-queue/DatabaseActionQueuePriority";
import type { MetricsDefinitionContext } from "./MetricsDefinitionActions";
import { RillDeveloperActions } from "./RillDeveloperActions";
import { getMeasureDefinition } from "../stateInstancesFactory";

export class MeasuresActions extends RillDeveloperActions {
  @RillDeveloperActions.MetricsDefinitionAction()
  public async addNewMeasure(
    rillRequestContext: MetricsDefinitionContext,
    metricsDefId: string,
    expression?: string
  ) {
    const measure = getMeasureDefinition(metricsDefId);
    if (expression) {
      measure.expression = expression;
    }

    this.dataModelerStateService.dispatch("addEntity", [
      EntityType.MeasureDefinition,
      StateType.Persistent,
      measure,
    ]);

    const newMeasure = { ...measure };
    if (expression) {
      const expressionValidationResp = await this.rillDeveloperService.dispatch(
        rillRequestContext,
        "validateMeasureExpression",
        [metricsDefId, measure.id, expression]
      );
      newMeasure.expressionIsValid = (
        expressionValidationResp?.data as Partial<MeasureDefinitionEntity>
      ).expressionIsValid;
    }

    return ActionResponseFactory.getSuccessResponse("", newMeasure);
  }

  @RillDeveloperActions.MetricsDefinitionAction()
  public async updateMeasure(
    rillRequestContext: MetricsDefinitionContext,
    measureId: string,
    modifications: MeasureDefinitionEntity
  ) {
    modifications.id = measureId;
    this.dataModelerStateService.dispatch("updateEntity", [
      EntityType.MeasureDefinition,
      StateType.Persistent,
      modifications,
    ]);
    return ActionResponseFactory.getSuccessResponse(
      "",
      this.dataModelerStateService
        .getMeasureDefinitionService()
        .getById(measureId)
    );
  }

  @RillDeveloperActions.MetricsDefinitionAction()
  public async deleteMeasure(
    rillRequestContext: MetricsDefinitionContext,
    measureId: string
  ) {
    this.dataModelerStateService.dispatch("deleteEntity", [
      EntityType.MeasureDefinition,
      StateType.Persistent,
      measureId,
    ]);
  }

  @RillDeveloperActions.MetricsDefinitionAction()
  public async validateMeasureExpression(
    rillRequestContext: MetricsDefinitionContext,
    metricsDefId: string,
    measureId: string,
    expression: string
  ) {
    if (!metricsDefId || !rillRequestContext.record)
      return ActionResponseFactory.getEntityError(
        `No metrics found for id=${metricsDefId}`
      );

    const persistentModel = this.dataModelerStateService
      .getEntityStateService(EntityType.Model, StateType.Persistent)
      .getById(rillRequestContext.record.sourceModelId);
    const derivedModel = this.dataModelerStateService
      .getEntityStateService(EntityType.Model, StateType.Derived)
      .getById(rillRequestContext.record.sourceModelId);
    if (!persistentModel || !derivedModel) {
      return ActionResponseFactory.getEntityError(
        ExplorerSourceModelDoesntExist
      );
    }

    const parsedExpression = parseExpression(expression, derivedModel.profile);
    const missingColumns = parsedExpression.columns.filter(
      (columnName) =>
        columnName !== "*" &&
        derivedModel.profile.findIndex(
          (column) => column.name.toLowerCase() === columnName.toLowerCase()
        ) === -1
    );

    let expressionIsValid =
      parsedExpression.isValid && missingColumns.length === 0;

    if (missingColumns.length > 0) {
      parsedExpression.error ??= {};
      parsedExpression.error.missingColumns = missingColumns;
      parsedExpression.error.missingFrom = persistentModel.tableName;
      expressionIsValid = false;
    }

    if (!parsedExpression.error) {
      const errorMessage = await this.databaseActionQueue.enqueue(
        {
          id: metricsDefId,
          priority: DatabaseActionQueuePriority.ActiveModel,
        },
        "validateMeasureExpression",
        [persistentModel.tableName, expression]
      );
      if (errorMessage) {
        parsedExpression.error = {
          message: errorMessage,
        };
        expressionIsValid = false;
      }
    }

    // save this validation status for meta api
    this.dataModelerStateService.dispatch("updateEntity", [
      EntityType.MeasureDefinition,
      StateType.Persistent,
      {
        id: measureId,
        expressionIsValid: expressionIsValid
          ? ValidationState.OK
          : ValidationState.ERROR,
        expressionValidationError: parsedExpression.error,
      } as MeasureDefinitionEntity,
    ]);

    return ActionResponseFactory.getSuccessResponse("", {
      expressionIsValid: expressionIsValid
        ? ValidationState.OK
        : ValidationState.ERROR,
      expressionValidationError: parsedExpression.error,
    });
  }
}
