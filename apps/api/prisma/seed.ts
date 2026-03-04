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
  AbuseReportCategory,
  AbuseReportStatus,
  ModerationActionType,
  ModerationTargetType,
  DistributionFormat,
  DistributionPlatform,
  DistributionJobStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────
// USERS (6 original + 2 new sample accounts)
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
  {
    username: 'nyx_fangirl',
    email: 'nyx@example.com',
    displayName: 'Nyx Fernandez',
    password: 'Nyx2026!',
    role: UserRole.user,
    bio: 'Vampire fiction is life. Currently obsessed with Fangs Beneath Silk.',
    tokenBalance: 300n,
    isBanned: false,
    isVerifiedAuthor: false,
  },
  {
    username: 'raven_author',
    email: 'raven@example.com',
    displayName: 'Raven Ashcroft',
    password: 'Raven2026!',
    role: UserRole.author,
    bio: 'Dark fantasy author. Creator of Cursed Throne of Shadows.',
    tokenBalance: 800n,
    isBanned: false,
    isVerifiedAuthor: true,
  },
];

// ─────────────────────────────────────────────
// SERIES + EPISODES (13 series x 10 episodes)
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
  `${GCS_COVERS}/cursed-throne-shadows-cover.png`,
  `${GCS_COVERS}/nightblood-academy-cover.png`,
  `${GCS_COVERS}/sirens-debt-cover.png`,
  `${GCS_COVERS}/phoenix-reborn-cover.png`,
  `${GCS_COVERS}/venom-vows-cover.png`,
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
      'When a human scholar is captured by the ruthless alpha of the Silverclaw pack, she discovers that the bond between them is far older—and far more dangerous—than either could have imagined.',
    genreTags: ['Werewolf', 'Shifter'],
    coverIndex: 0,
    seasonTitle: 'Season 1: The Binding',
    episodes: [
      { title: 'The Capture', description: 'Elara is taken from her village by Silverclaw raiders during the blood moon.', durationSeconds: 180 },
      { title: 'Wolves at the Gate', description: 'Inside the pack stronghold, Elara discovers the wolves are not what the stories say.', durationSeconds: 210 },
      { title: 'The Alpha\'s Command', description: 'Kael tests Elara with an impossible task, but she refuses to break.', durationSeconds: 195 },
      { title: 'Silver Chains', description: 'An ancient artifact resurfaces, and Elara realizes she can hear the wolves\' thoughts.', durationSeconds: 220 },
      { title: 'Blood Moon Rising', description: 'The blood moon triggers the bond, and Kael can no longer deny what Elara is to him.', durationSeconds: 205 },
      { title: 'The Rival Pack', description: 'A rival pack challenges Kael\'s claim, and Elara becomes a pawn in a deadly game.', durationSeconds: 230 },
      { title: 'Heart of the Wolf', description: 'Elara must choose between her old life and the pack that has become her family.', durationSeconds: 215 },
      { title: 'The Betrayal', description: 'Someone within Silverclaw has been feeding information to the enemy.', durationSeconds: 200 },
      { title: 'Claws and Crowns', description: 'The pack council demands Elara prove her worth or face exile.', durationSeconds: 225 },
      { title: 'Moonbound', description: 'In a climactic battle under the full moon, Elara and Kael\'s bond is tested to its limit.', durationSeconds: 240 },
    ],
  },
  {
    title: 'Fangs Beneath Silk',
    slug: 'fangs-beneath-silk',
    description:
      'In a city where vampires rule from glass towers, a mortal thief steals a relic that binds her to the oldest vampire lord.',
    genreTags: ['Vampire'],
    coverIndex: 1,
    seasonTitle: 'Season 1: The Relic',
    episodes: [
      { title: 'The Heist', description: 'Sera breaks into the Nocturne Vault—and accidentally triggers an ancient curse.', durationSeconds: 190 },
      { title: 'Bound in Blood', description: 'Lord Cassian feels the tether snap into place, binding him to a mortal thief.', durationSeconds: 220 },
      { title: 'Glass Towers', description: 'Sera is brought before the Vampire Council to answer for her crimes.', durationSeconds: 200 },
      { title: 'The Relic\'s Whisper', description: 'The stolen relic begins to speak in an ancient tongue only Sera can hear.', durationSeconds: 185 },
      { title: 'Midnight Gala', description: 'Cassian takes Sera to a vampire gathering where she must play the part of his consort.', durationSeconds: 215 },
      { title: 'Blood Price', description: 'A rival vampire lord offers to break the bond—for a terrible price.', durationSeconds: 210 },
      { title: 'The Hunt', description: 'Assassins come for Sera, and Cassian reveals the depth of his protection.', durationSeconds: 225 },
      { title: 'Crimson Truth', description: 'Sera discovers the relic\'s true origin and its connection to Cassian\'s past.', durationSeconds: 195 },
      { title: 'Daywalker', description: 'The bond grants Sera abilities that shouldn\'t be possible for a mortal.', durationSeconds: 230 },
      { title: 'Fangs Unveiled', description: 'The Vampire Council makes its move, and Sera must choose which world she belongs to.', durationSeconds: 245 },
    ],
  },
  {
    title: 'Thorns of the Fey Court',
    slug: 'thorns-of-the-fey-court',
    description:
      'A human bride is traded to the ruthless king of the fae. Caught between warring courts, she must outwit two cunning princes.',
    genreTags: ['Fae'],
    coverIndex: 2,
    seasonTitle: 'Season 1: The Accord',
    episodes: [
      { title: 'The Summons', description: 'Rowan receives the impossible assignment: negotiate peace with the fae courts.', durationSeconds: 170 },
      { title: 'Through the Veil', description: 'Crossing into the Faelands, Rowan realizes nothing she was taught about the fae is true.', durationSeconds: 200 },
      { title: 'The Court of Thorns', description: 'Rowan is presented to the Unseelie King, whose cruelty is matched only by his beauty.', durationSeconds: 190 },
      { title: 'Bargains and Briars', description: 'Every word in the fae court carries a double meaning, and Rowan learns to play the game.', durationSeconds: 210 },
      { title: 'The Seelie Prince', description: 'A charming Seelie prince offers Rowan an alliance—but his kindness may be another trap.', durationSeconds: 195 },
      { title: 'Iron and Ivy', description: 'Rowan discovers she carries something the fae desperately want: iron-touched blood.', durationSeconds: 220 },
      { title: 'The Wild Hunt', description: 'Rowan is forced to participate in the Wild Hunt, an ancient and deadly fae tradition.', durationSeconds: 235 },
      { title: 'Masks and Mirrors', description: 'A masquerade ball becomes a battleground for political intrigue and forbidden desire.', durationSeconds: 205 },
      { title: 'The Unraveling', description: 'Rowan\'s true heritage is revealed, shaking both courts to their foundations.', durationSeconds: 215 },
      { title: 'Crown of Thorns', description: 'Rowan must choose which court to serve—or claim the throne for herself.', durationSeconds: 250 },
    ],
  },
  {
    title: 'Dragonheart Legacy',
    slug: 'dragonheart-legacy',
    description:
      'The last dragon-bonded warrior awakens in a world that has forgotten magic. An epic tale of fire, flight, and finding your place.',
    genreTags: ['Dragon', 'Shifter'],
    coverIndex: 3,
    seasonTitle: 'Season 1: Awakening',
    episodes: [
      { title: 'The Awakening', description: 'Lyra wakes in a cave surrounded by dragon bones, with no memory of who she is.', durationSeconds: 200 },
      { title: 'Ember and Ash', description: 'A young fire drake imprints on Lyra, reigniting a bond thought lost to history.', durationSeconds: 190 },
      { title: 'The Last Roost', description: 'Lyra discovers a hidden valley where the last surviving dragons have been hiding.', durationSeconds: 210 },
      { title: 'Wings of War', description: 'The modern military discovers the dragons and sends a strike team.', durationSeconds: 225 },
      { title: 'Dragonfire', description: 'Lyra unleashes her bonded dragon\'s fire in a desperate defense of the roost.', durationSeconds: 215 },
      { title: 'Scales and Secrets', description: 'An old journal reveals the truth about the dragon wars and Lyra\'s role in ending them.', durationSeconds: 200 },
      { title: 'The Hatchling', description: 'A new dragon egg hatches, and Lyra must protect it from those who would weaponize it.', durationSeconds: 195 },
      { title: 'Flight Path', description: 'Lyra takes to the sky for the first time, soaring above a world that has forgotten the wonder of dragons.', durationSeconds: 220 },
      { title: 'The Dragonslayer', description: 'A legendary hunter returns with only one goal: kill every last dragon.', durationSeconds: 230 },
      { title: 'Legacy', description: 'Lyra makes a sacrifice that will determine the fate of dragonkind forever.', durationSeconds: 245 },
    ],
  },
  {
    title: 'The Spellbound Bride',
    slug: 'the-spellbound-bride',
    description:
      'Five outcasts with untrained powers are accepted into the secretive Witchwood Academy. But the school hides dark secrets.',
    genreTags: ['Witch'],
    coverIndex: 4,
    seasonTitle: 'Season 1: First Year',
    episodes: [
      { title: 'The Invitation', description: 'Five strangers each receive a mysterious black envelope inviting them to Witchwood Academy.', durationSeconds: 175 },
      { title: 'Orientation', description: 'The new students learn the first rule of Witchwood: magic has a price.', durationSeconds: 195 },
      { title: 'The Familiar', description: 'Each student must bond with a magical familiar—but one student\'s familiar is dangerous.', durationSeconds: 205 },
      { title: 'Hex and Hexed', description: 'A prank war between covens escalates into real dark magic.', durationSeconds: 190 },
      { title: 'The Greenhouse', description: 'A forbidden wing of the academy holds plants that whisper prophecies.', durationSeconds: 185 },
      { title: 'Blood Rites', description: 'An ancient ritual goes wrong, and one student begins to change.', durationSeconds: 220 },
      { title: 'The Professor\'s Secret', description: 'The most respected teacher at Witchwood is hiding a connection to the school\'s dark past.', durationSeconds: 210 },
      { title: 'Coven Wars', description: 'The five outcasts must form their own coven to survive the academy\'s trials.', durationSeconds: 225 },
      { title: 'The Sealed Library', description: 'Breaking into the restricted section reveals a spell that could change everything.', durationSeconds: 200 },
      { title: 'Witchwood\'s Price', description: 'The school demands its ultimate price, and the coven must decide what they\'re willing to pay.', durationSeconds: 240 },
    ],
  },
  {
    title: 'The Devil\'s Familiar',
    slug: 'the-devils-familiar',
    description:
      'When a mortal librarian accidentally summons a high-ranking demon, she becomes bound as his familiar. Entangled in infernal politics.',
    genreTags: ['Demon', 'Fae'],
    coverIndex: 5,
    seasonTitle: 'Season 1: The Summoning',
    episodes: [
      { title: 'The Accidental Summoning', description: 'Clara reads from a forbidden grimoire and summons Azrael, a demon lord.', durationSeconds: 195 },
      { title: 'The Familiar Bond', description: 'The bond snaps into place—Clara can feel his emotions, his hunger, his ancient rage.', durationSeconds: 210 },
      { title: 'Infernal Politics', description: 'Azrael brings Clara to the Demon Court, where she\'s seen as either a weapon or a threat.', durationSeconds: 200 },
      { title: 'The Library Below', description: 'Clara discovers that her library sits atop a gateway to the underworld.', durationSeconds: 185 },
      { title: 'Hellfire Kiss', description: 'The bond deepens as Azrael and Clara share memories through their connection.', durationSeconds: 215 },
      { title: 'The Archdevil\'s Offer', description: 'A more powerful demon offers to free Clara—in exchange for Azrael\'s true name.', durationSeconds: 225 },
      { title: 'Sacred Ground', description: 'Clara must enter a church to retrieve an artifact, testing the limits of her demon bond.', durationSeconds: 190 },
      { title: 'The Grimoire War', description: 'Other summoners come for the forbidden grimoire, and Clara must defend it.', durationSeconds: 230 },
      { title: 'Fallen Grace', description: 'Azrael\'s past as a fallen angel is revealed, changing everything Clara thought she knew.', durationSeconds: 205 },
      { title: 'The Devil\'s Due', description: 'Clara must descend into hell itself to save Azrael from his own kind.', durationSeconds: 250 },
    ],
  },
  {
    title: 'A Werewolf Affair',
    slug: 'a-werewolf-affair',
    description:
      'Two rival pack heirs are forced into an arranged mating to prevent a war. Old grudges and secret lovers threaten everything.',
    genreTags: ['Werewolf'],
    coverIndex: 6,
    seasonTitle: 'Season 1: The Arrangement',
    episodes: [
      { title: 'The Treaty', description: 'The alpha council decrees that Luka and Mara must mate or face exile.', durationSeconds: 185 },
      { title: 'Hostile Territory', description: 'Mara moves into the Blackthorn packlands and discovers Luka already has a lover.', durationSeconds: 200 },
      { title: 'Scent and Fury', description: 'The mate bond begins to form despite their resistance, manifesting as shared senses.', durationSeconds: 195 },
      { title: 'The Ex', description: 'Luka\'s former lover challenges Mara to a dominance fight.', durationSeconds: 210 },
      { title: 'Pack Politics', description: 'Elder wolves conspire to break the treaty and use the forced mating as a weapon.', durationSeconds: 205 },
      { title: 'Full Moon Frenzy', description: 'The first full moon together forces both into their wolf forms, and instinct takes over.', durationSeconds: 220 },
      { title: 'Border Skirmish', description: 'A border dispute erupts into violence, testing the fragile alliance.', durationSeconds: 215 },
      { title: 'The Rogue Alpha', description: 'A rogue wolf with no pack loyalty emerges as a threat to both clans.', durationSeconds: 225 },
      { title: 'Chosen or Fated', description: 'Mara discovers she can reject the mate bond—but doing so may kill them both.', durationSeconds: 195 },
      { title: 'Wolfheart', description: 'War erupts, and only the strength of their bond can unite the packs.', durationSeconds: 240 },
    ],
  },
  {
    title: 'The Mermaid Mafia',
    slug: 'the-mermaid-mafia',
    description:
      'Beneath the surface of a coastal city, merfolk run the most dangerous crime syndicate. A human detective stumbles into their world.',
    genreTags: ['Mermaid'],
    coverIndex: 7,
    seasonTitle: 'Season 1: Deep Water',
    episodes: [
      { title: 'The Sting', description: 'Detective Naia follows a money trail to a waterfront club—and finds something impossible.', durationSeconds: 190 },
      { title: 'The Offer', description: 'Syndicate boss Kai Morvane gives Naia twenty-four hours to decide her fate.', durationSeconds: 205 },
      { title: 'Dive Bar', description: 'Naia goes undercover in the merfolk\'s hidden underwater bar, struggling to keep her cover.', durationSeconds: 200 },
      { title: 'The Siren\'s Song', description: 'Naia discovers that merfolk can compel humans with their voices—and she might be immune.', durationSeconds: 215 },
      { title: 'Riptide', description: 'A rival syndicate makes a move, and Naia is caught in the crossfire.', durationSeconds: 195 },
      { title: 'Pearl of Power', description: 'An ancient pearl surfaces that could give one merfolk control over all the oceans.', durationSeconds: 225 },
      { title: 'Ebb and Flow', description: 'Naia\'s loyalty is tested when she must choose between her badge and Kai.', durationSeconds: 210 },
      { title: 'The Trident', description: 'A weapon from the old wars is found, and every faction wants it.', durationSeconds: 220 },
      { title: 'High Tide', description: 'The rival syndicate launches an all-out attack on Kai\'s territory.', durationSeconds: 230 },
      { title: 'Deep End', description: 'Naia must descend to the deepest trench to settle the war—and discovers her own hidden heritage.', durationSeconds: 245 },
    ],
  },
  {
    title: 'Cursed Throne of Shadows',
    slug: 'cursed-throne-of-shadows',
    description:
      'A dethroned princess with shadow magic must reclaim her kingdom from the usurper who killed her family. But the throne itself is cursed, corrupting all who sit upon it.',
    genreTags: ['Dark Fantasy', 'Fae'],
    coverIndex: 8,
    seasonTitle: 'Season 1: Shadow\'s Rise',
    episodes: [
      { title: 'The Fall', description: 'Princess Isolde watches her kingdom burn from the safety of a hidden tunnel.', durationSeconds: 200 },
      { title: 'Shadow Born', description: 'In exile, Isolde\'s dormant shadow magic awakens in a terrifying display.', durationSeconds: 190 },
      { title: 'The Resistance', description: 'Isolde finds a ragtag group of rebels who still fight in her family\'s name.', durationSeconds: 210 },
      { title: 'Masks of Court', description: 'Disguised as a servant, Isolde infiltrates the usurper\'s court.', durationSeconds: 205 },
      { title: 'The Cursed Crown', description: 'Isolde discovers the throne is alive—and hungry—feeding on the blood of rulers.', durationSeconds: 220 },
      { title: 'Shadow Dance', description: 'Isolde masters her shadow magic in a sequence that rivals the greatest warriors.', durationSeconds: 215 },
      { title: 'The Usurper\'s Secret', description: 'The man who killed her family has his own tragic reason for taking the throne.', durationSeconds: 230 },
      { title: 'Blood and Bone', description: 'The curse spreads beyond the castle, turning the land itself dark.', durationSeconds: 200 },
      { title: 'The Siege', description: 'Isolde\'s rebel army storms the castle in a desperate final assault.', durationSeconds: 235 },
      { title: 'Throne of Shadows', description: 'Isolde faces the cursed throne and must decide: destroy it, or master it.', durationSeconds: 250 },
    ],
  },
  {
    title: 'Nightblood Academy',
    slug: 'nightblood-academy',
    description:
      'A supernatural boarding school where vampires, werewolves, and fae are forced to coexist. A human girl enrolled by mistake must survive the semester—or become prey.',
    genreTags: ['Vampire', 'Werewolf', 'Academy'],
    coverIndex: 9,
    seasonTitle: 'Season 1: Freshman Year',
    episodes: [
      { title: 'Enrollment Error', description: 'Maya Chen receives an acceptance letter from a school she never applied to.', durationSeconds: 185 },
      { title: 'First Night', description: 'Maya discovers her roommate sleeps in a coffin and her neighbor howls at the moon.', durationSeconds: 195 },
      { title: 'Blood Tests', description: 'The academy\'s entrance exam is literal—and Maya\'s blood type is dangerously rare.', durationSeconds: 210 },
      { title: 'The Houses', description: 'Students are sorted into Houses: Fang, Claw, Thorn, and—unexpectedly—Ember, for Maya alone.', durationSeconds: 200 },
      { title: 'Training Day', description: 'Maya must learn to fight supernatural creatures using only human ingenuity.', durationSeconds: 215 },
      { title: 'The Blood Ball', description: 'A formal dance where predators and prey mingle, and Maya catches dangerous attention.', durationSeconds: 225 },
      { title: 'Forbidden Wing', description: 'Maya breaks into the sealed wing and finds proof the academy has a dark purpose.', durationSeconds: 205 },
      { title: 'Pack vs. Coven', description: 'Tensions between werewolf and vampire students erupt into campus-wide conflict.', durationSeconds: 220 },
      { title: 'The Headmaster', description: 'The ancient being who runs the academy finally reveals why Maya was really brought there.', durationSeconds: 230 },
      { title: 'Final Exam', description: 'Maya must survive the deadliest test of all: a hunt where she\'s the prey.', durationSeconds: 245 },
    ],
  },
  {
    title: 'Siren\'s Debt',
    slug: 'sirens-debt',
    description:
      'A siren who lost her voice in a deal with a sea witch must retrieve it before the next lunar eclipse—or become mortal forever. A tale of sacrifice, song, and the ocean\'s darkest depths.',
    genreTags: ['Mermaid', 'Dark Fantasy'],
    coverIndex: 10,
    seasonTitle: 'Season 1: The Silent Song',
    episodes: [
      { title: 'Voice Stolen', description: 'Lorelei trades her legendary voice for a single wish—and instantly regrets it.', durationSeconds: 195 },
      { title: 'The Bargain', description: 'The sea witch reveals the true cost: Lorelei has thirty days, or she loses everything.', durationSeconds: 200 },
      { title: 'Legs and Lungs', description: 'Stranded on land, Lorelei must navigate the human world without her greatest weapon.', durationSeconds: 185 },
      { title: 'The Lighthouse Keeper', description: 'A lonely human helps Lorelei, not knowing what she truly is.', durationSeconds: 210 },
      { title: 'Echoes', description: 'Lorelei discovers fragments of her voice scattered across seven ocean caves.', durationSeconds: 205 },
      { title: 'The First Fragment', description: 'Retrieving the first piece of her voice awakens something ancient in the deep.', durationSeconds: 220 },
      { title: 'Tempest', description: 'A magical storm threatens the coast, and only Lorelei can calm it—but she has no voice.', durationSeconds: 215 },
      { title: 'The Sea Witch Returns', description: 'The sea witch sends her creatures to stop Lorelei from collecting the fragments.', durationSeconds: 225 },
      { title: 'Silent Scream', description: 'With three fragments remaining and five days left, Lorelei faces impossible odds.', durationSeconds: 210 },
      { title: 'The Final Note', description: 'The last fragment lies in the deepest trench. The eclipse is tomorrow.', durationSeconds: 250 },
    ],
  },
  {
    title: 'The Phoenix Reborn',
    slug: 'the-phoenix-reborn',
    description:
      'Every century, a phoenix is reborn in human form—but this time, the phoenix doesn\'t remember what it is. As ancient enemies close in, one woman must embrace the fire within or watch the world burn.',
    genreTags: ['Shifter', 'Dragon'],
    coverIndex: 11,
    seasonTitle: 'Season 1: Ignition',
    episodes: [
      { title: 'The Fire Dreams', description: 'Ash wakes from nightmares of burning alive—only to find scorch marks on her pillow.', durationSeconds: 190 },
      { title: 'Spark', description: 'A near-death experience triggers Ash\'s first transformation—in the middle of a crowded mall.', durationSeconds: 200 },
      { title: 'The Order of Ash', description: 'A secret society that has protected phoenixes for centuries finds Ash.', durationSeconds: 205 },
      { title: 'Fireproof', description: 'Ash begins training to control her powers, but each use brings her closer to full rebirth.', durationSeconds: 215 },
      { title: 'The Hunter', description: 'An ancient enemy who collects phoenix feathers for their power targets Ash.', durationSeconds: 210 },
      { title: 'Ember Heart', description: 'Ash falls for the Order\'s leader, knowing that her rebirth will erase her memories of him.', durationSeconds: 225 },
      { title: 'Ashes to Ashes', description: 'Ash dies for the first time—and rises from the flames, transformed.', durationSeconds: 200 },
      { title: 'The Flock', description: 'Other phoenixes reveal themselves, and not all of them are friendly.', durationSeconds: 220 },
      { title: 'Conflagration', description: 'The Hunter captures a phoenix and threatens to unravel the cycle of rebirth forever.', durationSeconds: 235 },
      { title: 'Reborn', description: 'Ash must embrace complete transformation to save everything—knowing she may never be the same.', durationSeconds: 250 },
    ],
  },
  {
    title: 'Venom & Vows',
    slug: 'venom-and-vows',
    description:
      'Two rival magical families have been at war for generations. When the heirs are forced into a magical marriage contract, their hatred is tested—because the vows are binding, and breaking them means death.',
    genreTags: ['Witch', 'Dark Fantasy'],
    coverIndex: 12,
    seasonTitle: 'Season 1: The Contract',
    episodes: [
      { title: 'The Vow', description: 'Arden Nightshade and Sable Thornwood are bound by a contract neither agreed to.', durationSeconds: 195 },
      { title: 'Poisoned Welcome', description: 'Sable arrives at the Nightshade estate—and her welcome drink is literally poisoned.', durationSeconds: 200 },
      { title: 'The Rules', description: 'The marriage contract has seventeen clauses, each one more dangerous than the last.', durationSeconds: 185 },
      { title: 'Garden of Thorns', description: 'The Thornwood family\'s greenhouse hides sentient plants that judge all who enter.', durationSeconds: 210 },
      { title: 'Venom Kiss', description: 'The contract requires physical proximity—and proximity breeds unexpected chemistry.', durationSeconds: 215 },
      { title: 'Family Secrets', description: 'Sable discovers the war began over something both families want to keep buried.', durationSeconds: 220 },
      { title: 'The Duel', description: 'A formal magical duel between the families threatens to shatter the fragile peace.', durationSeconds: 205 },
      { title: 'Roots and Ruin', description: 'An ancient curse tied to both bloodlines begins to surface, threatening everyone.', durationSeconds: 225 },
      { title: 'Breaking Point', description: 'Arden and Sable must work together or watch their families destroy each other.', durationSeconds: 210 },
      { title: 'Till Death', description: 'The contract demands its ultimate price—and only love can alter the terms.', durationSeconds: 245 },
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
      body: `# Lore & World of ${seriesTitle}\n\n## Setting\n\nThe story takes place in a world where the supernatural exists alongside the mundane, hidden from most mortals. Ancient pacts and magical boundaries keep the balance.\n\n## History\n\nCenturies ago, a great war between the magical factions nearly destroyed everything. The treaties that followed created an uneasy peace.\n\n## Magic System\n\nMagic follows the Law of Equivalence—every spell demands a price proportional to its power.\n\n## Key Locations\n\n- **The Stronghold** — The primary setting.\n- **The Borderlands** — A dangerous frontier between territories.\n- **The Ancient Ruins** — Remnants of the old world, holding forgotten power.\n`,
    },
    {
      slug: `${slug}-episode-guide`,
      title: `${seriesTitle} — Episode Guide`,
      tags: ['episodes', 'guide', 'recap'],
      taxonomyPath: `series/${slug}/episodes`,
      body: `# Episode Guide: ${seriesTitle}\n\n## Season 1 Overview\n\nThe first season establishes the core conflict and introduces the main characters. Episodes 1-5 set up the world and relationships, while episodes 6-10 escalate the stakes dramatically.\n\n## Key Moments\n\n| Episode | Highlight |\n|---------|----------|\n| 1 | Introduction and inciting incident |\n| 5 | The midpoint turning point |\n| 8 | The shocking betrayal |\n| 10 | Explosive season finale |\n`,
    },
    {
      slug: `${slug}-powers`,
      title: `${seriesTitle} — Powers & Abilities`,
      tags: ['powers', 'magic', 'abilities'],
      taxonomyPath: `series/${slug}/powers`,
      body: `# Powers & Abilities in ${seriesTitle}\n\n## Core Powers\n\n### The Bond\nThe central magical connection. It grants enhanced abilities but also creates vulnerability.\n\n### Elemental Magic\n- **Fire** — Offensive power, passion\n- **Shadow** — Stealth, illusion\n- **Nature** — Healing, growth\n- **Spirit** — Divination, psychic connection\n\n## Power Tiers\n\n1. **Latent** — Untrained, instinctual\n2. **Awakened** — Conscious control\n3. **Bonded** — Enhanced through partnership\n4. **Ascended** — Full mastery through sacrifice\n`,
    },
    {
      slug: `${slug}-theories`,
      title: `${seriesTitle} — Fan Theories`,
      tags: ['theories', 'speculation', 'community'],
      taxonomyPath: `series/${slug}/theories`,
      body: `# Fan Theories: ${seriesTitle}\n\n## Popular Theories\n\n### The Hidden Lineage Theory\nFans believe the protagonist has a secret heritage connecting them to the ancient rulers.\n\n### The Double Agent Theory\nOne of the supporting characters may have been working for the antagonist from the beginning.\n\n### The Prophecy Interpretation\nThe ancient prophecy may have a dual meaning.\n\n## Open Questions\n\n- What is the true origin of the bond?\n- Will the antagonist be redeemed?\n- What lies beyond the borders of the known world?\n`,
    },
  ];
}

