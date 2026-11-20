import { getChatGPTUser } from "../../chatgpt-auth";
import { getR2 } from "../../../db";
import { getSupabaseAdmin } from "../../../db/supabase-pocket";
import { isRateLimited } from "../../auth/rate-limit";
import { verifyWalletSession } from "../../auth/session";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const imageExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function safeKey(value: string | null) {
  return value && /^(avatar|community)\/[a-f0-9-]+\.(jpg|png|webp|gif)$/.test(value)
    ? value
    : null;
}

function messageFor(error: unknown) {
  return error instanceof Error ? error.message : "Image upload failed. Please try again.";
}

function validSignature(type: string, bytes: Uint8Array) {
  const startsWith = (...values: number[]) => values.every((value, index) => bytes[index] === value);
  if (type === "image/jpeg") return startsWith(0xff, 0xd8, 0xff);
  if (type === "image/png") return startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  if (type === "image/gif") return bytes.length >= 6 && String.fromCharCode(...bytes.slice(0, 6)) in { GIF87a: true, GIF89a: true };
  if (type === "image/webp") return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return false;
}

export async function POST(request: Request) {
  try {
    if (isRateLimited(request, "media-write", 10)) return Response.json({ error: "Too many uploads. Try again shortly." }, { status: 429, headers: { "Retry-After": "60" } });
    const contentLength = Number(request.headers.get("content-length") || "0");
    if (contentLength > 2_500_000) return Response.json({ error: "Upload is too large." }, { status: 413 });
    const user = await getChatGPTUser();
    const wallet = await verifyWalletSession(request);
    if (!user && !wallet) return Response.json({ error: "Connect a wallet before uploading an image." }, { status: 401 });

    const form = await request.formData();
    const scope = form.get("scope");
    const image = form.get("image");
    if ((scope !== "avatar" && scope !== "community") || !(image instanceof File)) {
      return Response.json({ error: "Choose an image to upload." }, { status: 400 });
    }

    const extension = imageExtensions[image.type];
    if (!extension || image.size === 0 || image.size > MAX_IMAGE_BYTES) {
      return Response.json({ error: "Use a JPG, PNG, WebP, or GIF image under 2 MB." }, { status: 400 });
    }

    const imageBuffer = await image.arrayBuffer();
    if (!validSignature(image.type, new Uint8Array(imageBuffer))) return Response.json({ error: "That file does not match its image type." }, { status: 400 });

    const key = `${scope}/${crypto.randomUUID()}.${extension}`;
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { error } = await supabase.storage.from("community-media").upload(key, imageBuffer, {
        contentType: image.type,
        cacheControl: "31536000",
        upsert: false,
      });
      if (error) throw new Error(error.message);
    } else {
      await getR2().put(key, imageBuffer, {
        httpMetadata: { contentType: image.type, cacheControl: "public, max-age=31536000, immutable" },
      });
    }
    return Response.json({ key });
  } catch (error) {
    return Response.json({ error: messageFor(error) }, { status: 400 });
  }
}

export async function GET(request: Request) {
  try {
    const key = safeKey(new URL(request.url).searchParams.get("key"));
    if (!key) return new Response("Not found", { status: 404 });

    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data, error } = await supabase.storage.from("community-media").download(key);
      if (error || !data) return new Response("Not found", { status: 404 });
      return new Response(data, { headers: { "Content-Type": contentTypeForKey(key), "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
    }
    const image = await getR2().get(key);
    if (!image) return new Response("Not found", { status: 404 });
    return new Response(image.body, {
      headers: {
        "Content-Type": image.httpMetadata?.contentType || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Image unavailable", { status: 503 });
  }
}

function contentTypeForKey(key: string) {
  const extension = key.split(".").pop();
  return extension === "jpg" ? "image/jpeg" : extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/gif";
}
