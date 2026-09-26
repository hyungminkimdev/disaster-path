import { z } from "zod";
import { hasSensitiveData } from "@/lib/intake";
import { interpretStory } from "@/lib/intake-provider";
const schema = z
  .object({
    text: z.string().trim().min(3).max(2000),
    forceLocal: z.boolean().optional(),
  })
  .strict();
export async function POST(request: Request) {
  try {
    const text = await request.text();
    if (text.length > 12000)
      return Response.json(
        { error: "Please keep your description under 2,000 characters." },
        { status: 413 },
      );
    const parsed = schema.safeParse(JSON.parse(text));
    if (!parsed.success)
      return Response.json(
        {
          error:
            "Please describe your situation in a few words (up to 2,000 characters).",
        },
        { status: 400 },
      );
    if (hasSensitiveData(parsed.data.text))
      return Response.json(
        {
          error:
            "Please remove account numbers, passwords, or identity numbers. We only need your situation.",
        },
        { status: 400 },
      );
    return Response.json(
      await interpretStory(parsed.data.text, parsed.data.forceLocal),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "We could not read that description. Please try again." },
      { status: 400 },
    );
  }
}
