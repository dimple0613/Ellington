export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { withSession, Session } from "../../lib/session";
import { PROJECTS } from "../../lib/data";

export default withSession(async function (_req: NextRequest, _session: Session) {
  return NextResponse.json({
    projects: PROJECTS,
  });
});
