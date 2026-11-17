import { getChatGPTUser } from "../../chatgpt-auth";
import { getCommunityDetail, getPocketState, runPocketAction, type Viewer } from "../../../db/pocket";

async function viewerFromRequest(): Promise<Viewer> {
  const user = await getChatGPTUser();
  if (user) return { id: `chatgpt:${user.email.toLowerCase()}`, displayName: user.displayName };
  return { id: "demo:pocket", displayName: "Pocket Explorer" };
}

function messageFor(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export async function GET(request: Request) {
  try {
    const viewer = await viewerFromRequest();
    const communityId = new URL(request.url).searchParams.get("communityId");
    if (communityId) return Response.json({ state: await getPocketState(viewer), community: await getCommunityDetail(viewer, communityId) });
    return Response.json(await getPocketState(viewer));
  } catch (error) {
    return Response.json({ error: messageFor(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const viewer = await viewerFromRequest();
    const result = await runPocketAction(viewer, payload);
    return Response.json({ ...result, state: await getPocketState(viewer) });
  } catch (error) {
    return Response.json({ error: messageFor(error) }, { status: 400 });
  }
}
