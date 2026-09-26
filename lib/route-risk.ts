import booleanIntersects from "@turf/boolean-intersects";
import { lineString, polygon } from "@turf/helpers";

export type RouteCandidate = {
  id: string;
  label: string;
  minutes: number;
  miles: number;
  coordinates: [number, number][];
  color: string;
  intersectsHazard: boolean;
};
export const demoRouteData = {
  home: [-77.3064, 38.8462] as [number, number],
  shelter: [-77.2702, 38.8721] as [number, number],
  hazard: [
    [
      [-77.3, 38.838],
      [-77.276, 38.842],
      [-77.281, 38.865],
      [-77.305, 38.861],
      [-77.3, 38.838],
    ],
  ] as [number, number][][],
};
export function evaluateDemoRoutes(): RouteCandidate[] {
  const candidates = [
    {
      id: "fastest",
      label: "Fastest candidate",
      minutes: 11,
      miles: 3.2,
      color: "#b54a3d",
      coordinates: [
        demoRouteData.home,
        [-77.291, 38.851],
        [-77.281, 38.86],
        demoRouteData.shelter,
      ] as [number, number][],
    },
    {
      id: "alternative",
      label: "Risk-aware alternative",
      minutes: 17,
      miles: 4.7,
      color: "#245d4d",
      coordinates: [
        demoRouteData.home,
        [-77.318, 38.862],
        [-77.303, 38.878],
        [-77.281, 38.879],
        demoRouteData.shelter,
      ] as [number, number][],
    },
  ];
  const hazard = polygon(demoRouteData.hazard);
  return candidates.map((route) => ({
    ...route,
    intersectsHazard: booleanIntersects(lineString(route.coordinates), hazard),
  }));
}
export function toMapPoint(point: [number, number]) {
  const minX = -77.325,
    maxX = -77.263,
    minY = 38.833,
    maxY = 38.884;
  return {
    x: ((point[0] - minX) / (maxX - minX)) * 100,
    y: 100 - ((point[1] - minY) / (maxY - minY)) * 100,
  };
}
