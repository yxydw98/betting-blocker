/* Rasterize icons/logo.svg to the PNG sizes Chrome needs.
 *
 * Requires `sharp` (libvips). Run from the repo root, e.g.:
 *   npm i sharp && node tools/make_icons.cjs
 * (or with NODE_PATH pointed at a dir where sharp is installed).
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const svg = fs.readFileSync(path.join(ROOT, "icons", "logo.svg"));
const sizes = [16, 32, 48, 128, 512]; // 512 = store/marketing

(async () => {
  for (const s of sizes) {
    const out = path.join(ROOT, "icons", `icon${s}.png`);
    await sharp(svg, { density: 1024 })
      .resize(s, s, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(out);
    console.log("wrote", path.relative(ROOT, out));
  }
})();
