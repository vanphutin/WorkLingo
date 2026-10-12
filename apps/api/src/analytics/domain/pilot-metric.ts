import { createHash } from 'node:crypto';
import {
  pilotMetricDimensionsSchema,
  pilotMetricEventTypeSchema,
  type PilotMetricDimensions,
  type PilotMetricEventType,
} from '@worklingo/contracts';

export interface PilotMetricInput {
  readonly dimensions?: PilotMetricDimensions;
  readonly eventType: PilotMetricEventType;
  readonly occurredAt?: Date;
  readonly sourceKey: string;
}

export interface BuiltPilotMetric {
  readonly dateKey: string;
  readonly dimensionKey: string;
  readonly dimensions: PilotMetricDimensions;
  readonly eventType: PilotMetricEventType;
  readonly occurredAt: Date;
  readonly sourceHash: string;
}

export function hashMetricSource(sourceKey: string): string {
  if (sourceKey.trim().length === 0 || sourceKey.length > 512) {
    throw new Error('Pilot metric sourceKey must be between 1 and 512 characters');
  }
  return createHash('sha256').update(sourceKey).digest('hex');
}

export function buildPilotMetric(input: PilotMetricInput): BuiltPilotMetric {
  const eventType = pilotMetricEventTypeSchema.parse(input.eventType);
  const parsedDimensions = pilotMetricDimensionsSchema.parse(input.dimensions ?? {});
  const dimensions = Object.fromEntries(
    Object.entries(parsedDimensions).sort(([left], [right]) => left.localeCompare(right)),
  ) as PilotMetricDimensions;
  const occurredAt = input.occurredAt ?? new Date();
  if (Number.isNaN(occurredAt.getTime())) {
    throw new Error('Pilot metric occurredAt must be a valid date');
  }

  return {
    dateKey: occurredAt.toISOString().slice(0, 10),
    dimensionKey: createHash('sha256').update(JSON.stringify(dimensions)).digest('hex'),
    dimensions,
    eventType,
    occurredAt,
    sourceHash: hashMetricSource(input.sourceKey),
  };
}
