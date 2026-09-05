/** Explicit deployment allowlist. Never derive trust from a request Host header. */
export function allowedOrigins(
  env: NodeJS.ProcessEnv = process.env,
): Set<string> {
  const values = [
    env.APP_ORIGIN,
    ...(env.ADDITIONAL_APP_ORIGINS || "").split(","),
  ];
  return new Set(
    values.flatMap((value) => {
      if (!value?.trim()) return [];
      try {
        const url = new URL(value.trim());
        if (
          !["http:", "https:"].includes(url.protocol) ||
          url.username ||
          url.password ||
          url.pathname !== "/" ||
          url.search ||
          url.hash
        )
          return [];
        return [url.origin];
      } catch {
        return [];
      }
    }),
  );
}
