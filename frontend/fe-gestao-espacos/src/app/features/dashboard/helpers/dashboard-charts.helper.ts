import { Occupancy } from '../dashboard.interfaces';

export interface OccupancyChartItem {
  spaceId: string;
  name: string;
  currentOccupancy: number;
  capacity: number;
  availableSlots: number;
  occupancyPercentage: number;
}

export function buildOccupancyChartItems(occupancy: readonly Occupancy[]): OccupancyChartItem[] {
  return [...occupancy]
    .sort((a, b) => b.occupancyPercentage - a.occupancyPercentage)
    .map((item) => ({
      spaceId: item.spaceId,
      name: item.name,
      currentOccupancy: item.currentOccupancy,
      capacity: item.capacity,
      availableSlots: item.availableSlots,
      occupancyPercentage: Math.min(100, Math.max(0, item.occupancyPercentage)),
    }));
}

export function buildOccupancyDonutBackground(occupancyRate: number): string {
  const value = Math.round(Math.min(1, Math.max(0, occupancyRate)) * 100);
  return `conic-gradient(var(--color-primary) ${value}%, var(--color-surface-muted) 0)`;
}
