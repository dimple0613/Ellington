import type { NextApiRequest, NextApiResponse } from "next";
import { withPerm } from "../../lib/permissions";
import { query } from "../../lib/db";
import { ok } from "../../lib/api";

export default withPerm("Handover", "REA", async function (_req: NextApiRequest, res: NextApiResponse) {
  const [pipeline, snagging, deeds] = await Promise.all([
    query<any>(
      `SELECT unit_no, buyer, stage, meta, updated_at
       FROM pipeline_items ORDER BY updated_at DESC`
    ),
    query<any>(
      `SELECT id, unit_no, loc, trade, description AS "desc", sev, contractor, status, reinspect
       FROM snag_items ORDER BY id`
    ),
    query<any>(
      `SELECT id, unit_no, buyer, oqood, dld, deed, issued, keys, oa
       FROM deeds ORDER BY id`
    ),
  ]);

  ok(res, {
    pipeline: pipeline.rows,
    snagging: snagging.rows,
    deeds: deeds.rows,
  });
});