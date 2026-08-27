# ads.txt_builder

An internal tool for tracking versions of ads.txt content for owned & operated
domains and partner inventory. See the spec in
[issue #3](https://github.com/LiDevin/ads.txt_builder/issues/3) for full
background.

Everything lives in this repository: the app is a static site hosted on
GitHub Pages, and GitHub itself (via commits to `data/`) is the storage and
version history — no separate server or database.

## Development

```sh
npm install
npm run dev        # local dev server
npm run typecheck
npm test
npm run build       # outputs to dist/
```

## Deployment

`.github/workflows/deploy.yml` builds and deploys `dist/` to GitHub Pages on
every push to `main`. One manual, one-time setup step is required: in this
repo's **Settings → Pages**, set **Source** to **GitHub Actions**.
