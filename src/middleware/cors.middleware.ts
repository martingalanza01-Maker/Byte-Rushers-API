// src/middleware/cors.middleware.ts
import {Middleware} from '@loopback/rest';

export const corsMiddleware: Middleware = async (ctx, next) => {
  const req = ctx.request;
  const res = ctx.response;

  const list = (process.env.UI_ORIGIN ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const origin = req.headers.origin ?? '';
  const allowed =
    origin && list.some(o => o === origin || (o === '*' && origin)) // support wildcard in dev if you want
      ? origin
      : ''; // not allowed → don’t set ACAO

  if (allowed) {
    res.header('Access-Control-Allow-Origin', allowed);
    res.header('Vary', 'Origin'); // inform caches
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send();
    return;
  }
  return next();
};
