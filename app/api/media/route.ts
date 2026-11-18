import { getChatGPTUser } from "../../chatgpt-auth";
import { getR2 } from "../../../db";

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

export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "Sign in before uploading an image." }, { status: 401 });

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

    const key = `${scope}/${crypto.randomUUID()}.${extension}`;
    await getR2().put(key, await image.arrayBuffer(), {
      httpMetadata: { contentType: image.type, cacheControl: "public, max-age=31536000, immutable" },
    });
    return Response.json({ key });
  } catch (error) {
    return Response.json({ error: messageFor(error) }, { status: 400 });
  }
}

export async function GET(request: Request) {
  try {
    const key = safeKey(new URL(request.url).searchParams.get("key"));
    if (!key) return new Response("Not found", { status: 404 });

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
