import { Router } from "express";
import { z } from "zod";
import { randomUUID, createHash } from "node:crypto";
import { tx, command, companyCheck, getRecord, fail } from "./db.ts";
import type { AuthRequest } from "./auth.ts";
const checksum = (b: Buffer) => createHash("sha256").update(b).digest("hex");
export function assetsRouter() {
  const router = Router({ mergeParams: true });
  router.post("/", async (req, res) => {
    const u = (req as unknown as AuthRequest).actor,
      company = String((req.params as Record<string, string>).companyId);
    const d = z
      .object({
        mime: z.enum([
          "audio/webm",
          "audio/webm;codecs=opus",
          "audio/ogg",
          "audio/ogg;codecs=opus",
          "audio/wav",
          "audio/mp4",
          "audio/mpeg",
        ]),
        size: z
          .number()
          .int()
          .min(1)
          .max(25 * 1024 * 1024),
        requestId: z.uuid().optional(),
      })
      .strict()
      .parse(req.body);
    res.status(201).json(
      await command(
        u,
        req.header("Idempotency-Key"),
        { path: req.originalUrl, data: d },
        async (db) => {
          await companyCheck(db, u, company);
          if (u.role === "participant") {
            if (!d.requestId)
              fail(422, "REQUEST_REQUIRED", "Choose your assigned request.");
            const r = await getRecord(db, company, d.requestId!);
            if (
              r.kind !== "request" ||
              r.data.personId !== u.person_id ||
              r.state !== "sent"
            )
              fail(
                403,
                "UPLOAD_FORBIDDEN",
                "This request cannot receive an upload.",
              );
          }
          const id = randomUUID();
          await db.query(
            "INSERT INTO assets(id,tenant_id,company_id,person_id,request_id,mime,size) VALUES($1,$2,$3,$4,$5,$6,$7)",
            [
              id,
              u.tenant_id,
              company,
              u.person_id,
              d.requestId || null,
              d.mime,
              d.size,
            ],
          );
          return { id, chunkSize: 512 * 1024, state: "uploading" };
        },
      ),
    );
  });
  async function asset(
    db: any,
    u: any,
    company: string,
    id: string,
    lock = false,
  ) {
    const companyRecord = await companyCheck(db, u, company);
    const a = (
      await db.query(
        "SELECT * FROM assets WHERE company_id=$1 AND id=$2" +
          (lock ? " FOR UPDATE" : ""),
        [company, id],
      )
    ).rows[0];
    if (!a || (u.role === "participant" && a.person_id !== u.person_id))
      fail(404, "NOT_FOUND", "Audio asset not found.");
    if (
      Date.now() - new Date(a.created_at).getTime() >
      companyRecord.settings.retentionDays * 86400000
    )
      fail(410, "ASSET_EXPIRED", "This audio reached its retention limit.");
    return a;
  }
  router.get("/:assetId/status", async (req, res) => {
    const u = (req as unknown as AuthRequest).actor;
    res.json(
      await tx(u.tenant_id, async (db) => {
        const a = await asset(
          db,
          u,
          String((req.params as Record<string, string>).companyId),
          String(req.params.assetId),
        );
        const chunks = (
          await db.query(
            "SELECT chunk_index,length(bytes) AS size FROM asset_chunks WHERE company_id=$1 AND asset_id=$2 ORDER BY chunk_index",
            [a.company_id, a.id],
          )
        ).rows;
        return {
          id: a.id,
          state: a.state,
          size: a.size,
          checksum: a.checksum,
          chunks,
        };
      }),
    );
  });
  router.put("/:assetId/chunks/:index", async (req, res) => {
    const u = (req as unknown as AuthRequest).actor,
      company = String((req.params as Record<string, string>).companyId),
      id = String(req.params.assetId),
      index = z.coerce.number().int().min(0).max(49).parse(req.params.index);
    const d = z
      .object({
        base64: z.string().max(710000),
        checksum: z.string().regex(/^[a-f0-9]{64}$/),
      })
      .strict()
      .parse(req.body);
    const bytes = Buffer.from(d.base64, "base64");
    if (
      bytes.length > 512 * 1024 ||
      !bytes.length ||
      checksum(bytes) !== d.checksum
    )
      fail(
        422,
        "CHECKSUM_MISMATCH",
        "The audio chunk failed verification. Retry this chunk.",
      );
    res.json(
      await tx(u.tenant_id, async (db) => {
        const a = await asset(db, u, company, id, true);
        if (a.state !== "uploading")
          fail(
            409,
            "ASSET_IMMUTABLE",
            "Completed audio cannot be overwritten.",
          );
        const old = (
          await db.query(
            "SELECT checksum FROM asset_chunks WHERE company_id=$1 AND asset_id=$2 AND chunk_index=$3",
            [company, id, index],
          )
        ).rows[0];
        if (old && old.checksum !== d.checksum)
          fail(
            409,
            "CHUNK_CONFLICT",
            "A different chunk already occupies this position.",
          );
        if ((index + 1) * 512 * 1024 - 512 * 1024 + bytes.length > a.size)
          fail(
            422,
            "SIZE_MISMATCH",
            "The chunk exceeds the declared audio size.",
          );
        await db.query(
          "INSERT INTO asset_chunks(tenant_id,company_id,asset_id,chunk_index,bytes,checksum) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING",
          [u.tenant_id, company, id, index, bytes, d.checksum],
        );
        return { index, acknowledged: bytes.length };
      }),
    );
  });
  router.post("/:assetId/finalize", async (req, res) => {
    const u = (req as unknown as AuthRequest).actor;
    const d = z
      .object({ checksum: z.string().regex(/^[a-f0-9]{64}$/) })
      .strict()
      .parse(req.body);
    res.json(
      await command(
        u,
        req.header("Idempotency-Key"),
        { path: req.originalUrl, data: d },
        async (db) => {
          const a = await asset(
            db,
            u,
            String((req.params as Record<string, string>).companyId),
            String(req.params.assetId),
            true,
          );
          const chunks = (
            await db.query(
              "SELECT * FROM asset_chunks WHERE company_id=$1 AND asset_id=$2 ORDER BY chunk_index",
              [a.company_id, a.id],
            )
          ).rows;
          if (chunks.some((c: any, i: number) => c.chunk_index !== i))
            fail(
              409,
              "INCOMPLETE_UPLOAD",
              "One or more audio chunks are missing.",
            );
          const bytes = Buffer.concat(chunks.map((c: any) => c.bytes));
          if (bytes.length !== a.size || checksum(bytes) !== d.checksum)
            fail(
              409,
              "INCOMPLETE_UPLOAD",
              "Audio size or checksum does not match. Resume the upload.",
            );
          await db.query(
            "UPDATE assets SET checksum=$1,state='stored_unscanned' WHERE company_id=$2 AND id=$3",
            [d.checksum, a.company_id, a.id],
          );
          return {
            id: a.id,
            state: "stored_unscanned",
            checksum: d.checksum,
            processing:
              "No transcription or malware scanner configured; local audio playback only.",
          };
        },
      ),
    );
  });
  router.get("/:assetId/content", async (req, res) => {
    const u = (req as unknown as AuthRequest).actor;
    const result = await tx(u.tenant_id, async (db) => {
      const a = await asset(
        db,
        u,
        String((req.params as Record<string, string>).companyId),
        String(req.params.assetId),
      );
      if (a.state !== "stored_unscanned")
        fail(
          409,
          "ASSET_UNAVAILABLE",
          "This asset is incomplete or has expired.",
        );
      const chunks = (
        await db.query(
          "SELECT bytes FROM asset_chunks WHERE company_id=$1 AND asset_id=$2 ORDER BY chunk_index",
          [a.company_id, a.id],
        )
      ).rows;
      return { a, bytes: Buffer.concat(chunks.map((c) => c.bytes)) };
    });
    res.setHeader("Content-Type", result.a.mime);
    res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
    res.send(result.bytes);
  });
  return router;
}
