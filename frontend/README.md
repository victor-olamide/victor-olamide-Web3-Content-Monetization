# Frontend - Stacks Content Monetization

This is the Next.js frontend for the Stacks Content Monetization platform, deployed on Vercel.

## Deployment

Deployed on Vercel with production environment variables configured.

### Environment Variables

- `NEXT_PUBLIC_API_URL`: https://api.web3monetization.com
- `NEXT_PUBLIC_STACKS_NETWORK`: mainnet
- `NEXT_PUBLIC_ANALYTICS_ID`: GA_MEASUREMENT_ID

### Custom Domain

Configured via Vercel dashboard with automatic HTTPS.

## Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm run start
```

## Deploy

```bash
npm run deploy
```

## Verification

After deployment, verify all pages load correctly:
- Home page
- Dashboard
- Auth pages
- Content pages