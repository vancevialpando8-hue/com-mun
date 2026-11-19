import { getChatGPTUser } from "../../chatgpt-auth";
import { getBattleState, getCommunityDetail, getPocketState, runPocketAction, type Viewer } from "../../../db/pocket";
import { normalizePublicWalletAddress } from "../../../db/supabase-pocket";

const WALLET_COOKIE = "com_mun_wallet";

function cookieValue(request: Request, name: string) {
  const cookies = request.headers.get("cookie")?.split(";").map((cookie) => cookie.trim()) ?? [];
  const value = cookies.find((cookie) => cookie.startsWith(`${name}=`))?.slice(name.length + 1);
  return value ? decodeURIComponent(value) : null;
}

async function viewerFromRequest(request: Request, walletOverride?: string): Promise<Viewer> {
  const user = await getChatGPTUser();
  if (user) return { id: `chatgpt:${user.email.toLowerCase()}`, displayName: user.displayName };
  const wallet = walletOverride ?? cookieValue(request, WALLET_COOKIE);
  if (wallet) return { id: `wallet:${wallet.toLowerCase()}`, displayName: `Wallet ${wallet.slice(0, 6)}…${wallet.slice(-4)}` };
  return { id: "demo:pocket", displayName: "Com-Munitiez Explorer" };
}

function messageFor(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export async function GET(request: Request) {
  try {
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
    const payload = (await request.json()) as Record<string, unknown>;
    const walletAddress = payload.action === "save-wallet" ? normalizePublicWalletAddress(payload.walletAddress) : undefined;
    const authenticatedUser = await getChatGPTUser();
    const viewer = await viewerFromRequest(request, walletAddress);
    const result = await runPocketAction(viewer, payload);
    const response = Response.json({ ...result, state: await getPocketState(viewer) });
    if (walletAddress && !authenticatedUser) response.headers.set("Set-Cookie", `${WALLET_COOKIE}=${encodeURIComponent(walletAddress)}; Max-Age=31536000; Path=/; HttpOnly; Secure; SameSite=Lax`);
    return response;
  } catch (error) {
    return Response.json({ error: messageFor(error) }, { status: 400 });
  }
}
