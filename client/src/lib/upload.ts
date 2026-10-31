/**
 * Client-side file upload helpers.
 *
 * Usage:
 *   import { uploadFile, deleteFile } from "@/lib/upload";
 *
 *   const { url, fileKey } = await uploadFile(file);
 *   await deleteFile(fileKey);
 */

export async function uploadFile(
  file: File
): Promise<{ url: string; fileKey: string }> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(body.error || "Upload failed");
  }
  return res.json();
}

export async function deleteFile(fileKey: string): Promise<void> {
  const res = await fetch("/api/upload", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileKey }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Delete failed" }));
    throw new Error(body.error || "Delete failed");
  }
}
