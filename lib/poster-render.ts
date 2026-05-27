import { SignJWT, jwtVerify } from "jose";
import type { PosterData } from "@/components/PosterTemplate";

function getSecret(): Uint8Array {
  const secret = process.env.INTERNAL_RENDER_TOKEN;
  if (!secret) throw new Error("INTERNAL_RENDER_TOKEN not set");
  return new TextEncoder().encode(secret);
}

// Sign a short-lived JWT carrying the row of poster data so the server-rendered
// /poster-render page can pick it up without a DB round-trip.
export async function signPosterToken(data: PosterData): Promise<string> {
  return await new SignJWT({ data })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("10m")
    .sign(getSecret());
}

export async function verifyPosterToken(token: string): Promise<PosterData> {
  const { payload } = await jwtVerify(token, getSecret());
  const data = (payload as { data?: PosterData }).data;
  if (!data) throw new Error("token has no poster data");
  return data;
}

export function getRenderBaseUrl(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return process.env.NEXTAUTH_URL || "http://localhost:3000";
}