// ─────────────────────────────────────────────
// COMMUNITY THREAD TEMPLATES (expanded)
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
        "I unlocked episode 6 and it only gets better. Trust me, it's worth the tokens.",
        'Same here! The world-building reminds me of some of the best fantasy I\'ve read.',
      ],
    },
    {
      title: `Episode 5 reaction — ${seriesTitle}`,
      body: `THAT ENDING. I did NOT see that coming. Without spoiling anything, let's just say episode 5 changes everything we thought we knew. Drop your reactions below!`,
      type: ThreadType.episode,
      replies: [
        'My jaw literally dropped. I had to rewatch the last two minutes three times.',
        'I called it back in episode 2! There were hints the whole time if you look carefully.',
        'I screamed. Literally screamed. My roommate thought something was wrong.',
      ],
    },
    {
      title: `Lore discussion: The magic system in ${seriesTitle}`,
      body: `Can we talk about how well thought out the magic system is? The way power comes at a cost feels so much more meaningful than typical fantasy fare. I've been trying to map out all the rules we've seen so far.`,
      type: ThreadType.series,
      replies: [
        'The cost mechanic is brilliant. It makes every spell feel meaningful and high-stakes.',
        'I noticed in episode 3 that the protagonist uses magic differently than everyone else. I think it\'s a hint about their true nature.',
        'Has anyone compiled a list of all the magic rules mentioned? I keep losing track.',
        'The parallel between the magic costs and the emotional costs the characters pay is *chef\'s kiss*.',
        'I love how the power system ties into the themes of sacrifice and what you\'re willing to give up for what you love.',
      ],
    },
    {
      title: `${seriesTitle} fan art and edits`,
      body: `Starting a thread for all the amazing fan art and edits I've been seeing! Post your favorites or your own creations here. This fandom is incredibly talented.`,
      type: ThreadType.series,
      replies: [
        'The edits on TikTok for this series are unreal. The one set to that haunting melody gave me chills.',
        'I wish I could draw! Some of the character art I\'ve seen is museum-worthy.',
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
  const nyxId = createdUsers['nyx_fangirl'];
  const ravenId = createdUsers['raven_author'];

  const allActiveUsers = [lunaId, darrenId, elenaId, kaiId, nyxId, ravenId];

  // ── Series, Seasons, Episodes ──────────────

  console.log('\nCreating series, seasons, and episodes...');
  const seriesRecords: Record<string, string> = {};
  const episodeRecords: Record<string, string[]> = {};

  for (const sd of SERIES_DATA) {
    const creatorId = sd.slug === 'cursed-throne-of-shadows' || sd.slug === 'the-phoenix-reborn' ? ravenId : elenaId;
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
        createdBy: creatorId,
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
            publishedAt: new Date(Date.now() - (sd.episodes.length - i) * 3 * 86400000),
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

  const entitlementPairs: { userId: string; seriesSlug: string; epIndices: number[] }[] = [
    { userId: lunaId, seriesSlug: 'bound-by-the-moon', epIndices: [5, 6, 7] },
    { userId: lunaId, seriesSlug: 'fangs-beneath-silk', epIndices: [5, 6] },
    { userId: kaiId, seriesSlug: 'the-spellbound-bride', epIndices: [5] },
    { userId: nyxId, seriesSlug: 'fangs-beneath-silk', epIndices: [5, 6, 7, 8, 9] },
    { userId: nyxId, seriesSlug: 'nightblood-academy', epIndices: [5, 6] },
    { userId: darrenId, seriesSlug: 'the-mermaid-mafia', epIndices: [5, 6, 7] },
  ];

  for (const pair of entitlementPairs) {
    const eps = episodeRecords[pair.seriesSlug] ?? [];
    const seriesId = seriesRecords[pair.seriesSlug];
    for (const idx of pair.epIndices) {
      if (!eps[idx]) continue;
      const idempKey = `seed-unlock-${pair.userId}-${eps[idx]}`;
      const exists = await prisma.tokenLedgerEntry.findUnique({
        where: { idempotencyKey: idempKey },
      });
      if (!exists) {
        const ledger = await prisma.tokenLedgerEntry.create({
          data: {
            userId: pair.userId,
            amount: -15n,
            balanceAfter: 500n,
            type: LedgerEntryType.unlock_debit,
            referenceId: eps[idx],
            idempotencyKey: idempKey,
            createdBy: pair.userId,
          },
        });
        await prisma.entitlement.create({
          data: {
            userId: pair.userId,
            type: EntitlementType.episode_unlock,
            seriesId,
            episodeId: eps[idx],
            ledgerEntryId: ledger.id,
          },
        });
      }
    }
  }

  const authorAccessPairs = [
    { userId: elenaId, seriesSlug: 'the-spellbound-bride' },
    { userId: elenaId, seriesSlug: 'the-devils-familiar' },
    { userId: ravenId, seriesSlug: 'cursed-throne-of-shadows' },
    { userId: ravenId, seriesSlug: 'the-phoenix-reborn' },
  ];

  for (const pair of authorAccessPairs) {
    const seriesId = seriesRecords[pair.seriesSlug];
    if (!seriesId) continue;
    const exists = await prisma.entitlement.findFirst({
      where: { userId: pair.userId, type: EntitlementType.author_access, seriesId },
    });
    if (!exists) {
      await prisma.entitlement.create({
        data: { userId: pair.userId, type: EntitlementType.author_access, seriesId },
      });
    }
  }
  console.log('  ✓ Entitlements and author access created');

  // ── Watchlist ──────────────────────────────

  console.log('\nCreating watchlist entries...');

  const watchlistPairs = [
    { userId: lunaId, slugs: ['bound-by-the-moon', 'fangs-beneath-silk', 'the-spellbound-bride', 'cursed-throne-of-shadows'] },
    { userId: kaiId, slugs: ['dragonheart-legacy', 'the-phoenix-reborn', 'nightblood-academy'] },
    { userId: nyxId, slugs: ['fangs-beneath-silk', 'nightblood-academy', 'venom-and-vows', 'the-devils-familiar', 'sirens-debt'] },
    { userId: darrenId, slugs: ['the-mermaid-mafia', 'a-werewolf-affair'] },
  ];

  for (const pair of watchlistPairs) {
    for (const slug of pair.slugs) {
      const seriesId = seriesRecords[slug];
      if (!seriesId) continue;
      await prisma.userWatchlist.upsert({
        where: { userId_seriesId: { userId: pair.userId, seriesId } },
        update: {},
        create: { userId: pair.userId, seriesId },
      });
    }
  }
  console.log('  ✓ Watchlist entries created');

  // ── Wiki Pages + Multiple Revisions ────────

  console.log('\nCreating wiki pages with revisions...');

  const wikiAuthors = [darrenId, elenaId, kaiId, nyxId, ravenId];

  for (const sd of SERIES_DATA) {
    const seriesId = seriesRecords[sd.slug];
    const pages = wikiContent(sd.title, sd.slug);
    const primaryAuthor = sd.slug === 'the-spellbound-bride' ? elenaId : darrenId;

    for (let pi = 0; pi < pages.length; pi++) {
      const page = pages[pi];
      let wikiPage = await prisma.wikiPage.findUnique({ where: { slug: page.slug } });

      if (!wikiPage) {
        wikiPage = await prisma.wikiPage.create({
          data: {
            slug: page.slug,
            title: page.title,
            seriesId,
            taxonomyPath: page.taxonomyPath,
            tags: page.tags,
            isPublished: true,
            createdBy: primaryAuthor,
          },
        });

        // v1: initial revision
        const rev1 = await prisma.wikiRevision.create({
          data: {
            pageId: wikiPage.id,
            body: page.body,
            authorId: primaryAuthor,
            status: WikiRevisionStatus.approved,
            reviewedBy: adminId,
            reviewedAt: new Date(Date.now() - 20 * 86400000),
            versionNum: 1,
          },
        });

        // v2: secondary edit from a different user
        const secondAuthor = wikiAuthors[(pi + 1) % wikiAuthors.length];
        const rev2 = await prisma.wikiRevision.create({
          data: {
            pageId: wikiPage.id,
            body: page.body + `\n\n---\n*Updated with additional details and corrections by the community.*\n`,
            authorId: secondAuthor,
            status: WikiRevisionStatus.approved,
            reviewedBy: darrenId,
            reviewedAt: new Date(Date.now() - 10 * 86400000),
            versionNum: 2,
          },
        });

        // v3: pending revision from another user (to show pending moderation)
        if (pi < 2) {
          const thirdAuthor = wikiAuthors[(pi + 3) % wikiAuthors.length];
          await prisma.wikiRevision.create({
            data: {
              pageId: wikiPage.id,
              body: page.body + `\n\n## New Section\nThis section adds fan-contributed lore details and expanded analysis.\n`,
              authorId: thirdAuthor,
              status: WikiRevisionStatus.pending,
              versionNum: 3,
            },
          });
        }

        await prisma.wikiPage.update({
          where: { id: wikiPage.id },
          data: { currentRevId: rev2.id },
        });
      }
    }
    console.log(`  ✓ ${sd.title} — 5 wiki pages with revisions`);
  }

  // ── Community Threads + Replies + Votes ────

  console.log('\nCreating community threads...');

  const threadAuthors = [lunaId, kaiId, darrenId, elenaId, nyxId, ravenId];
  const replyAuthors = [kaiId, darrenId, elenaId, lunaId, nyxId, ravenId];

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
        const daysAgo = Math.floor(Math.random() * 25) + 1;
        const thread = await prisma.thread.create({
          data: {
            type: tmpl.type,
            seriesId,
            episodeId: tmpl.type === ThreadType.episode && episodeRecords[sd.slug][4]
              ? episodeRecords[sd.slug][4]
              : null,
            authorId: threadAuthor,
            title: tmpl.title,
            body: tmpl.body,
            voteCount: tmpl.replies.length + Math.floor(Math.random() * 8) + 2,
            isPinned: ti === 0 && si < 3,
            createdAt: new Date(Date.now() - daysAgo * 86400000),
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
              voteCount: Math.floor(Math.random() * 8) + 1,
              createdAt: new Date(Date.now() - (daysAgo - 1) * 86400000 + ri * 3600000),
            },
          });
        }

        const voters = allActiveUsers.filter((v) => v !== threadAuthor);
        for (const voterId of voters.slice(0, 3)) {
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
    console.log(`  ✓ ${sd.title} — ${communityThreads(sd.title).length} threads`);
  }

  // ── Global / Cross-Series Threads ──────────

  console.log('\nCreating global community threads...');

  const globalThreads: ThreadTemplate[] = [
    {
      title: 'What series should I start with?',
      body: 'I just joined Fated and there are so many options! What do you all recommend for a first-time viewer who loves dark romance and supernatural drama?',
      type: ThreadType.global,
      replies: [
        'Bound by the Moon is the perfect entry point. Great world-building and the romance is chef\'s kiss.',
        'If you like vampires, Fangs Beneath Silk is hands down the best one. Lord Cassian is everything.',
        'Nightblood Academy if you want something fun and lighter! It has a little bit of everything.',
        'Cursed Throne of Shadows for the darker stuff. It\'s intense but SO worth it.',
        'Honestly start with The Mermaid Mafia—it\'s different from typical supernatural romance and totally underrated.',
      ],
    },
    {
      title: 'Unpopular opinions thread 🔥',
      body: 'Drop your most controversial takes about any series on Fated. I\'ll go first: I think the villains are more interesting than the love interests in most of these shows.',
      type: ThreadType.global,
      replies: [
        'The paywalled episodes are actually worth the tokens. Fight me.',
        'A Werewolf Affair has better writing than Bound by the Moon. There, I said it.',
        'The Spellbound Bride is overhyped. It\'s good but not THAT good.',
      ],
    },
  ];

  for (let gi = 0; gi < globalThreads.length; gi++) {
    const tmpl = globalThreads[gi];
    const existingThread = await prisma.thread.findFirst({
      where: { type: ThreadType.global, title: tmpl.title },
    });

    if (!existingThread) {
      const thread = await prisma.thread.create({
        data: {
          type: tmpl.type,
          authorId: allActiveUsers[gi % allActiveUsers.length],
          title: tmpl.title,
          body: tmpl.body,
          voteCount: tmpl.replies.length + 5,
          createdAt: new Date(Date.now() - (gi + 1) * 2 * 86400000),
        },
      });

      for (let ri = 0; ri < tmpl.replies.length; ri++) {
        const replyAuthorId = allActiveUsers[(gi + ri + 1) % allActiveUsers.length];
        await prisma.threadReply.create({
          data: {
            threadId: thread.id,
            authorId: replyAuthorId,
            body: tmpl.replies[ri],
            voteCount: Math.floor(Math.random() * 10) + 1,
          },
        });
      }
    }
  }
  console.log('  ✓ Global threads created');

  // ── Analytics Snapshots (30 days) ──────────

  console.log('\nCreating 30 days of analytics snapshots...');

  const slugs = SERIES_DATA.map((s) => s.slug);
  const now = new Date();

  for (let day = 30; day >= 0; day--) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);
    date.setHours(0, 0, 0, 0);

    // Platform-wide snapshot (seriesId = null)
    const platformExists = await prisma.analyticsDailySnapshot.findFirst({
      where: { date, seriesId: null },
    });
    if (!platformExists) {
      await prisma.analyticsDailySnapshot.create({
        data: {
          date,
          seriesId: null,
          newUsers: Math.floor(Math.random() * 30) + 5,
          totalViews: Math.floor(Math.random() * 500) + 200,
          totalWatchMinutes: BigInt(Math.floor(Math.random() * 3000) + 1000),
          tokensSold: BigInt(Math.floor(Math.random() * 2000) + 500),
          unlocks: Math.floor(Math.random() * 40) + 10,
          completionRate: Math.random() * 0.3 + 0.55,
        },
      });
    }

    // Per-series snapshots
    for (const slug of slugs) {
      const seriesId = seriesRecords[slug];
      if (!seriesId) continue;

      const exists = await prisma.analyticsDailySnapshot.findFirst({
        where: { date, seriesId },
      });
      if (!exists) {
        const popularity = slugs.indexOf(slug) < 5 ? 1.5 : 1.0;
        await prisma.analyticsDailySnapshot.create({
          data: {
            date,
            seriesId,
            newUsers: 0,
            totalViews: Math.floor((Math.random() * 80 + 20) * popularity),
            totalWatchMinutes: BigInt(Math.floor((Math.random() * 400 + 100) * popularity)),
            tokensSold: BigInt(Math.floor(Math.random() * 200 + 50)),
            unlocks: Math.floor(Math.random() * 8 + 1),
            completionRate: Math.random() * 0.3 + 0.5,
          },
        });
      }
    }
  }
  console.log('  ✓ 30 days of analytics snapshots (platform + per-series)');

  // ── Distribution Jobs ──────────────────────

  console.log('\nCreating distribution jobs...');

  const distFormats = [DistributionFormat.vertical_9_16, DistributionFormat.landscape_16_9, DistributionFormat.square_1_1];
  const distPlatforms = [DistributionPlatform.tiktok, DistributionPlatform.instagram, DistributionPlatform.youtube];
  const distStatuses = [DistributionJobStatus.completed, DistributionJobStatus.completed, DistributionJobStatus.processing, DistributionJobStatus.pending, DistributionJobStatus.failed];

  let distCount = 0;
  for (let i = 0; i < 8; i++) {
    const slugIdx = i % slugs.length;
    const eps = episodeRecords[slugs[slugIdx]];
    if (!eps || eps.length === 0) continue;
    const epId = eps[Math.floor(Math.random() * Math.min(5, eps.length))];
    const requesterId = i < 4 ? elenaId : ravenId;
    const status = distStatuses[i % distStatuses.length];

    const exists = await prisma.distributionJob.findFirst({
      where: { episodeId: epId, requestedBy: requesterId, targetPlatform: distPlatforms[i % distPlatforms.length] },
    });
    if (!exists) {
      await prisma.distributionJob.create({
        data: {
          episodeId: epId,
          requestedBy: requesterId,
          targetFormat: distFormats[i % distFormats.length],
          targetPlatform: distPlatforms[i % distPlatforms.length],
          status,
          aiCaption: status === DistributionJobStatus.completed ? `Check out this incredible moment from ${SERIES_DATA[slugIdx].title}! 🔥` : null,
          aiDescription: status === DistributionJobStatus.completed ? `A gripping clip from ${SERIES_DATA[slugIdx].title} that will leave you wanting more.` : null,
          aiTags: status === DistributionJobStatus.completed ? ['supernatural', 'romance', 'fantasy', 'fated', SERIES_DATA[slugIdx].genreTags[0].toLowerCase()] : [],
          outputGcsKey: status === DistributionJobStatus.completed ? `distribution/${slugs[slugIdx]}/ep${(i % 5) + 1}-clip.mp4` : null,
          errorMessage: status === DistributionJobStatus.failed ? 'Processing timeout: input asset too large for selected format' : null,
          completedAt: status === DistributionJobStatus.completed ? new Date(Date.now() - i * 86400000) : null,
          createdAt: new Date(Date.now() - (i + 2) * 86400000),
        },
      });
      distCount++;
    }
  }
  console.log(`  ✓ ${distCount} distribution jobs created`);

  // ── Abuse Reports ──────────────────────────

  console.log('\nCreating abuse reports...');

  const firstThread = await prisma.thread.findFirst({ orderBy: { createdAt: 'desc' } });
  const secondThread = await prisma.thread.findFirst({ orderBy: { createdAt: 'desc' }, skip: 1 });
  const thirdThread = await prisma.thread.findFirst({ orderBy: { createdAt: 'desc' }, skip: 5 });

  const abuseReports = [
    {
      reporterId: lunaId,
      targetType: ModerationTargetType.thread,
      targetId: firstThread?.id ?? '00000000-0000-0000-0000-000000000000',
      category: AbuseReportCategory.spam,
      description: 'This thread contains spam links to external sites.',
      status: AbuseReportStatus.open,
    },
    {
      reporterId: kaiId,
      targetType: ModerationTargetType.thread,
      targetId: secondThread?.id ?? '00000000-0000-0000-0000-000000000000',
      category: AbuseReportCategory.spoiler,
      description: 'Major spoilers for episode 10 without any warning. Ruined the ending for me.',
      status: AbuseReportStatus.under_review,
      assignedTo: darrenId,
    },
    {
      reporterId: nyxId,
      targetType: ModerationTargetType.thread,
      targetId: thirdThread?.id ?? '00000000-0000-0000-0000-000000000000',
      category: AbuseReportCategory.harassment,
      description: 'User is attacking other fans personally in the replies.',
      status: AbuseReportStatus.resolved_actioned,
      assignedTo: darrenId,
      resolvedBy: darrenId,
      resolvedAt: new Date(Date.now() - 2 * 86400000),
      resolution: 'Thread locked and warning issued to the author.',
    },
    {
      reporterId: elenaId,
      targetType: ModerationTargetType.user,
      targetId: createdUsers['shadow_banned'],
      category: AbuseReportCategory.spam,
      description: 'This account has been posting spam across multiple threads.',
      status: AbuseReportStatus.resolved_actioned,
      assignedTo: adminId,
      resolvedBy: adminId,
      resolvedAt: new Date(Date.now() - 5 * 86400000),
      resolution: 'User banned for repeated spam violations.',
    },
  ];

  for (const report of abuseReports) {
    const exists = await prisma.abuseReport.findFirst({
      where: { reporterId: report.reporterId, targetId: report.targetId, category: report.category },
    });
    if (!exists) {
      await prisma.abuseReport.create({ data: report as any });
    }
  }
  console.log(`  ✓ ${abuseReports.length} abuse reports created`);

  // ── Moderation Actions ─────────────────────

  console.log('\nCreating moderation actions...');

  const modActions = [
    {
      actorId: darrenId,
      targetType: ModerationTargetType.user,
      targetId: createdUsers['shadow_banned'],
      targetUserId: createdUsers['shadow_banned'],
      action: ModerationActionType.ban,
      reason: 'Repeated spam across multiple community threads.',
    },
    {
      actorId: darrenId,
      targetType: ModerationTargetType.thread,
      targetId: firstThread?.id ?? '00000000-0000-0000-0000-000000000000',
      action: ModerationActionType.lock,
      reason: 'Thread locked due to heated arguments.',
    },
    {
      actorId: adminId,
      targetType: ModerationTargetType.thread,
      targetId: secondThread?.id ?? '00000000-0000-0000-0000-000000000000',
      action: ModerationActionType.pin,
      reason: 'Pinning popular discussion thread.',
    },
    {
      actorId: darrenId,
      targetType: ModerationTargetType.user,
      targetId: kaiId,
      targetUserId: kaiId,
      action: ModerationActionType.warn,
      reason: 'Minor spoiler policy violation — first warning.',
    },
  ];

  for (const action of modActions) {
    const exists = await prisma.moderationAction.findFirst({
      where: { actorId: action.actorId, targetId: action.targetId, action: action.action },
    });
    if (!exists) {
      await prisma.moderationAction.create({ data: action as any });
    }
  }
  console.log(`  ✓ ${modActions.length} moderation actions created`);

  // ── Done ───────────────────────────────────

  console.log('\n─────────────────────────────────');
  console.log('Seed complete!');
  console.log('─────────────────────────────────');
  console.log(`\n${SERIES_DATA.length} series × 10 episodes each = ${SERIES_DATA.length * 10} episodes`);
  console.log('30 days of analytics snapshots');
  console.log(`${SERIES_DATA.length * 5} wiki pages with multiple revisions`);
  console.log(`${SERIES_DATA.length * 4 + globalThreads.length} community threads with replies`);
  console.log('\nSample login credentials:');
  console.log('  Admin:       admin@fatedworld.com  /  superadmin-change-me-immediately');
  console.log('  Reader:      luna@example.com       /  Luna2026!');
  console.log('  Moderator:   darren@example.com     /  Darren2026!');
  console.log('  Author:      elena@example.com      /  Elena2026!');
  console.log('  Author #2:   raven@example.com      /  Raven2026!');
  console.log('  Newbie:      kai@example.com         /  Kai2026!');
  console.log('  Fan:         nyx@example.com         /  Nyx2026!');
  console.log('  Banned:      shadow@example.com      /  Shadow2026!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
