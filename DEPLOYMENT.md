#  - Production Deployment

Target URL:
https://Westagate3Dv31.com/

## Build
npm ci
npm run build

Deploy the CONTENTS of `dist/` to:
`/var/www/webzaaclients//`

The Vite base is configured as:
`//`

All public image/video/font references use `import.meta.env.BASE_URL` so they resolve correctly under the subfolder.

## Apache
The build output contains `.htaccess` copied from `public/.htaccess`.

Verify:
- //
- //images/logo.png
- //images/favicon.png
- //video/westgate-desktop.mp4
- //video/westgate-mobile.mp4
- //video/westgate-mobile-low.mp4

The Vite `/api` proxy is development-only. Configure the production API separately if the lead form requires a backend endpoint.
