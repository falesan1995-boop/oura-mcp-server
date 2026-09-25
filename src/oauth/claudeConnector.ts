import { Router, Request, Response } from 'express';

const router = Router();

function baseUrl(req: Request): string {
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }
  return `${req.protocol}://${req.get('host')}`;
}

// Claude discovers how to authenticate with this server
router.get('/.well-known/oauth-authorization-server', (req: Request, res: Response) => {
  const base = baseUrl(req);
  res.json({
    issuer: base,
    authorization_endpoint: `${base}/oauth/claude/authorize`,
    token_endpoint: `${base}/oauth/claude/token`,
    registration_endpoint: `${base}/oauth/claude/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
  });
});

// Claude registers itself automatically (Dynamic Client Registration)
router.post('/oauth/claude/register', (req: Request, res: Response) => {
  res.status(201).json({
    client_id: 'claude-ai',
    client_id_issued_at: Math.floor(Date.now() / 1000),
    redirect_uris: req.body?.redirect_uris || [],
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code'],
    response_types: ['code'],
  });
});

// Single-user server: auto-approve instead of showing a consent screen
router.get('/oauth/claude/authorize', (req: Request, res: Response): void => {
  const { redirect_uri, state } = req.query;

  if (!redirect_uri || typeof redirect_uri !== 'string') {
    res.status(400).send('Missing redirect_uri');
    return;
  }

  const url = new URL(redirect_uri);
  url.searchParams.set('code', 'claude-connect');
  if (state) url.searchParams.set('state', state as string);

  res.redirect(url.toString());
});

// Exchange the code for the server's existing AUTH_TOKEN
router.post('/oauth/claude/token', (_req: Request, res: Response) => {
  res.json({
    access_token: process.env.AUTH_TOKEN,
    token_type: 'Bearer',
    expires_in: 31536000,
  });
});

export default router;
