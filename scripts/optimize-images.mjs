import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { copyFile } from 'node:fs/promises'
import sharp from 'sharp'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = path.join(projectRoot, 'src', 'assets', 'source-images')
const publicRoot = path.join(projectRoot, 'public')
const imageJobs = [
  { input: 'Monochrome Hoodie Portrait Cutout.png', output: 'images/portrait', widths: [640, 1024], quality: 84, avifQuality: 60, primaryWidth: 1024 },
  { input: 'petromanager.png', output: 'petromanager', widths: [640, 960, 1200], quality: 84, avifQuality: 58 },
  { input: 'crowdsight.png', output: 'crowdsight', widths: [640, 960, 1200], quality: 84, avifQuality: 58 },
  { input: 'checkinnpro.png', output: 'checkinnpro', widths: [640, 960, 1200], quality: 84, avifQuality: 58 },
]

for (const job of imageJobs) {
  const source = path.join(sourceRoot, job.input)
  const metadata = await sharp(source).metadata()
  for (const width of job.widths) {
    const resized = sharp(source).resize({ width, withoutEnlargement: true })
    const base = path.join(publicRoot, job.output)
    await Promise.all([
      resized.clone().webp({ quality: job.quality, effort: 6 }).toFile(`${base}-${width}.webp`),
      resized.clone().avif({ quality: job.avifQuality, effort: 6 }).toFile(`${base}-${width}.avif`),
    ])
  }
  if (job.primaryWidth) {
    const base = path.join(publicRoot, job.output)
    await copyFile(`${base}-${job.primaryWidth}.webp`, `${base}.webp`)
    await copyFile(source, `${base}-original.png`)
  }
  console.log(`${job.input}: ${metadata.width}x${metadata.height} -> ${job.widths.join(', ')}px AVIF/WebP variants`)
}
