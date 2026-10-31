/**
 * File storage backed by Cloudflare R2 (S3-compatible).
 *
 * Storage is auto-configured via STORAGE_* environment variables injected
 * at project init. Falls back to local public/uploads/ when R2 is not
 * configured (e.g. running locally without credentials).
 *
 * For AI-generated assets (images, audio, video), use the Easy-Peasy.AI API
 * directly — it returns public URLs that can be used immediately.
 *
 * Usage:
 *   import { uploadFile, deleteFile, getFileUrl } from "./storage";
 *
 *   const { url, fileKey } = await uploadFile(buffer, "photo.jpg", {
 *     contentType: "image/jpeg",
 *   });
 *
 *   await deleteFile(fileKey);
 *
 *   const signedUrl = await getFileUrl(fileKey, 3600);
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import path from "path";

// ---------------------------------------------------------------------------
// R2 client (lazy-initialised)
// ---------------------------------------------------------------------------

let _s3: S3Client | null = null;

function getS3(): S3Client {
  if (!_s3) {
    const endpoint = process.env.STORAGE_ENDPOINT;
    const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID;
    const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY;

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "Storage not configured. STORAGE_ENDPOINT, STORAGE_ACCESS_KEY_ID and STORAGE_SECRET_ACCESS_KEY are required."
      );
    }

    _s3 = new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return _s3;
}

const BUCKET = () => process.env.STORAGE_BUCKET || "sandbox-storage";
const KEY_PREFIX = () => process.env.STORAGE_KEY_PREFIX || "";
const PUBLIC_URL = () => process.env.STORAGE_PUBLIC_URL || "";

// ---------------------------------------------------------------------------
// Fallback: local storage (when R2 is not configured)
// ---------------------------------------------------------------------------

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

function isR2Configured(): boolean {
  return !!(
    process.env.STORAGE_ENDPOINT &&
    process.env.STORAGE_ACCESS_KEY_ID &&
    process.env.STORAGE_SECRET_ACCESS_KEY
  );
}

/**
 * Ensure a file key belongs to this project's prefix to prevent cross-project access.
 */
function assertKeyBelongsToProject(fileKey: string): void {
  const prefix = KEY_PREFIX();
  if (prefix && !fileKey.startsWith(prefix + "/")) {
    throw new Error("Access denied: file does not belong to this project");
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Upload a file to storage.
 * Uses R2 when configured, falls back to local disk.
 *
 * @returns `url`     – publicly accessible URL (CDN or local path)
 * @returns `fileKey` – storage key for later deletion / signed-URL generation
 */
export async function uploadFile(
  data: Buffer | Uint8Array,
  originalName: string,
  options?: { contentType?: string }
): Promise<{ url: string; fileKey: string }> {
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "-");
  const fileName = `${randomUUID()}-${safeName}`;

  if (!isR2Configured()) {
    await mkdir(UPLOADS_DIR, { recursive: true });
    await writeFile(path.join(UPLOADS_DIR, fileName), data);
    return { url: `/uploads/${fileName}`, fileKey: fileName };
  }

  const prefix = KEY_PREFIX();
  const fileKey = prefix ? `${prefix}/${fileName}` : fileName;

  await getS3().send(
    new PutObjectCommand({
      Bucket: BUCKET(),
      Key: fileKey,
      Body: data,
      ContentType: options?.contentType || "application/octet-stream",
    })
  );

  const url = `${PUBLIC_URL()}/${fileKey}`;
  return { url, fileKey };
}

/**
 * Delete a file from storage.
 */
export async function deleteFile(fileKey: string): Promise<void> {
  if (!isR2Configured()) {
    await unlink(path.join(UPLOADS_DIR, path.basename(fileKey))).catch(
      () => {}
    );
    return;
  }

  assertKeyBelongsToProject(fileKey);

  await getS3().send(
    new DeleteObjectCommand({ Bucket: BUCKET(), Key: fileKey })
  );
}

/**
 * Get a URL for a stored file.
 *
 * - R2 configured: returns a time-limited presigned URL (default 1 hour)
 * - Local fallback: returns the local path
 */
export async function getFileUrl(
  fileKey: string,
  expiresInSeconds = 3600
): Promise<string> {
  if (!isR2Configured()) {
    return `/uploads/${path.basename(fileKey)}`;
  }

  assertKeyBelongsToProject(fileKey);

  return getSignedUrl(
    getS3(),
    new GetObjectCommand({ Bucket: BUCKET(), Key: fileKey }),
    { expiresIn: expiresInSeconds }
  );
}

// ---------------------------------------------------------------------------
// Backward-compatible aliases
// ---------------------------------------------------------------------------

/**
 * @deprecated Use `uploadFile()` instead.
 */
export async function saveUploadedFile(
  data: Buffer | Uint8Array,
  originalName: string
): Promise<{ path: string; url: string }> {
  const result = await uploadFile(data, originalName);
  return { path: result.fileKey, url: result.url };
}

/**
 * @deprecated Read files via their public URL instead.
 */
export async function readUploadedFile(fileName: string): Promise<Buffer> {
  if (!isR2Configured()) {
    const safeName = path.basename(fileName);
    const filePath = path.join(UPLOADS_DIR, safeName);
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(UPLOADS_DIR))) {
      throw new Error("Invalid file path");
    }
    return readFile(resolved);
  }

  assertKeyBelongsToProject(fileName);

  const url = `${PUBLIC_URL()}/${fileName}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch file: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
