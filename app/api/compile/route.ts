import { z } from "zod";
import { compileEvent } from "@/lib/crisis-compiler";

const requestSchema = z.object({
  twin: z.unknown(),
  event: z.object({
    id: z.string(),
    type: z.enum([
      "FLASH_FLOOD_WARNING",
      "HOME_FLOODED",
      "FEMA_ASSISTANCE_DECLARED",
      "RECOVERY_CENTER_OPENED",
      "APPLICATION_SUBMITTED",
      "DOCUMENT_REQUESTED",
    ]),
    occurredAt: z.string(),
    applicationId: z.string().optional(),
  }),
  forceDemo: z.boolean().optional(),
});
export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > 75000)
      return Response.json({ error: "Request too large" }, { status: 413 });
    const parsed = requestSchema.parse(JSON.parse(raw));
    return Response.json(
      await compileEvent(
        parsed.twin as never,
        parsed.event as never,
        parsed.forceDemo,
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ error: "Invalid recovery event" }, { status: 400 });
  }
}
