import { NextRequest } from "next/server";
import { jwtVerify } from "jose";

function getSecret() {
  return new TextEncoder().encode(process.env.ADMIN_PASSWORD);
}

export async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get("fyb_admin_token")?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}
