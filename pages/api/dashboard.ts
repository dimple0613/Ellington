export const runtime = "edge";

import { withSession } from "../../lib/session";
import { PROJECTS } from "../../lib/data";

export default withSession(async function (_req, res) {
  return res.status(200).json({
    projects: PROJECTS,
  });
});
