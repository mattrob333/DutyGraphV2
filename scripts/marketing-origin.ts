// Keep every static publisher on the same public hostname, including local builds.
export const marketingOrigin = new URL(
  process.env.MARKETING_ORIGIN || "https://dutygraph.com",
).origin;
if (!marketingOrigin.startsWith("https://")) {
  throw new Error("MARKETING_ORIGIN must be an HTTPS public origin");
}
