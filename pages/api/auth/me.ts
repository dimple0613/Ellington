import type { NextApiRequest, NextApiResponse } from "next";
import { withSession, Session } from "../../../lib/session";

export default withSession(async function (_req: NextApiRequest, res: NextApiResponse, session: Session) {
  res.status(200).json({
    user: { userId: session.userId, email: session.email, role: session.role, exp: session.exp },
  });
});