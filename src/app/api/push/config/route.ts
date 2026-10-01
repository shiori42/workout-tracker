import { pushConfigured } from "@/lib/server/push";
import { json } from "../_shared";

export const dynamic = "force-dynamic";

export function GET() {
  return json({
    enabled: pushConfigured,
    publicKey: pushConfigured ? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY : null,
  });
}
