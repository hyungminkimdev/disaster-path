import { z } from "zod";
import { householdSchema, phaseSchema } from "@/lib/domain";
import { generatePlan } from "@/lib/foundry";
const requestSchema = z
  .object({
    phase: phaseSchema,
    household: householdSchema,
    forceDemo: z.boolean().optional(),
  })
  .strict();
export async function POST(request: Request) {
  try {
    const text = await request.text();
    if (text.length > 4096)
      return Response.json({ error: "Request too large" }, { status: 413 });
    const parsed = requestSchema.safeParse(JSON.parse(text));
    if (!parsed.success)
      return Response.json(
        { error: "Invalid recovery context" },
        { status: 400 },
      );
    return Response.json(
      await generatePlan(
        parsed.data.phase,
        parsed.data.household,
        parsed.data.forceDemo,
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
}
