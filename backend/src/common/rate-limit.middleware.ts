import { Request, Response, NextFunction } from "express";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

const rules = [
  {
    name: "login",
    method: "POST",
    pattern: /^\/auth\/login$/,
    limit: 8,
    windowMs: 60 * 1000,
  },
  {
    name: "create-pre-reservation",
    method: "POST",
    pattern: /^\/pre-reservations$/,
    limit: 30,
    windowMs: 60 * 60 * 1000,
  },
  {
    name: "payment-link",
    method: "POST",
    pattern: /^\/payments\/wompi\/pre-reservations\/[^/]+\/link$/,
    limit: 12,
    windowMs: 60 * 1000,
  },
  {
    name: "webhooks",
    method: "POST",
    pattern: /^\/payments\/(webhook|wompi\/webhook)$/,
    limit: 180,
    windowMs: 60 * 1000,
  },
];

function clientKey(req: Request) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = Array.isArray(forwarded)
    ? forwarded[0]
    : forwarded?.split(",")[0];

  return ip?.trim() || req.ip || req.socket.remoteAddress || "unknown";
}

export function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const path = req.path || req.url.split("?")[0];
  const rule = rules.find(
    (item) => item.method === req.method && item.pattern.test(path)
  );

  if (!rule) {
    next();
    return;
  }

  const now = Date.now();
  const key = `${rule.name}:${clientKey(req)}`;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + rule.windowMs,
    });
    next();
    return;
  }

  bucket.count += 1;

  if (bucket.count > rule.limit) {
    res.status(429).json({
      statusCode: 429,
      message: "Demasiadas solicitudes. Intenta de nuevo mas tarde.",
    });
    return;
  }

  next();
}

