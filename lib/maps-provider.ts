import {
  demoRouteData,
  evaluateDemoRoutes,
  type RouteCandidate,
} from "./route-risk";

export type RouteRequest = {
  origin: [number, number];
  destination: [number, number];
  alternatives?: number;
};
export interface MapsProvider {
  readonly name: string;
  getRoutes(request: RouteRequest): Promise<RouteCandidate[]>;
}

export class DemoMapsProvider implements MapsProvider {
  readonly name = "Deterministic demo geometry";
  async getRoutes(_request: RouteRequest) {
    return evaluateDemoRoutes();
  }
}

export class AzureMapsProvider implements MapsProvider {
  readonly name = "Azure Maps";
  constructor(
    private readonly credential = process.env.AZURE_MAPS_SUBSCRIPTION_KEY,
  ) {}
  async getRoutes(request: RouteRequest): Promise<RouteCandidate[]> {
    if (!this.credential)
      throw new Error("AZURE_MAPS_SUBSCRIPTION_KEY is not configured");
    // Route v2025-01-01 uses a POST contract. It is intentionally not invoked by
    // the deterministic judge flow until an Azure Maps account is configured and
    // its response fixture is verified against the chosen regional deployment.
    const response = await fetch(
      "https://atlas.microsoft.com/route/directions?api-version=2025-01-01",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/geo+json",
          "subscription-key": this.credential,
        },
        signal: AbortSignal.timeout(7000),
        body: JSON.stringify({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: request.origin },
              properties: { pointIndex: 0, pointType: "waypoint" },
            },
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: request.destination },
              properties: { pointIndex: 1, pointType: "waypoint" },
            },
          ],
        }),
      },
    );
    if (!response.ok) throw new Error(`Azure Maps HTTP ${response.status}`);
    // Fail closed until the deployment's v2025 response is normalized and tested.
    throw new Error(
      "Azure Maps response normalization requires a configured deployment fixture",
    );
  }
}

export const demoRouteRequest: RouteRequest = {
  origin: demoRouteData.home,
  destination: demoRouteData.shelter,
  alternatives: 1,
};
