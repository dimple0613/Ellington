import type { NextApiRequest, NextApiResponse } from "next";
import { withSession, Session } from "../../../lib/session";
import { ok } from "../../../lib/api";

export default withSession(async function (_req: NextApiRequest, res: NextApiResponse, session: Session) {
  ok(res, {
    user: {
      userId: session.userId,
      email: session.email,
      role: session.role,
      full_name: session.full_name,
      exp: session.exp,
    },
  });
});