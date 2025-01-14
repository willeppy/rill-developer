import { EntityType } from "@rilldata/web-local/common/data-modeler-state-service/entity-state-service/EntityStateService";
import type { MeasureDefinitionEntity } from "@rilldata/web-local/common/data-modeler-state-service/entity-state-service/MeasureDefinitionStateService";
import { ValidationState } from "@rilldata/web-local/common/data-modeler-state-service/entity-state-service/MetricsDefinitionEntityService";
import { getMessageFromParseError } from "@rilldata/web-local/common/expression-parser/getMessageFromParseError";
import { selectMeasureById } from "./measure-definition-selectors";
import {
  addManyMeasures,
  addOneMeasure,
  removeMeasure,
  setMeasureExpressionValidation,
  updateMeasure,
} from "./measure-definition-slice";
import { createAsyncThunk } from "../redux-toolkit-wrapper";
import { generateApis } from "../utils/api-utils";
import { handleErrorResponse } from "../utils/handleErrorResponse";
import { invalidateExplorerThunk } from "../utils/invalidateExplorerThunk";
import type { ValidationConfig } from "../utils/validation-utils";
import { fetchWrapper } from "../../util/fetchWrapper";

const MeasureExpressionValidation: ValidationConfig<MeasureDefinitionEntity> = {
  field: "expression",
  validate: async (entity, changes) => {
    try {
      const resp = await fetchWrapper("measures/validate-expression", "POST", {
        metricsDefId: changes.metricsDefId ?? entity.metricsDefId,
        measureId: entity.id,
        expression: changes.expression,
      });
      return {
        expressionIsValid: resp.expressionIsValid,
        expressionValidationError: resp.expressionValidationError
          ? getMessageFromParseError(
              changes.expression,
              resp.expressionValidationError
            )
          : "",
      };
    } catch (err) {
      handleErrorResponse(err.response);
      return Promise.resolve({});
    }
  },
  validationPassed: (changes) =>
    changes.expressionIsValid === ValidationState.OK,
};

export const {
  fetchManyApi: fetchManyMeasuresApi,
  createApi: createMeasuresApi,
  updateApi: updateMeasuresApi,
  deleteApi: deleteMeasuresApi,
} = generateApis<
  EntityType.MeasureDefinition,
  { metricsDefId: string },
  { metricsDefId: string }
>(
  [EntityType.MeasureDefinition, "measureDefinition", "measures"],
  [addManyMeasures, addOneMeasure, updateMeasure, removeMeasure],
  [MeasureExpressionValidation]
);
export const updateMeasuresWrapperApi = invalidateExplorerThunk(
  EntityType.MeasureDefinition,
  updateMeasuresApi,
  ["label", "expression", "sqlName", "description", "formatPreset"],
  (state, id) => [selectMeasureById(state, id).metricsDefId]
);

export const validateMeasureExpressionApi = createAsyncThunk(
  `${EntityType.MeasureDefinition}/validate-expression`,
  async (
    {
      metricsDefId,
      measureId,
      expression,
    }: { metricsDefId: string; measureId: string; expression: string },
    thunkAPI
  ) => {
    try {
      const resp = await fetchWrapper("measures/validate-expression", "POST", {
        metricsDefId,
        measureId,
        expression,
      });
      thunkAPI.dispatch(
        setMeasureExpressionValidation(
          measureId,
          resp.expressionIsValid,
          resp.expressionValidationError
            ? getMessageFromParseError(
                expression,
                resp.expressionValidationError
              )
            : ""
        )
      );
    } catch (err) {
      handleErrorResponse(err.response);
    }
  }
);
