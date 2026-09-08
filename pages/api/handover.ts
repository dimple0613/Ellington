import type { NextApiRequest, NextApiResponse } from "next";
import { withPerm } from "../../lib/permissions";
import { query } from "../../lib/db";
import { ok } from "../../lib/api";

export default withPerm("Handover", "REA", async function (_req: NextApiRequest, res: NextApiResponse) {
  const [pipeline, snagging, deeds] = await Promise.all([
    query<{
      unit_no: string;
      buyer: string;
      stage: string;
      meta: unknown;
      updated_at: string | Date;
    }>(
      `SELECT unit_no, buyer, stage, meta, updated_at
       FROM pipeline_items ORDER BY updated_at DESC`
    ),
    query<{
      id: number;
      unit_no: string;
      loc: string;
      trade: string;
      desc: string;
      sev: string;
      contractor: string;
      status: string;
      reinspect: boolean | null;
    }>(
      `SELECT id, unit_no, loc, trade, description AS "desc", sev, contractor, status, reinspect
       FROM snag_items ORDER BY id`
    ),
    query<{
      id: number;
      unit_no: string;
      buyer: string;
      oqood: string;
      dld: string;
      deed: string;
      issued: string;
      keys: boolean | null;
      oa: boolean | null;
    }>(
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