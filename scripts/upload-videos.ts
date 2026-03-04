/**
 * One-time script: upload videos from ~/Desktop/Videos to GCS
 * and create EpisodeAsset records in the staging database.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/upload-videos.ts
 */

import { PrismaClient, AssetVersionType } from '@prisma/client';
import { execSync } from 'child_process';
import { randomUUID } from 'crypto';
import { statSync } from 'fs';

const prisma = new PrismaClient();

const VIDEOS_DIR = '/Users/simon/Desktop/Videos';
const GCS_BUCKET = 'fatedworld-upload-staging';

interface VideoMapping {
  files: string[];
  seriesSlugs: string[];
}

const MAPPINGS: VideoMapping[] = [
  {
    files: ['Bound-By-moon1.mp4', 'Bound-by-moon2.mp4', 'Bound-By-Moon3.mp4'],
    seriesSlugs: ['bound-by-the-moon', 'a-werewolf-affair'],
  },
  {
    files: ['Fangs1.mp4', 'Fangs2.mp4', 'Fangs3.mp4'],
    seriesSlugs: ['fangs-beneath-silk'],
  },
  {
    files: ['Fey1.mp4', 'Fey2.mp4', 'Fey3.mp4'],
    seriesSlugs: ['thorns-of-the-fey-court', 'venom-and-vows'],
  },
  {
    files: ['Dragonheart1.mp4', 'Dragonheart2.mp4', 'Dragonheart3.mp4'],
    seriesSlugs: ['dragonheart-legacy', 'the-phoenix-reborn'],
  },
  {
    files: ['Mermaid1.mp4', 'Mermaid2.mp4', 'Mermaid3.mp4'],
    seriesSlugs: ['the-mermaid-mafia', 'sirens-debt'],
  },
  {
    files: ['Devil1.mp4', 'Devil2.mp4'],
    seriesSlugs: ['the-devils-familiar'],
  },
  {
    files: ['Spellbound1.mp4', 'Spellbound2.mp4'],
    seriesSlugs: ['the-spellbound-bride'],
  },
  {
    files: ['Sword1.mp4', 'Sword2.mp4'],
    seriesSlugs: ['cursed-throne-of-shadows'],
  },
  {
    files: ['Fairy1.mp4', 'Fairy2.mp4'],
    seriesSlugs: ['nightblood-academy'],
  },
];

async function main() {
  // Collect all unique files we need to upload to GCS
  const allFiles = new Set<string>();
  for (const m of MAPPINGS) {
    for (const f of m.files) allFiles.add(f);
  }

  // Track GCS keys for each file (upload once, reuse across series)
  const fileGcsKeys: Record<string, string> = {};

  // GCS upload already completed - just build the key map
  for (const file of allFiles) {
    fileGcsKeys[file] = `videos/${file}`;
  }
  console.log(`Mapped ${allFiles.size} video files (already in GCS)\n`);

  // Find the admin user to use as uploader
  const admin = await prisma.user.findFirst({ where: { role: 'superadmin' } });
  if (!admin) throw new Error('No superadmin user found');

  let totalAssets = 0;

  for (const mapping of MAPPINGS) {
    for (const slug of mapping.seriesSlugs) {
      const series = await prisma.series.findUnique({ where: { slug } });
      if (!series) {
        console.warn(`  Series "${slug}" not found, skipping`);
        continue;
      }

      const episodes = await prisma.episode.findMany({
        where: { seriesId: series.id, isDeleted: false },
        orderBy: { number: 'asc' },
      });

      console.log(`  ${series.title} (${slug}): ${episodes.length} episodes, ${mapping.files.length} videos`);

      for (let i = 0; i < episodes.length; i++) {
        const ep = episodes[i];
        const videoFile = mapping.files[i % mapping.files.length];
        const gcsKey = fileGcsKeys[videoFile];
        const localPath = `${VIDEOS_DIR}/${videoFile}`;
        const fileSize = statSync(localPath).size;

        // Check if this episode already has an active asset
        const existing = await prisma.episodeAsset.findFirst({
          where: { episodeId: ep.id, versionType: AssetVersionType.main, isActive: true },
        });

        if (existing) {
          console.log(`    Ep ${ep.number} "${ep.title}" — already has asset, skipping`);
          continue;
        }

        const assetId = randomUUID();
        await prisma.episodeAsset.create({
          data: {
            id: assetId,
            episodeId: ep.id,
            versionType: AssetVersionType.main,
            versionNumber: 1,
            gcsBucket: GCS_BUCKET,
            gcsObjectKey: gcsKey,
            fileSizeBytes: BigInt(fileSize),
            mimeType: 'video/mp4',
            isActive: true,
            uploadedBy: admin.id,
          },
        });

        totalAssets++;
        console.log(`    Ep ${ep.number} "${ep.title}" -> ${videoFile}`);
      }
    }
  }

  console.log(`\n=== Created ${totalAssets} EpisodeAsset records ===`);
  console.log('Done!\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
