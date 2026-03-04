import {
  PrismaClient,
  UserRole,
  SeriesStatus,
  EpisodeStatus,
  EntitlementType,
  LedgerEntryType,
  ThreadType,
  VoteTargetType,
  WikiRevisionStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────

const USERS = [
  {
    username: 'fatedadmin',
    email: 'admin@fatedworld.com',
    displayName: 'Fated Admin',
    password: 'superadmin-change-me-immediately',
    role: UserRole.superadmin,
    bio: 'Platform administrator.',
    tokenBalance: 0n,
    isBanned: false,
    isVerifiedAuthor: false,
  },
  {
    username: 'luna_reader',
    email: 'luna@example.com',
    displayName: 'Luna Moonshadow',
    password: 'Luna2026!',
    role: UserRole.user,
    bio: 'Romantasy addict. Werewolf stories are my weakness.',
    tokenBalance: 500n,
    isBanned: false,
    isVerifiedAuthor: false,
  },
  {
    username: 'darknight_mod',
    email: 'darren@example.com',
    displayName: 'Darren Knight',
    password: 'Darren2026!',
    role: UserRole.moderator,
    bio: 'Community moderator. Keeping things civil since day one.',
    tokenBalance: 200n,
    isBanned: false,
    isVerifiedAuthor: false,
  },
  {
    username: 'elena_writes',
    email: 'elena@example.com',
    displayName: 'Elena Blackwood',
    password: 'Elena2026!',
    role: UserRole.author,
    bio: 'Author of Witchwood Coven and other tales. Writing is my magic.',
    tokenBalance: 1000n,
    isBanned: false,
    isVerifiedAuthor: true,
  },
  {
    username: 'kai_newbie',
    email: 'kai@example.com',
    displayName: 'Kai Rivers',
    password: 'Kai2026!',
    role: UserRole.approved_member,
    bio: 'Just started watching. So many good series!',
    tokenBalance: 50n,
    isBanned: false,
    isVerifiedAuthor: false,
  },
  {
    username: 'shadow_banned',
    email: 'shadow@example.com',
    displayName: 'Shadow User',
    password: 'Shadow2026!',
    role: UserRole.user,
    bio: '',
    tokenBalance: 0n,
    isBanned: true,
    isVerifiedAuthor: false,
  },
];

// ─────────────────────────────────────────────
// SERIES + EPISODES
// ─────────────────────────────────────────────

const GCS_COVERS = 'https://storage.googleapis.com/fatedworld-thumbnails-staging/covers';

const COVER_IMAGES = [
  `${GCS_COVERS}/bound-by-moon-cover.png`,
  `${GCS_COVERS}/fangs-beneath-silk-cover.png`,
  `${GCS_COVERS}/thorns-fey-court-cover.png`,
  `${GCS_COVERS}/dragonheart-legacy-cover.png`,
  `${GCS_COVERS}/spellbound-bride-cover.png`,
  `${GCS_COVERS}/devils-familiar-cover.png`,
  `${GCS_COVERS}/werewolf-affair-cover.png`,
  `${GCS_COVERS}/mermaid-mafia-cover.png`,
];

interface SeriesData {
  title: string;
  slug: string;
  description: string;
  genreTags: string[];
  coverIndex: number;
  seasonTitle: string;
  episodes: { title: string; description: string; durationSeconds: number }[];
}

const SERIES_DATA: SeriesData[] = [
  {
    title: 'Bound by the Moon',
    slug: 'bound-by-the-moon',
    description:
      'When a human scholar is captured by the ruthless alpha of the Silverclaw pack, she discovers that the bond between them is far older—and far more dangerous—than either could have imagined. A story of enemies forced together by fate.',
    genreTags: ['Werewolf', 'Shifter'],
    coverIndex: 0,
    seasonTitle: 'Season 1: The Binding',
    episodes: [
      { title: 'The Capture', description: 'Elara is taken from her village by Silverclaw raiders during the blood moon.', durationSeconds: 180 },
      { title: 'Wolves at the Gate', description: 'Inside the pack stronghold, Elara discovers the wolves are not what the stories say.', durationSeconds: 210 },
    ],
  },
  {
    title: 'Fangs Beneath Silk',
    slug: 'fangs-beneath-silk',
    description:
      'In a city where vampires rule from glass towers, a mortal thief steals a relic that binds her to the oldest vampire lord. Now hunted by both sides, they must navigate forbidden desire and political treachery to survive.',
    genreTags: ['Vampire'],
    coverIndex: 1,
    seasonTitle: 'Season 1: The Relic',
    episodes: [
      { title: 'The Heist', description: 'Sera breaks into the Nocturne Vault—and accidentally triggers an ancient curse.', durationSeconds: 190 },
      { title: 'Bound in Blood', description: 'Lord Cassian feels the tether snap into place, binding him to a mortal thief.', durationSeconds: 220 },
    ],
  },
  {
    title: 'Thorns of the Fey Court',
    slug: 'thorns-of-the-fey-court',
    description:
      'A human bride is traded to the ruthless king of the fae. Caught between the warring Seelie and Unseelie courts, she must outwit two cunning princes—or lose her soul to a bargain she never agreed to.',
    genreTags: ['Fae'],
    coverIndex: 2,
    seasonTitle: 'Season 1: The Accord',
    episodes: [
      { title: 'The Summons', description: 'Rowan receives the impossible assignment: negotiate peace with the fae courts.', durationSeconds: 170 },
      { title: 'Through the Veil', description: 'Crossing into the Faelands, Rowan realizes nothing she was taught about the fae is true.', durationSeconds: 200 },
    ],
  },
  {
    title: 'Dragonheart Legacy',
    slug: 'dragonheart-legacy',
    description:
      'The last dragon-bonded warrior awakens in a world that has forgotten magic. When ancient dragons begin to return, only she can bridge the gap between the old world and the new. An epic tale of fire, flight, and finding your place.',
    genreTags: ['Dragon', 'Shifter'],
    coverIndex: 3,
    seasonTitle: 'Season 1: Awakening',
    episodes: [
      { title: 'The Awakening', description: 'Lyra wakes in a cave surrounded by dragon bones, with no memory of who she is.', durationSeconds: 200 },
      { title: 'Ember and Ash', description: 'A young fire drake imprints on Lyra, reigniting a bond thought lost to history.', durationSeconds: 190 },
    ],
  },
  {
    title: 'The Spellbound Bride',
    slug: 'the-spellbound-bride',
    description:
      'Five outcasts with untrained powers are accepted into the secretive Witchwood Academy. But the school hides dark secrets, and the coven they form may be the only thing standing between the world and an ancient evil.',
    genreTags: ['Witch'],
    coverIndex: 4,
    seasonTitle: 'Season 1: First Year',
    episodes: [
      { title: 'The Invitation', description: 'Five strangers each receive a mysterious black envelope inviting them to Witchwood Academy.', durationSeconds: 175 },
      { title: 'Orientation', description: 'The new students learn the first rule of Witchwood: magic has a price.', durationSeconds: 195 },
    ],
  },
  {
    title: 'The Devil\'s Familiar',
    slug: 'the-devils-familiar',
    description:
      'When a mortal librarian accidentally summons a high-ranking demon, she becomes bound as his familiar. Now entangled in infernal politics and forbidden attraction, she must survive the demon courts—or risk losing her humanity forever.',
    genreTags: ['Demon', 'Fae'],
    coverIndex: 5,
    seasonTitle: 'Season 1: The Summoning',
    episodes: [
      { title: 'The Accidental Summoning', description: 'Clara reads from a forbidden grimoire and summons Azrael, a demon lord who should not exist on this plane.', durationSeconds: 195 },
      { title: 'The Familiar Bond', description: 'The bond snaps into place—Clara can feel his emotions, his hunger, his ancient rage.', durationSeconds: 210 },
    ],
  },
  {
    title: 'A Werewolf Affair',
    slug: 'a-werewolf-affair',
    description:
      'Two rival pack heirs are forced into an arranged mating to prevent a war. But old grudges, secret lovers, and a conspiracy that runs deeper than either pack imagined threaten to tear them apart before the bond can take hold.',
    genreTags: ['Werewolf'],
    coverIndex: 6,
    seasonTitle: 'Season 1: The Arrangement',
    episodes: [
      { title: 'The Treaty', description: 'The alpha council decrees that Luka and Mara must mate or face exile. Neither is willing.', durationSeconds: 185 },
      { title: 'Hostile Territory', description: 'Mara moves into the Blackthorn packlands and discovers Luka already has a lover.', durationSeconds: 200 },
    ],
  },
  {
    title: 'The Mermaid Mafia',
    slug: 'the-mermaid-mafia',
    description:
      'Beneath the glittering surface of a coastal city, merfolk run the most dangerous crime syndicate in the supernatural world. When a human detective stumbles onto their operation, the syndicate boss offers her a choice: join them, or disappear beneath the waves.',
    genreTags: ['Mermaid'],
    coverIndex: 7,
    seasonTitle: 'Season 1: Deep Water',
    episodes: [
      { title: 'The Sting', description: 'Detective Naia Reeves follows a money trail to a waterfront club—and finds something impossible.', durationSeconds: 190 },
      { title: 'The Offer', description: 'Syndicate boss Kai Morvane gives Naia twenty-four hours to decide her fate.', durationSeconds: 205 },
    ],
  },
];

// ─────────────────────────────────────────────
// WIKI CONTENT TEMPLATES
// ─────────────────────────────────────────────

function wikiContent(seriesTitle: string, slug: string) {
  return [
    {
      slug: `${slug}-characters`,
      title: `${seriesTitle} — Characters`,
      tags: ['characters', 'guide'],
      taxonomyPath: `series/${slug}/characters`,
      body: `# Characters of ${seriesTitle}\n\n## Main Characters\n\n### Protagonist\nThe central figure whose journey drives the narrative. Deeply complex, they must navigate loyalty, love, and survival.\n\n### The Love Interest\nMagnetic and dangerous, this character challenges the protagonist at every turn. Their relationship is the emotional core of the story.\n\n### The Mentor\nA seasoned figure with secrets of their own. They guide the protagonist but have hidden motivations.\n\n## Supporting Cast\n\n- **The Best Friend** — Loyal to a fault, providing comic relief and emotional grounding.\n- **The Rival** — Ambitious and cunning, they serve as both obstacle and mirror to the protagonist.\n- **The Antagonist** — Their goals are not entirely unreasonable, making them a compelling threat.\n`,
    },
    {
      slug: `${slug}-lore`,
      title: `${seriesTitle} — Lore & World`,
      tags: ['lore', 'worldbuilding'],
      taxonomyPath: `series/${slug}/lore`,
      body: `# Lore & World of ${seriesTitle}\n\n## Setting\n\nThe story takes place in a world where the supernatural exists alongside the mundane, hidden from most mortals. Ancient pacts and magical boundaries keep the balance.\n\n## History\n\nCenturies ago, a great war between the magical factions nearly destroyed everything. The treaties that followed created an uneasy peace that persists to this day.\n\n## Magic System\n\nMagic in this world follows the Law of Equivalence—every spell demands a price proportional to its power. The most powerful practitioners have paid dearly for their abilities.\n\n## Key Locations\n\n- **The Stronghold** — The primary setting where much of the action takes place.\n- **The Borderlands** — A dangerous frontier between territories.\n- **The Ancient Ruins** — Remnants of the old world, holding forgotten power.\n`,
    },
    {
      slug: `${slug}-episode-guide`,
      title: `${seriesTitle} — Episode Guide`,
      tags: ['episodes', 'guide', 'recap'],
      taxonomyPath: `series/${slug}/episodes`,
      body: `# Episode Guide: ${seriesTitle}\n\n## Season 1 Overview\n\nThe first season establishes the core conflict and introduces the main characters. Episodes 1-5 set up the world and relationships, while episodes 6-10 escalate the stakes dramatically.\n\n## Episode Breakdown\n\n| Episode | Title | Key Events |\n|---------|-------|------------|\n| 1 | Premiere | Introduction to the protagonist and the inciting incident |\n| 2 | Rising Action | The world expands as new characters enter |\n| 3 | The Reveal | A major secret changes everything |\n| 4 | Consequences | Characters deal with fallout from the reveal |\n| 5 | Midpoint | The turning point that sets up the second half |\n| 6 | Escalation | Stakes rise as antagonist makes their move |\n| 7 | Alliance | Unlikely allies come together |\n| 8 | Betrayal | Trust is broken in a shocking twist |\n| 9 | Penultimate | Everything builds toward the climax |\n| 10 | Finale | The season reaches its explosive conclusion |\n`,
    },
    {
      slug: `${slug}-powers`,
      title: `${seriesTitle} — Powers & Abilities`,
      tags: ['powers', 'magic', 'abilities'],
      taxonomyPath: `series/${slug}/powers`,
      body: `# Powers & Abilities in ${seriesTitle}\n\n## Core Powers\n\n### The Bond\nThe central magical connection in the story. It grants enhanced abilities but also creates vulnerability—what one feels, the other experiences.\n\n### Elemental Magic\nCharacters draw on elemental forces tied to their nature:\n- **Fire** — Offensive power, passion, destruction\n- **Shadow** — Stealth, illusion, fear\n- **Nature** — Healing, growth, communication with the wild\n- **Spirit** — Divination, psychic connection, ancestral power\n\n## Power Tiers\n\n1. **Latent** — Untrained, instinctual magic\n2. **Awakened** — Conscious control of one element\n3. **Bonded** — Enhanced through magical partnership\n4. **Ascended** — Rare; full mastery achieved through sacrifice\n\n## Limitations\n\nAll power usage depletes life force. Extended use without rest can be fatal.\n`,
    },
    {
      slug: `${slug}-theories`,
      title: `${seriesTitle} — Fan Theories`,
      tags: ['theories', 'speculation', 'community'],
      taxonomyPath: `series/${slug}/theories`,
      body: `# Fan Theories: ${seriesTitle}\n\n## Popular Theories\n\n### The Hidden Lineage Theory\nMany fans believe the protagonist has a secret heritage connecting them to the ancient rulers. Evidence includes the mysterious mark and their unusual affinity for power.\n\n### The Double Agent Theory\nA popular theory suggests one of the supporting characters has been working for the antagonist from the beginning. Subtle dialogue hints support this.\n\n### The Prophecy Interpretation\nThe ancient prophecy mentioned in Episode 3 may have a dual meaning. Some fans argue it refers not to war, but to a union.\n\n## Debunked Theories\n\n- ~~The mentor is the true villain~~ — Confirmed otherwise in Episode 8\n- ~~The setting is a simulation~~ — No evidence supports this\n\n## Open Questions\n\n- What is the true origin of the bond?\n- Will the antagonist be redeemed?\n- What lies beyond the borders of the known world?\n`,
    },
  ];
}

// ─────────────────────────────────────────────
// COMMUNITY THREAD TEMPLATES
// ─────────────────────────────────────────────

interface ThreadTemplate {
  title: string;
  body: string;
  type: ThreadType;
  replies: string[];
}

function communityThreads(seriesTitle: string): ThreadTemplate[] {
  return [
    {
      title: `${seriesTitle} — Who else is obsessed?`,
      body: `I just binged the first five episodes and I can't stop thinking about this series. The world-building is incredible and the chemistry between the leads is off the charts. Anyone else completely hooked?`,
      type: ThreadType.series,
      replies: [
        'Yes! I watched all five free episodes in one sitting. The cliffhanger at the end of episode 5 is killing me.',
        'The writing quality surprised me. Way better than I expected for a short-form series.',
        'I unlocked episode 6 and it only gets better. Trust me, it\'s worth the tokens.',
      ],
    },
    {
      title: `Episode 5 reaction — ${seriesTitle}`,
      body: `THAT ENDING. I did NOT see that coming. Without spoiling anything, let\'s just say episode 5 changes everything we thought we knew. Drop your reactions below!`,
      type: ThreadType.episode,
      replies: [
        'My jaw literally dropped. I had to rewatch the last two minutes three times.',
        'I called it back in episode 2! There were hints the whole time if you look carefully.',
      ],
    },
  ];
}

// ─────────────────────────────────────────────
// MAIN SEED FUNCTION
// ─────────────────────────────────────────────

async function main() {
  console.log('Seeding database...\n');

  // ── Users ──────────────────────────────────

  console.log('Creating users...');
  const createdUsers: Record<string, string> = {};

  for (const u of USERS) {
    const passwordHash = await bcrypt.hash(u.password, 12);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        username: u.username,
        email: u.email,
        displayName: u.displayName,
        passwordHash,
        role: u.role,
        bio: u.bio,
        emailVerified: true,
        isVerifiedAuthor: u.isVerifiedAuthor,
        isBanned: u.isBanned,
      },
    });

    createdUsers[u.username] = user.id;

    await prisma.tokenWallet.upsert({
      where: { userId: user.id },
      update: { balance: u.tokenBalance },
      create: { userId: user.id, balance: u.tokenBalance },
    });

    await prisma.notificationPreference.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });

    console.log(`  ✓ ${u.username} (${u.role})`);
  }

  const adminId = createdUsers['fatedadmin'];
  const lunaId = createdUsers['luna_reader'];
  const darrenId = createdUsers['darknight_mod'];
  const elenaId = createdUsers['elena_writes'];
  const kaiId = createdUsers['kai_newbie'];

  // ── Series, Seasons, Episodes ──────────────

  console.log('\nCreating series, seasons, and episodes...');
  const seriesRecords: Record<string, string> = {};
  const episodeRecords: Record<string, string[]> = {};

  for (const sd of SERIES_DATA) {
    const series = await prisma.series.upsert({
      where: { slug: sd.slug },
      update: {},
      create: {
        title: sd.title,
        slug: sd.slug,
        description: sd.description,
        genreTags: sd.genreTags,
        coverImageUrl: COVER_IMAGES[sd.coverIndex],
        status: SeriesStatus.published,
        createdBy: elenaId,
      },
    });
    seriesRecords[sd.slug] = series.id;

    const existingSeason = await prisma.season.findUnique({
      where: { seriesId_number: { seriesId: series.id, number: 1 } },
    });
    const season =
      existingSeason ??
      (await prisma.season.create({
        data: {
          seriesId: series.id,
          number: 1,
          title: sd.seasonTitle,
          arcLabel: 'Season 1',
          sortOrder: 0,
        },
      }));

    const epIds: string[] = [];
    for (let i = 0; i < sd.episodes.length; i++) {
      const ep = sd.episodes[i];
      const isGated = i >= 5;
      const existingEp = await prisma.episode.findFirst({
        where: { seriesId: series.id, number: i + 1 },
      });
      const episode =
        existingEp ??
        (await prisma.episode.create({
          data: {
            seriesId: series.id,
            seasonId: season.id,
            number: i + 1,
            title: ep.title,
            description: ep.description,
            durationSeconds: ep.durationSeconds,
            isGated,
            tokenCost: isGated ? 15 : 0,
            status: EpisodeStatus.published,
            publishedAt: new Date(),
            sortOrder: i,
          },
        }));
      epIds.push(episode.id);
    }
    episodeRecords[sd.slug] = epIds;

    console.log(`  ✓ ${sd.title} — ${epIds.length} episodes`);
  }

  // ── Entitlements + Ledger ──────────────────

  console.log('\nCreating entitlements...');

  const boundEps = episodeRecords['bound-by-the-moon'] ?? [];
  const fangsEps = episodeRecords['fangs-beneath-silk'] ?? [];
  const spellboundSeriesId = seriesRecords['the-spellbound-bride'];

  const lunaUnlocks = [
    ...(boundEps[0] ? [{ episodeId: boundEps[0], seriesId: seriesRecords['bound-by-the-moon'] }] : []),
    ...(boundEps[1] ? [{ episodeId: boundEps[1], seriesId: seriesRecords['bound-by-the-moon'] }] : []),
    ...(fangsEps[0] ? [{ episodeId: fangsEps[0], seriesId: seriesRecords['fangs-beneath-silk'] }] : []),
    ...(fangsEps[1] ? [{ episodeId: fangsEps[1], seriesId: seriesRecords['fangs-beneath-silk'] }] : []),
  ];

  for (const unlock of lunaUnlocks) {
    const idempKey = `seed-unlock-${lunaId}-${unlock.episodeId}`;
    const existingLedger = await prisma.tokenLedgerEntry.findUnique({
      where: { idempotencyKey: idempKey },
    });

    if (!existingLedger) {
      const ledger = await prisma.tokenLedgerEntry.create({
        data: {
          userId: lunaId,
          amount: -15n,
          balanceAfter: 500n,
          type: LedgerEntryType.unlock_debit,
          referenceId: unlock.episodeId,
          idempotencyKey: idempKey,
          createdBy: lunaId,
        },
      });

      await prisma.entitlement.create({
        data: {
          userId: lunaId,
          type: EntitlementType.episode_unlock,
          seriesId: unlock.seriesId,
          episodeId: unlock.episodeId,
          ledgerEntryId: ledger.id,
        },
      });
    }
  }
  console.log('  ✓ luna_reader — 4 episode unlocks');

  // elena_writes has author_access to The Spellbound Bride
  if (spellboundSeriesId) {
    const elenaEntitlementExists = await prisma.entitlement.findFirst({
      where: {
        userId: elenaId,
        type: EntitlementType.author_access,
        seriesId: spellboundSeriesId,
      },
    });
    if (!elenaEntitlementExists) {
      await prisma.entitlement.create({
        data: {
          userId: elenaId,
          type: EntitlementType.author_access,
          seriesId: spellboundSeriesId,
        },
      });
    }
  }
  console.log('  ✓ elena_writes — author_access to The Spellbound Bride');

  // ── Wiki Pages ─────────────────────────────

  console.log('\nCreating wiki pages...');

  for (const sd of SERIES_DATA) {
    const seriesId = seriesRecords[sd.slug];
    const pages = wikiContent(sd.title, sd.slug);
    const authorId = sd.slug === 'the-spellbound-bride' ? elenaId : darrenId;

    for (const page of pages) {
      const existingPage = await prisma.wikiPage.findUnique({
        where: { slug: page.slug },
      });

      if (!existingPage) {
        const wikiPage = await prisma.wikiPage.create({
          data: {
            slug: page.slug,
            title: page.title,
            seriesId,
            taxonomyPath: page.taxonomyPath,
            tags: page.tags,
            isPublished: true,
            createdBy: authorId,
          },
        });

        const revision = await prisma.wikiRevision.create({
          data: {
            pageId: wikiPage.id,
            body: page.body,
            authorId,
            status: WikiRevisionStatus.approved,
            reviewedBy: adminId,
            reviewedAt: new Date(),
            versionNum: 1,
          },
        });

        await prisma.wikiPage.update({
          where: { id: wikiPage.id },
          data: { currentRevId: revision.id },
        });
      }
    }
    console.log(`  ✓ ${sd.title} — 5 wiki pages`);
  }

  // ── Community Threads + Replies ────────────

  console.log('\nCreating community threads...');

  const threadAuthors = [lunaId, kaiId, darrenId, elenaId, lunaId];
  const replyAuthors = [kaiId, darrenId, elenaId, lunaId];

  for (let si = 0; si < SERIES_DATA.length; si++) {
    const sd = SERIES_DATA[si];
    const seriesId = seriesRecords[sd.slug];
    const templates = communityThreads(sd.title);

    for (let ti = 0; ti < templates.length; ti++) {
      const tmpl = templates[ti];
      const threadAuthor = threadAuthors[(si + ti) % threadAuthors.length];

      const existingThread = await prisma.thread.findFirst({
        where: { seriesId, title: tmpl.title },
      });

      if (!existingThread) {
        const thread = await prisma.thread.create({
          data: {
            type: tmpl.type,
            seriesId,
            episodeId: tmpl.type === ThreadType.episode ? episodeRecords[sd.slug][4] : null,
            authorId: threadAuthor,
            title: tmpl.title,
            body: tmpl.body,
            voteCount: tmpl.replies.length + 2,
          },
        });

        for (let ri = 0; ri < tmpl.replies.length; ri++) {
          const replyAuthorId = replyAuthors[(si + ri) % replyAuthors.length];
          if (replyAuthorId === threadAuthor) continue;

          await prisma.threadReply.create({
            data: {
              threadId: thread.id,
              authorId: replyAuthorId,
              body: tmpl.replies[ri],
              voteCount: Math.floor(Math.random() * 5) + 1,
            },
          });
        }

        // Add some votes
        const voters = [lunaId, kaiId, darrenId, elenaId].filter(
          (v) => v !== threadAuthor,
        );
        for (const voterId of voters.slice(0, 2)) {
          await prisma.vote.upsert({
            where: {
              userId_targetType_targetId: {
                userId: voterId,
                targetType: VoteTargetType.thread,
                targetId: thread.id,
              },
            },
            update: {},
            create: {
              userId: voterId,
              targetType: VoteTargetType.thread,
              targetId: thread.id,
              value: 1,
            },
          });
        }
      }
    }
    console.log(`  ✓ ${sd.title} — 2 threads with replies`);
  }

  // ── Done ───────────────────────────────────

  console.log('\n─────────────────────────────────');
  console.log('Seed complete!');
  console.log('─────────────────────────────────');
  console.log('\nSample login credentials:');
  console.log('  Admin:     admin@fatedworld.com  /  superadmin-change-me-immediately');
  console.log('  Reader:    luna@example.com       /  Luna2026!');
  console.log('  Moderator: darren@example.com     /  Darren2026!');
  console.log('  Author:    elena@example.com      /  Elena2026!');
  console.log('  Newbie:    kai@example.com         /  Kai2026!');
  console.log('  Banned:    shadow@example.com      /  Shadow2026!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
