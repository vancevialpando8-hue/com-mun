import { env as cloudflareEnv } from "cloudflare:workers";
import { normalizePublicWalletAddress } from "../../db/supabase-pocket";

export const WALLET_COOKIE = "com_mun_wallet";
const COOKIE_MAX_AGE = 31536000;

function runtimeValue(name: string) {
  const processEnv = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env;
  const processValue = processEnv?.[name];
  if (processValue) return processValue;
  const runtimeValue = (cloudflareEnv as unknown as Record<string, unknown>)[name];
  return typeof runtimeValue === "string" ? runtimeValue : undefined;
}

function sessionSecret() {
  return runtimeValue("WALLET_COOKIE_SECRET") || runtimeValue("SUPABASE_SERVICE_ROLE_KEY") || runtimeValue("SUPABASE_SECRET_KEY");
}

function base64Url(bytes: ArrayBuffer | Uint8Array) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function signingKey() {
  const secret = sessionSecret();
  if (!secret) return null;
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function signatureFor(address: string) {
  const key = await signingKey();
  if (!key) return null;
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(address));
  return base64Url(signature);
}

function cookieValue(request: Request) {
  const cookies = request.headers.get("cookie")?.split(";").map((cookie) => cookie.trim()) ?? [];
  const value = cookies.find((cookie) => cookie.startsWith(`${WALLET_COOKIE}=`))?.slice(WALLET_COOKIE.length + 1);
  return value ? decodeURIComponent(value) : null;
}

export async function verifyWalletSession(request: Request) {
  const raw = cookieValue(request);
  if (!raw) return null;
  const separator = raw.lastIndexOf(".");
  if (separator <= 0) return null;
  try {
    const address = normalizePublicWalletAddress(raw.slice(0, separator));
    const signature = raw.slice(separator + 1);
    const key = await signingKey();
    if (!key || !signature) return null;
    const expected = await crypto.subtle.verify("HMAC", key, fromBase64Url(signature), new TextEncoder().encode(address));
    return expected ? address : null;
  } catch {
    return null;
  }
}

export async function walletSessionCookie(address: string) {
  const normalized = normalizePublicWalletAddress(address);
  const signature = await signatureFor(normalized);
  if (!signature) return null;
  return `${WALLET_COOKIE}=${encodeURIComponent(`${normalized}.${signature}`)}; Max-Age=${COOKIE_MAX_AGE}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

export function hasTrustedChatGPTIdentity() {
  return runtimeValue("ALLOW_UNVERIFIED_CHATGPT_HEADER") === "true";
}
