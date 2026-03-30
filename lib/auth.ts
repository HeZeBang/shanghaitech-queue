import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-me"
);

export async function signToken(payload: {
  sessionId: string;
  code: string;
}): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

export async function verifyToken(
  token: string
): Promise<{ sessionId: string; code: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as { sessionId: string; code: string };
  } catch {
    return null;
  }
}

export async function setAuthCookie(code: string, token: string) {
  const cookieStore = await cookies();
  cookieStore.set(`teacher_token_${code}`, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  });
}

export async function getAuthFromCookie(
  code: string
): Promise<{ sessionId: string; code: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(`teacher_token_${code}`)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireTeacher(code: string) {
  const auth = await getAuthFromCookie(code);
  if (!auth || auth.code !== code) {
    return null;
  }
  return auth;
}
