import { z } from "zod";
const fieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.string().min(1),
  source: z.string(),
  confidence: z.number(),
  editable: z.boolean(),
});
const schema = z.object({
  approval: z.object({
    approved: z.literal(true),
    approvedAt: z.string().datetime(),
  }),
  draft: z.object({
    programId: z.literal("fema-ia"),
    programName: z.string(),
    fields: z.array(fieldSchema).min(1),
    missingFields: z.array(z.string()).length(0),
    warnings: z.array(z.string()),
    readyForReview: z.literal(true),
  }),
});
export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > 30000)
      return Response.json({ error: "Request too large" }, { status: 413 });
    schema.parse(JSON.parse(raw));
    const submittedAt = new Date().toISOString();
    const sequence = submittedAt.replace(/\D/g, "").slice(-8);
    return Response.json({
      applicationId: `DEMO-2026-${sequence}`,
      status: "submitted",
      submittedAt,
      simulated: true,
    });
  } catch {
    return Response.json(
      { error: "Approved, complete demo application required" },
      { status: 400 },
    );
  }
}
