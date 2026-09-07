import type { NextApiRequest, NextApiResponse } from "next";
import { withSession, Session } from "../../../lib/session";

export default withSession(async function (_req: NextApiRequest, res: NextApiResponse, session: Session) {
  res.status(200).json({
    user: {
      userId: session.userId,
      email: session.email,
      role: session.role,
      full_name: session.full_name,
      exp: session.exp,
    },
  });
});