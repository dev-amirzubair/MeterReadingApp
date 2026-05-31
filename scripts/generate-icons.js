#!/usr/bin/env node
/* eslint-env node */
/**
 * Generates Android mipmap densities and iOS AppIcon.appiconset entries from
 * a single 1024x1024 source PNG.
 *
 * Usage:  node scripts/generate-icons.js [path/to/source.png]
 * Default source: assets/icon.png
 *
 * Re-run any time you swap the source icon. Safe to commit the outputs.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SOURCE = process.argv[2] || path.join('assets', 'icon.png');
const ROOT = process.cwd();

const ANDROID_RES = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');
const IOS_APPICON = path.join(
  ROOT,
  'ios',
  'MeterReading',
  'Images.xcassets',
  'AppIcon.appiconset',
);

const ANDROID_DENSITIES = [
  { dir: 'mipmap-mdpi', size: 48 },
  { dir: 'mipmap-hdpi', size: 72 },
  { dir: 'mipmap-xhdpi', size: 96 },
  { dir: 'mipmap-xxhdpi', size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

// Apple's stock iPhone+iPad+marketing icon set.
const IOS_ICONS = [
  { name: 'icon-20@2x.png', size: 40 },
  { name: 'icon-20@3x.png', size: 60 },
  { name: 'icon-29@2x.png', size: 58 },
  { name: 'icon-29@3x.png', size: 87 },
  { name: 'icon-40@2x.png', size: 80 },
  { name: 'icon-40@3x.png', size: 120 },
  { name: 'icon-60@2x.png', size: 120 },
  { name: 'icon-60@3x.png', size: 180 },
  { name: 'icon-76.png', size: 76 },
  { name: 'icon-76@2x.png', size: 152 },
  { name: 'icon-83.5@2x.png', size: 167 },
  { name: 'icon-1024.png', size: 1024 },
];

const IOS_CONTENTS_JSON = {
  images: [
    { size: '20x20', idiom: 'iphone', filename: 'icon-20@2x.png', scale: '2x' },
    { size: '20x20', idiom: 'iphone', filename: 'icon-20@3x.png', scale: '3x' },
    { size: '29x29', idiom: 'iphone', filename: 'icon-29@2x.png', scale: '2x' },
    { size: '29x29', idiom: 'iphone', filename: 'icon-29@3x.png', scale: '3x' },
    { size: '40x40', idiom: 'iphone', filename: 'icon-40@2x.png', scale: '2x' },
    { size: '40x40', idiom: 'iphone', filename: 'icon-40@3x.png', scale: '3x' },
    { size: '60x60', idiom: 'iphone', filename: 'icon-60@2x.png', scale: '2x' },
    { size: '60x60', idiom: 'iphone', filename: 'icon-60@3x.png', scale: '3x' },
    { size: '20x20', idiom: 'ipad', filename: 'icon-20@2x.png', scale: '2x' },
    { size: '29x29', idiom: 'ipad', filename: 'icon-29@2x.png', scale: '2x' },
    { size: '40x40', idiom: 'ipad', filename: 'icon-40@2x.png', scale: '2x' },
    { size: '76x76', idiom: 'ipad', filename: 'icon-76.png', scale: '1x' },
    { size: '76x76', idiom: 'ipad', filename: 'icon-76@2x.png', scale: '2x' },
    {
      size: '83.5x83.5',
      idiom: 'ipad',
      filename: 'icon-83.5@2x.png',
      scale: '2x',
    },
    {
      size: '1024x1024',
      idiom: 'ios-marketing',
      filename: 'icon-1024.png',
      scale: '1x',
    },
  ],
  info: { version: 1, author: 'xcode' },
};

async function squareResize(src, size, outPath) {
  await sharp(src)
    // Flatten transparency onto white so iOS marketing icons (which forbid
    // alpha) and Android pre-adaptive launchers render cleanly.
    .flatten({ background: '#ffffff' })
    .resize(size, size, { fit: 'cover' })
    .png()
    .toFile(outPath);
}

async function makeRoundIcon(src, size, outPath) {
  // SVG mask that mirrors the size, painted as a centered circle.
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="black"/><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`,
  );
  await sharp(src)
    .flatten({ background: '#ffffff' })
    .resize(size, size, { fit: 'cover' })
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toFile(outPath);
}

async function ensureDir(p) {
  await fs.promises.mkdir(p, { recursive: true });
}

async function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`Source icon not found: ${SOURCE}`);
    process.exit(1);
  }
  console.log(`Generating icons from: ${SOURCE}`);

  // Android mipmaps
  for (const { dir, size } of ANDROID_DENSITIES) {
    const out = path.join(ANDROID_RES, dir);
    await ensureDir(out);
    await squareResize(SOURCE, size, path.join(out, 'ic_launcher.png'));
    await makeRoundIcon(SOURCE, size, path.join(out, 'ic_launcher_round.png'));
    console.log(`  android/${dir}: ${size}x${size}`);
  }

  // iOS AppIcon set
  if (fs.existsSync(path.dirname(IOS_APPICON))) {
    await ensureDir(IOS_APPICON);
    for (const { name, size } of IOS_ICONS) {
      await squareResize(SOURCE, size, path.join(IOS_APPICON, name));
    }
    await fs.promises.writeFile(
      path.join(IOS_APPICON, 'Contents.json'),
      JSON.stringify(IOS_CONTENTS_JSON, null, 2) + '\n',
      'utf8',
    );
    console.log(`  ios/AppIcon.appiconset: 15 sizes + Contents.json`);
  } else {
    console.log('  ios/MeterReading/Images.xcassets not found — skipping iOS');
  }

  console.log('Done.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
