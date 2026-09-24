# News & Highlights images

Drop images for news items and home highlights here, then reference them from
`data/highlights.json` (`image`) or `data/news.json` (`images[].src`). Cards
without an image render as text only.

Recommended: landscape JPG/PNG, ~1200×675 (16:9), optimized for web.

## Live LinkedIn post (embed)

To show an actual LinkedIn post on the static site, use LinkedIn's official
embed instead of a saved image:

1. On LinkedIn, open the post → the ⋯ menu → **Embed this post**.
2. Copy the URL inside the iframe `src`, e.g.
   `https://www.linkedin.com/embed/feed/update/urn:li:share:7300000000000000000`
3. Add it to that item in `data/news.json` as `"embedUrl": "...that URL..."`.

When `embedUrl` is set, the News tab renders the live post in an iframe and skips
the static image for that item.
