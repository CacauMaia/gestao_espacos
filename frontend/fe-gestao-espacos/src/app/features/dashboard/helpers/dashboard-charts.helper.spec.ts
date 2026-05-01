import { buildOccupancyChartItems, buildOccupancyDonutBackground } from './dashboard-charts.helper';

describe('dashboard chart helpers', () => {
  it('sorts occupancy chart items by highest occupancy', () => {
    const items = buildOccupancyChartItems([
      { spaceId: 'a', name: 'A', type: 'classroom', capacity: 10, currentOccupancy: 1, availableSlots: 9, occupancyPercentage: 10 },
      { spaceId: 'b', name: 'B', type: 'laboratory', capacity: 10, currentOccupancy: 7, availableSlots: 3, occupancyPercentage: 70 },
    ]);

    expect(items.map((item) => item.spaceId)).toEqual(['b', 'a']);
  });

  it('clamps chart percentages and donut values', () => {
    const [item] = buildOccupancyChartItems([
      { spaceId: 'a', name: 'A', type: 'study', capacity: 10, currentOccupancy: 12, availableSlots: 0, occupancyPercentage: 120 },
    ]);

    expect(item.occupancyPercentage).toBe(100);
    expect(buildOccupancyDonutBackground(1.2)).toContain('100%');
  });
});
