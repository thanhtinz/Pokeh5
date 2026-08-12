# Asset sources

The game ships no images. Everything visual — panels, diamond frames, the
trigram ring, the paper grain, the ridge silhouette — is drawn in CSS and
inline SVG, so it re-tints from `src/styles/tokens.css` and stays sharp at any
device pixel ratio.

The only external assets are three webfonts, fetched and subset by
`npm run fonts`. They are not committed; `public/fonts/` is git-ignored.

| Font | Used for | Licence |
| --- | --- | --- |
| [Noto Serif](https://github.com/google/fonts/tree/main/ofl/notoserif) | Headings, realm names, buttons | SIL Open Font License 1.1 |
| [Be Vietnam Pro](https://github.com/google/fonts/tree/main/ofl/bevietnampro) | Body text and numbers | SIL Open Font License 1.1 |
| [Ma Shan Zheng](https://github.com/google/fonts/tree/main/ofl/mashanzheng) | Calligraphic Han ornament | SIL Open Font License 1.1 |

All three are OFL, which permits bundling and redistribution in an application.

## Subsetting

This matters more than usual. A full CJK face is 5–25 MB, which cannot ship in
a mobile app, and even the Latin faces carry scripts the game never renders.

`scripts/fetch-fonts.mjs` cuts each one down:

- **Noto Serif** and **Be Vietnam Pro** keep Latin plus the full Vietnamese
  precomposed range, and nothing else. Noto Serif is variable, so its width
  axis is pinned to normal first and only the weight axis survives.
- **Ma Shan Zheng** is subset to an explicit list of about forty characters —
  the five phases, the realm names, the trigram words and the rank numerals.
  Every glyph in that list is drawn on screen; none of it is speculative,
  because each one costs bytes.

The result:

```
NotoSerif-subset.woff2                1843 KB ->  83.2 KB
BeVietnamPro-Regular-subset.woff2      130 KB ->  16.1 KB
BeVietnamPro-Bold-subset.woff2         137 KB ->  17.4 KB
MaShanZheng-subset.woff2              5721 KB ->  12.5 KB
total                                  7.6 MB -> 129.2 KB
```

Adding a new Han character to the interface means adding it to `HAN_ORNAMENT`
in the fetch script and re-running `npm run fonts`, or it will silently fall
back to the system serif.

## Copyright

The genre vocabulary (tu tiên, cảnh giới, ngũ hành) is common to the whole
xianxia tradition and is not owned by anyone. The screens are laid out in the
idiom that idle cultivation games share, but no art, text or data from any
existing game is copied into this project.
