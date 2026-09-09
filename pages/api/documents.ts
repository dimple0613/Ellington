import type { NextApiRequest, NextApiResponse } from "next";
import { withPerm } from "../../lib/permissions";
import { query } from "../../lib/db";
import { ok, fail, methodNotAllowed, missingFields } from "../../lib/api";

const num = (v: unknown) => Number(v ?? 0);

export default withPerm("Sales", "REA", async function (req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") return listDocuments(req, res);
    if (req.method === "POST") return generateDocument(req, res);
    if (req.method === "PUT") return activateTemplate(req, res);
    return methodNotAllowed(res);
  } catch (e: any) {
    return fail(res, e.message, 400);
  }
});

async function listDocuments(_: NextApiRequest, res: NextApiResponse) {
  const docs = await query<any>(
    `SELECT id, doc_type, unit_no, buyer, ref, status, generated_at
     FROM documents ORDER BY generated_at DESC, id DESC LIMIT 20`
  );
  const templates = await query<any>(
    `SELECT doc_type, version, status, changed_at
     FROM document_templates ORDER BY doc_type, version`
  );
  return ok(res, {
    docs: docs.rows.map((d) => ({
      id: d.id,
      ref: d.ref,
      type: d.doc_type,
      unit_no: d.unit_no,
      buyer: d.buyer,
      status: d.status,
      when: d.generated_at,
    })),
    templates: templates.rows.map((t) => ({
      doc_type: t.doc_type,
      version: t.version,
      status: t.status,
      changed_at: t.changed_at,
    })),
  });
}

async function generateDocument(req: NextApiRequest, res: NextApiResponse) {
  const body = req.body || {};
  const { doc_type: docType, unit_no: unitNo, buyer, ref, media, status } = body;
  const missing = missingFields(body, ["doc_type", "ref"]);
  if (missing) return fail(res, missing);

  const dup = await query<any>(`SELECT 1 FROM documents WHERE ref = $1`, [ref]);
  if (dup.rows.length > 0) {
    return fail(res, "A document with that reference already exists");
  }

  const ins = await query<any>(
    `INSERT INTO documents (doc_type, unit_no, buyer, ref, media, status)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, ref`,
    [docType, unitNo || null, buyer || null, ref, media ? JSON.stringify(media) : null, status || "generated"]
  );
  return ok(res, { id: num(ins.rows[0].id), ref: ins.rows[0].ref, status: status || "generated" }, 201);
}

async function activateTemplate(req: NextApiRequest, res: NextApiResponse) {
  const docType = (req.query.doc_type as string) || "";
  const action = (req.query.action as string) || "";
  if (!docType || action !== "activate") {
    return fail(res, "doc_type and action=activate are required");
  }

  const current = await query<any>(
    `SELECT version FROM document_templates WHERE doc_type = $1 AND status = 'live'`,
    [docType]
  );
  const next = "v" + (parseInt((current.rows[0]?.version || "v3").replace(/^v/, ""), 10) + 1);

  await query(`UPDATE document_templates SET status = 'archived' WHERE doc_type = $1 AND status = 'live'`, [docType]);
  await query(
    `INSERT INTO document_templates (doc_type, version, status, changed_at)
     VALUES ($1, $2, 'live', now())
     ON CONFLICT (doc_type, version) DO UPDATE SET status = 'live', changed_at = now()`,
    [docType, next]
  );

  const list = await query<any>(
    `SELECT doc_type, version, status, changed_at
     FROM document_templates WHERE doc_type = $1 ORDER BY version DESC`,
    [docType]
  );
  return ok(res, {
    version: next,
    templates: list.rows.map((t) => ({ doc_type: t.doc_type, version: t.version, status: t.status, changed_at: t.changed_at })),
  });
}