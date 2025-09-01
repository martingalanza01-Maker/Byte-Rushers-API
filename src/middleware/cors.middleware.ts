import {Middleware} from '@loopback/rest';

export const corsMiddleware: Middleware = async (ctx, next) => {
  const res = ctx.response;
  const req = ctx.request;
  const origin = process.env.UI_ORIGIN ?? 'http://localhost:3000';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(204).send();
    return;
  }
  return next();
};
