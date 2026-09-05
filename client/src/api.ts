let csrf = "";
export function setCsrf(value: string) {
  csrf = value;
}
export async function api<T = any>(
  path: string,
  method = "GET",
  body?: unknown,
  key?: string,
): Promise<T> {
  const response = await fetch("/api" + path, {
    method,
    credentials: "same-origin",
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(!["GET", "HEAD"].includes(method)
        ? {
            "X-CSRF-Token": csrf,
            "Idempotency-Key": key || crypto.randomUUID(),
          }
        : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(
      result.message +
        (result.fieldErrors?.length
          ? " " +
            result.fieldErrors
              .map((e: any) => `${e.path}: ${e.message}`)
              .join(" ")
          : ""),
    );
    Object.assign(error, { status: response.status, code: result.code });
    throw error;
  }
  return result;
}
export async function downloadExport(company: string, id: string) {
  const r = await fetch(`/api/v1/companies/${company}/exports/${id}/download`);
  if (!r.ok) {
    const d = await r.json();
    throw new Error(d.message);
  }
  const url = URL.createObjectURL(await r.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = "DutyGraph-" + id.slice(0, 8) + ".zip";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
