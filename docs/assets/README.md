# Archived source assets

Not shipped. Anything in `public/` is copied verbatim into `dist/`, so masters and
alternates live here instead.

- `favicon_all.ico`: the original six-frame icon (16, 32, 48, 64, 128, 256), 361 KiB.
  The shipped `public/favicon.ico` is the slim 16/32/48 build at 14.7 KiB. The two
  large frames were 91% of the original file and are served better by
  `favicon.svg` and the PWA icons. Regenerate the slim file from this master if the
  logo changes.
