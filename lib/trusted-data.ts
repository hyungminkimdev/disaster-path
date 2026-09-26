import { z } from "zod";
const alertSchema = z.object({
  features: z.array(
    z.object({
      id: z.string(),
      properties: z.object({
        event: z.string(),
        headline: z.string().nullable(),
        sent: z.string(),
        expires: z.string().nullable(),
        severity: z.string(),
      }),
    }),
  ),
});
const femaSchema = z.object({
  DisasterDeclarationsSummaries: z.array(
    z.object({
      disasterNumber: z.number(),
      declarationTitle: z.string(),
      declarationDate: z.string(),
      designatedArea: z.string(),
      iaProgramDeclared: z.boolean(),
    }),
  ),
});
export async function getTrustedData() {
  const checkedAt = new Date().toISOString();
  const [nws, fema] = await Promise.allSettled([
    fetch("https://api.weather.gov/alerts/active?point=38.8462,-77.3064", {
      headers: {
        "User-Agent":
          process.env.NWS_USER_AGENT || "DisasterPath-Hackathon/0.1",
        Accept: "application/geo+json",
      },
      signal: AbortSignal.timeout(6500),
      cache: "no-store",
    }).then(async (r) => {
      if (!r.ok) throw new Error("NWS unavailable");
      return alertSchema
        .parse(await r.json())
        .features.map((a) => ({
          id: a.id,
          title: a.properties.event,
          headline: a.properties.headline,
          issuedAt: a.properties.sent,
          expiresAt: a.properties.expires,
          severity: a.properties.severity,
        }));
    }),
    fetch(
      `https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?${new URLSearchParams({ $filter: "state eq 'VA' and fipsCountyCode eq '059'", $orderby: "declarationDate desc", $top: "5", $select: "disasterNumber,declarationTitle,declarationDate,designatedArea,iaProgramDeclared" })}`,
      { signal: AbortSignal.timeout(6500), cache: "no-store" },
    ).then(async (r) => {
      if (!r.ok) throw new Error("OpenFEMA unavailable");
      return femaSchema.parse(await r.json()).DisasterDeclarationsSummaries;
    }),
  ]);
  return {
    checkedAt,
    weather:
      nws.status === "fulfilled"
        ? {
            mode: "live" as const,
            items: nws.value,
            message:
              "NWS alerts at the Fairfax city reference point; not county-wide coverage.",
          }
        : {
            mode: "unavailable" as const,
            items: [],
            message:
              "NWS could not be reached. Current safety conditions are unknown. Use official local alerts.",
          },
    declarations:
      fema.status === "fulfilled"
        ? {
            mode: "live" as const,
            items: fema.value,
            message:
              "Recent declaration records for Fairfax County. Historical records do not establish current application availability or eligibility.",
          }
        : {
            mode: "unavailable" as const,
            items: [],
            message:
              "OpenFEMA could not be reached. No live assistance determination was made.",
          },
  };
}
export type TrustedData = Awaited<ReturnType<typeof getTrustedData>>;
