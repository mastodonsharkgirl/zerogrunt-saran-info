# Missing-route behavior

`src/pages/404.astro` emits a top-level `dist/404.html`. Cloudflare Pages uses
that file for missing routes; without it, the host assumes a single-page
application and serves the homepage for unknown paths. See the
[Pages serving documentation](https://developers.cloudflare.com/pages/configuration/serving-pages/).

The error page has `noindex`, no canonical or Open Graph URL, and native links
to `/` and `/#lab`. It does not echo the requested path or query, use JavaScript,
or add animation. Its local styles retain the existing Inter and green/lime
identity without changing the homepage stylesheet entry.

The browser regression checks the built artifact first, then checks missing-route
status, metadata and navigation with JavaScript disabled. The homepage remains
the sitemap's only URL. Production acceptance requires a separate ordinary
missing-route GET after publication; local preview status alone does not prove
the Pages fallback has changed.
