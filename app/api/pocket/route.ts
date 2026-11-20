import { getChatGPTUser } from "../../chatgpt-auth";
import { getBattleState, getCommunityDetail, getPocketState, runPocketAction, type Viewer } from "../../../db/pocket";
import { normalizePublicWalletAddress } from "../../../db/supabase-pocket";
import { isRateLimited } from "../../auth/rate-limit";
import { verifyWalletSession, walletSessionCookie } from "../../auth/session";

async function viewerFromRequest(request: Request, walletOverride?: string): Promise<Viewer> {
  const user = await getChatGPTUser();
  if (user) return { id: `chatgpt:${user.email.toLowerCase()}`, displayName: user.displayName };
  const wallet = walletOverride ?? await verifyWalletSession(request);
  if (wallet) return { id: `wallet:${wallet.toLowerCase()}`, displayName: `Wallet ${wallet.slice(0, 6)}…${wallet.slice(-4)}` };
  return { id: "demo:pocket", displayName: "Com-Munitiez Explorer" };
}

function messageFor(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export async function GET(request: Request) {
  try {
    if (isRateLimited(request, "pocket-read", 120)) return Response.json({ error: "Too many requests. Try again shortly." }, { status: 429, headers: { "Retry-After": "60" } });
    const viewer = await viewerFromRequest(request);
    const communityId = new URL(request.url).searchParams.get("communityId");
    const battles = new URL(request.url).searchParams.get("battles");
    if (communityId) return Response.json({ state: await getPocketState(viewer), community: await getCommunityDetail(viewer, communityId) });
    if (battles) return Response.json({ state: await getPocketState(viewer), battles: await getBattleState(viewer) });
    return Response.json(await getPocketState(viewer));
  } catch (error) {
    return Response.json({ error: messageFor(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (isRateLimited(request, "pocket-write", 30)) return Response.json({ error: "Too many requests. Try again shortly." }, { status: 429, headers: { "Retry-After": "60" } });
    const contentLength = Number(request.headers.get("content-length") || "0");
    if (contentLength > 32_000) return Response.json({ error: "Request is too large." }, { status: 413 });
    const payload = (await request.json()) as Record<string, unknown>;
    const walletAddress = payload.action === "save-wallet" ? normalizePublicWalletAddress(payload.walletAddress) : undefined;
    const authenticatedUser = await getChatGPTUser();
    const viewer = await viewerFromRequest(request, walletAddress);
    const result = await runPocketAction(viewer, payload);
    const response = Response.json({ ...result, state: await getPocketState(viewer) });
    if (walletAddress && !authenticatedUser) {
      const cookie = await walletSessionCookie(walletAddress);
      if (cookie) response.headers.set("Set-Cookie", cookie);
    }
    return response;
  } catch (error) {
    return Response.json({ error: messageFor(error) }, { status: 400 });
  }
}
