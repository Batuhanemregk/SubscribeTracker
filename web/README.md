# Finify — static legal/support site

Self-contained HTML for the public pages that App Store Connect (and Google Play) require:

| File          | Should be served at | Used for                                  |
| ------------- | ------------------- | ----------------------------------------- |
| `index.html`  | `/`                 | Landing page                              |
| `privacy.html`| `/privacy`          | **ASC App Information → Privacy Policy URL** |
| `terms.html`  | `/terms`            | Terms of Service (EULA)                   |
| `support.html`| `/support`          | **ASC App Information → Support URL**      |

All pages are static, dependency-free, dark-themed, and mobile-responsive. Content mirrors the in-app
`PrivacyPolicyScreen` / `TermsOfServiceScreen` and uses the current "Premium" branding.

## Deploy to finify.app

Drop these files on whatever hosts `finify.app`. The internal links use clean paths (`/privacy`, `/terms`,
`/support`), so enable "clean URLs" / extensionless routing:

- **Vercel:** add `{ "cleanUrls": true }` to `vercel.json`, or rename files to folder form (`privacy/index.html`).
- **Netlify:** clean URLs work by default (`/privacy` resolves to `privacy.html`).
- **GitHub Pages / S3 / nginx:** either enable extensionless rewrites, or use the ASC URLs with the explicit
  `.html` (e.g. `https://finify.app/privacy.html`) — Apple accepts the `.html` form too.

After deploying, verify each URL loads real content (not a blank SPA shell) before submitting to App Review.
