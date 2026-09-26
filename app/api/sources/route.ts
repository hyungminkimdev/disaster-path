import { getTrustedData } from "@/lib/trusted-data";
export async function GET() {
  return Response.json(await getTrustedData(), {
    headers: { "Cache-Control": "no-store" },
  });
}
