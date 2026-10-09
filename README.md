# Batch Image Resizer

An [Obsidian](https://obsidian.md) plugin that sets every image in the **current note** to one display size — or clears all sizes at once. Bilingual UI (English / 简体中文), and it protects the images you resized by hand.

Only the Obsidian size syntax is rewritten — your image files are never touched:

| Before | After |
| --- | --- |
| `![[photo.png]]` | `![[photo.png\|500]]` |
| `![[photo.png\|300]]` | `![[photo.png\|500]]` |
| `![[photo.png\|300x200]]` | `![[photo.png\|500]]` |

## Three ways to use it

1. **Click the image icon in the left ribbon** — the fastest one. Opens the size dialog; the dialog also has a "Clear sizes" button in its lower-left corner.
2. **Command palette** (`Ctrl/Cmd + P`)
   - Set size for all images in current note
   - Clear size for all images in current note
3. **Editor context menu** — the same two actions (editing mode only).

Type `500` (width) or `500x300` (width x height) and press Enter to rewrite the whole note. The dialog also offers `300 / 500 / 800 / 1000` presets, a "skip manually resized images" toggle (see below), and the "Clear sizes" button.

**Works in reading mode too** — the commands don't need an editor. In editing mode the editor buffer is changed (so `Ctrl/Cmd + Z` works); in reading mode the file is rewritten through the vault API and the view refreshes itself.

## Language

Settings → Batch Image Resizer → **Interface language**:

- **Follow Obsidian** (default)
- **简体中文**
- **English**

Takes effect immediately, including the ribbon tooltip and the command names.

## Protecting manually resized images

You probably don't want to overwrite the images you **resized by hand** by dragging their edges. The plugin looks at the **last digit** of the size:

- Sizes written by this plugin are multiples of 10 (`300 / 500 / 800 / 1000`)
- Sizes produced by dragging usually are not (`437`, `512`, …)

So **a size whose last digit is not 0 counts as hand adjusted**. With `500x37`, one odd component is enough.

The **skip manually resized images** toggle in the dialog decides whether this round skips them:

| Before | After |
| --- | --- |
| `![[photo.png\|437]]` | left untouched |
| `![[photo.png\|500]]` | `![[photo.png\|800]]` |
| `![[photo.png]]` | `![[photo.png\|800]]` |

Things to know:

- About **10% of hand-made sizes happen to be a multiple of 10**; those cannot be protected. The opposite mistake basically never happens.
- **Clearing sizes ignores this toggle** on purpose — clearing means clearing.
- Don't set **Default size** to a non-multiple of 10 (e.g. `456`), or the sizes this plugin writes will look manual too.

## Other settings

- **Default size** — pre-filled in the dialog, default `500`.
- **Protect manually resized images** — on by default. Turn it off and the dialog stops showing the toggle; every image gets overwritten.
- **Checkbox default** — `Always checked` (default) / `Always unchecked` / `Remember last choice`.
- **Also resize Markdown images** — off by default. Also rewrites `![alt](image.png)` as `![alt|500](image.png)`.
- **Skip external images** — on by default. Images pointing to `http(s)://` or `data:` are left alone.

## Behaviour details

- Only the currently open note is touched; folders are not scanned.
- Fenced code blocks (``` / ~~~), `%%comments%%` and inline code spans are skipped.
- Only known image extensions are matched (png/jpg/jpeg/gif/bmp/svg/webp/avif/apng/ico/tif/tiff/jfif), so embeds like `![[some note]]` are never rewritten.
- Whatever follows `|` in an image embed *is* the size in Obsidian, so an existing value there is replaced.
- In editing mode the editor API is used, so the change can be undone with `Ctrl/Cmd + Z`.

## Install manually

1. Build:

   ```bash
   npm install
   npm run build
   ```

2. Create `<vault>/.obsidian/plugins/batch-image-resizer/` and copy `main.js`, `manifest.json` and `styles.css` into it.
3. Settings → Community plugins → turn off Restricted mode → enable **Batch Image Resizer**.

## Development

```bash
npm run dev     # esbuild watch
npm run build   # type check + production build
```

All user-facing strings live in `i18n.ts`: add a field to the `Messages` interface and to both `STRINGS.en` and `STRINGS.zh`.

## License

[MIT](LICENSE)

---

[中文说明](README.zh.md)
