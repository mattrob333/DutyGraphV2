import type { RequestHandler } from "express";

// Mirror the hosted root redirect. Query-based demos still use the app shell.
export const publicEntry: RequestHandler = (req, res, next) => {
  const url = new URL(req.originalUrl, "http://local.invalid");
  if (
    url.pathname === "/" &&
    ["GET", "HEAD"].includes(req.method) &&
    !["demo", "sample", "view"].some((key) => url.searchParams.has(key))
  ) {
    res.redirect(308, `/landing/${url.search}`);
    return;
  }
  next();
};
