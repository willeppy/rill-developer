import type { EntityRecord } from "@rilldata/web-local/common/data-modeler-state-service/entity-state-service/EntityStateService";

export function getNextEntityId(
  entities: Array<EntityRecord>,
  entityId: string
): string {
  if (entities.length === 1) return undefined;
  const idx = entities.findIndex((entity) => entity.id === entityId);
  if (idx === 0) {
    return entities[idx + 1].id;
  } else {
    return entities[idx - 1].id;
  }
}
