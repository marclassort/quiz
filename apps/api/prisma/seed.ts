import 'dotenv/config';

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { PrismaPg } from '@prisma/adapter-pg';

import { Prisma, PrismaClient } from '../src/generated/prisma/client';

/**
 * Seed napoléonien (claude.md §10) : contenu de démonstration, `status =
 * DRAFT` partout, rien n'est publié sans relecture humaine. Chaque question
 * porte une source vérifiable (voir SEED_NOTES.md pour les nuances
 * historiques signalées). Aucune question n'a été rédigée de mémoire seule :
 * chaque fait a été vérifié via une recherche web au moment de l'écriture de
 * ce script.
 */

interface SeedChoice {
  label: string;
  isCorrect: boolean;
}

interface SeedQuestion {
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'FREE_TEXT';
  statement: string;
  explanation: string;
  source: string;
  points: number;
  choices?: SeedChoice[];
  acceptedAnswers?: { value: string; isPrimary: boolean }[];
}

const battlesQuiz: SeedQuestion[] = [
  {
    type: 'SINGLE_CHOICE',
    statement:
      'En quelle année a eu lieu la bataille de Marengo, qui consacre la victoire de Bonaparte sur l’Autriche en Italie ?',
    explanation:
      'La bataille de Marengo s’est déroulée le 14 juin 1800 ; la victoire française contraint l’Autriche à négocier et assure le contrôle du nord de l’Italie.',
    source: 'Wikipédia FR, « Bataille de Marengo » (consulté le 07/08/2026)',
    points: 1,
    choices: [
      { label: '1798', isCorrect: false },
      { label: '1800', isCorrect: true },
      { label: '1802', isCorrect: false },
      { label: '1805', isCorrect: false },
    ],
  },
  {
    type: 'FREE_TEXT',
    statement:
      'Quel surnom porte la bataille d’Austerlitz, en raison de la présence sur le champ de bataille de Napoléon, de l’empereur d’Autriche François Ier et du tsar Alexandre Ier ?',
    explanation:
      'Livrée le 2 décembre 1805, Austerlitz doit ce surnom à la présence des trois souverains sur le champ de bataille ; la victoire française entraîne la dissolution de la Troisième Coalition.',
    source: 'Wikipédia FR, « Bataille d’Austerlitz » (consulté le 07/08/2026)',
    points: 1,
    acceptedAnswers: [
      { value: 'la bataille des Trois Empereurs', isPrimary: true },
      { value: 'bataille des Trois Empereurs', isPrimary: false },
      { value: 'les Trois Empereurs', isPrimary: false },
    ],
  },
  {
    type: 'TRUE_FALSE',
    statement:
      'Vrai ou faux : la bataille de Trafalgar (21 octobre 1805) s’est soldée par une victoire navale française.',
    explanation:
      'Trafalgar est une défaite décisive de la flotte franco-espagnole face à la Royal Navy commandée par l’amiral Nelson, qui meurt pendant la bataille.',
    source: 'Wikipédia FR, « Bataille de Trafalgar » (consulté le 07/08/2026)',
    points: 1,
    choices: [
      { label: 'Vrai', isCorrect: false },
      { label: 'Faux', isCorrect: true },
    ],
  },
  {
    type: 'SINGLE_CHOICE',
    statement:
      'Contre quelle puissance Napoléon remporte-t-il la bataille d’Iéna le 14 octobre 1806 ?',
    explanation:
      'La victoire d’Iéna, le 14 octobre 1806, entraîne l’effondrement rapide de la puissance militaire prussienne et l’occupation de Berlin.',
    source: 'Wikipédia FR, « Bataille d’Iéna » (consulté le 07/08/2026)',
    points: 1,
    choices: [
      { label: 'L’Autriche', isCorrect: false },
      { label: 'La Prusse', isCorrect: true },
      { label: 'La Russie', isCorrect: false },
      { label: 'L’Espagne', isCorrect: false },
    ],
  },
  {
    type: 'MULTIPLE_CHOICE',
    statement:
      'Lesquels de ces souverains ont signé un traité avec Napoléon à Tilsit en juillet 1807 ? (plusieurs réponses possibles)',
    explanation:
      'Deux traités sont signés à Tilsit : le premier avec le tsar Alexandre Ier (7 juillet 1807), le second avec le roi de Prusse Frédéric-Guillaume III (9 juillet 1807). L’Autriche et le Royaume-Uni n’étaient pas signataires.',
    source: 'Wikipédia FR, « Traités de Tilsit » (consulté le 07/08/2026)',
    points: 2,
    choices: [
      { label: 'Alexandre Ier de Russie', isCorrect: true },
      { label: 'Frédéric-Guillaume III de Prusse', isCorrect: true },
      { label: 'François Ier d’Autriche', isCorrect: false },
      { label: 'George III du Royaume-Uni', isCorrect: false },
    ],
  },
  {
    type: 'SINGLE_CHOICE',
    statement:
      'En quelle année se déroule la bataille de Wagram, victoire décisive de Napoléon contre l’Autriche ?',
    explanation:
      'Livrée les 5 et 6 juillet 1809, Wagram met fin à la guerre de la Cinquième Coalition et débouche sur le traité de Schönbrunn.',
    source: 'Wikipédia FR, « Bataille de Wagram » (consulté le 07/08/2026)',
    points: 1,
    choices: [
      { label: '1807', isCorrect: false },
      { label: '1809', isCorrect: true },
      { label: '1812', isCorrect: false },
      { label: '1813', isCorrect: false },
    ],
  },
  {
    type: 'FREE_TEXT',
    statement:
      'Quel est le nom de la bataille livrée le 7 septembre 1812 durant la campagne de Russie, connue aussi sous le nom de bataille de Borodino ?',
    explanation:
      'La bataille de la Moskova (ou Borodino), le 7 septembre 1812, est une victoire tactique française qui ouvre la route de Moscou, mais reste l’une des journées les plus meurtrières des guerres napoléoniennes.',
    source: 'Wikipédia FR, « Bataille de la Moskova » (consulté le 07/08/2026)',
    points: 1,
    acceptedAnswers: [
      { value: 'la Moskova', isPrimary: true },
      { value: 'bataille de la Moskova', isPrimary: false },
      { value: 'Moskova', isPrimary: false },
      { value: 'Borodino', isPrimary: false },
      { value: 'bataille de Borodino', isPrimary: false },
    ],
  },
  {
    type: 'SINGLE_CHOICE',
    statement:
      'Quel autre nom porte la bataille de Leipzig (16-19 octobre 1813), en raison du nombre de nations impliquées ?',
    explanation:
      'Surnommée la Bataille des Nations, Leipzig voit la défaite de Napoléon face à la Sixième Coalition (Russie, Prusse, Autriche, Suède), le contraignant à se replier vers la France.',
    source: 'Wikipédia FR, « Bataille de Leipzig (1813) » (consulté le 07/08/2026)',
    points: 1,
    choices: [
      { label: 'La Bataille des Rois', isCorrect: false },
      { label: 'La Bataille des Nations', isCorrect: true },
      { label: 'La Bataille des Peuples', isCorrect: false },
      { label: 'La Bataille des Géants', isCorrect: false },
    ],
  },
  {
    type: 'TRUE_FALSE',
    statement:
      'Vrai ou faux : à Waterloo, le 18 juin 1815, Napoléon affronte notamment les troupes du duc de Wellington et du maréchal prussien Blücher.',
    explanation:
      'La défaite de Waterloo, le 18 juin 1815, marque la fin définitive du règne de Napoléon et clôt la période des Cent-Jours.',
    source: 'Wikipédia FR, « Bataille de Waterloo » (consulté le 07/08/2026)',
    points: 1,
    choices: [
      { label: 'Vrai', isCorrect: true },
      { label: 'Faux', isCorrect: false },
    ],
  },
  {
    type: 'MULTIPLE_CHOICE',
    statement:
      'Parmi ces batailles, lesquelles sont des victoires françaises ? (plusieurs réponses possibles)',
    explanation:
      'Marengo (1800) et Austerlitz (1805) sont des victoires françaises décisives ; Trafalgar (1805) et Leipzig (1813) sont des défaites françaises.',
    source:
      'Wikipédia FR : « Bataille de Marengo », « Bataille d’Austerlitz », « Bataille de Trafalgar », « Bataille de Leipzig (1813) » (consultés le 07/08/2026)',
    points: 2,
    choices: [
      { label: 'Marengo', isCorrect: true },
      { label: 'Austerlitz', isCorrect: true },
      { label: 'Trafalgar', isCorrect: false },
      { label: 'Leipzig', isCorrect: false },
    ],
  },
];

const institutionsQuiz: SeedQuestion[] = [
  {
    type: 'FREE_TEXT',
    statement:
      'Quel événement du 9 novembre 1799 (18 Brumaire an VIII) porte Napoléon Bonaparte au pouvoir en tant que Premier Consul ?',
    explanation:
      'Le coup d’État du 18 Brumaire (9 novembre 1799) renverse le Directoire et installe le Consulat, avec Bonaparte comme Premier Consul.',
    source:
      'Wikipédia FR, « Chronologie de la France sous le Consulat et le Premier Empire » (consulté le 07/08/2026)',
    points: 1,
    acceptedAnswers: [
      { value: 'le coup d’État du 18 Brumaire', isPrimary: true },
      { value: 'coup d’État du 18 Brumaire', isPrimary: false },
      { value: 'le 18 Brumaire', isPrimary: false },
      { value: '18 Brumaire', isPrimary: false },
    ],
  },
  {
    type: 'SINGLE_CHOICE',
    statement: 'En quelle année la Banque de France est-elle fondée à l’initiative de Bonaparte ?',
    explanation:
      'La Banque de France est créée en 1800 sous le Consulat. Les sources consultées divergent sur le jour exact de fondation (voir SEED_NOTES.md) ; l’année 1800 est en revanche unanime.',
    source: 'Wikipédia FR, « Banque de France » (consulté le 07/08/2026)',
    points: 1,
    choices: [
      { label: '1799', isCorrect: false },
      { label: '1800', isCorrect: true },
      { label: '1802', isCorrect: false },
      { label: '1804', isCorrect: false },
    ],
  },
  {
    type: 'SINGLE_CHOICE',
    statement:
      'Avec quelle autorité Bonaparte signe-t-il le Concordat le 15 juillet 1801, réglant les relations entre la France et l’Église catholique ?',
    explanation:
      'Le Concordat de 1801, signé avec le pape Pie VII, rétablit le culte catholique en France tout en le plaçant sous contrôle de l’État.',
    source:
      'Wikipédia FR, « Chronologie de la France sous le Consulat et le Premier Empire » (consulté le 07/08/2026)',
    points: 1,
    choices: [
      { label: 'Le pape Pie VII', isCorrect: true },
      { label: 'L’empereur d’Autriche', isCorrect: false },
      { label: 'Le roi d’Espagne', isCorrect: false },
      { label: 'Le patriarche de Moscou', isCorrect: false },
    ],
  },
  {
    type: 'TRUE_FALSE',
    statement:
      'Vrai ou faux : la Légion d’honneur, créée en 1802, est réservée aux seuls militaires.',
    explanation:
      'Instituée le 19 mai 1802 par Bonaparte, alors Premier Consul, la Légion d’honneur récompense aussi bien les mérites civils que militaires, ouverte à tous les citoyens.',
    source: 'Wikipédia FR, « Légion d’honneur » (consulté le 07/08/2026)',
    points: 1,
    choices: [
      { label: 'Vrai', isCorrect: false },
      { label: 'Faux', isCorrect: true },
    ],
  },
  {
    type: 'SINGLE_CHOICE',
    statement:
      'Quel texte de loi fondamental, encore en usage aujourd’hui sous une forme modifiée, est promulgué le 21 mars 1804 ?',
    explanation:
      'Le Code civil des Français, promulgué le 21 mars 1804, deviendra plus tard connu sous le nom de Code Napoléon et influencera de nombreux systèmes juridiques dans le monde.',
    source: 'Wikipédia FR, « Code civil des Français » (consulté le 07/08/2026)',
    points: 1,
    choices: [
      { label: 'La Constitution de l’an VIII', isCorrect: false },
      { label: 'Le Code civil des Français', isCorrect: true },
      { label: 'Le Concordat', isCorrect: false },
      { label: 'Le Code pénal', isCorrect: false },
    ],
  },
  {
    type: 'FREE_TEXT',
    statement:
      'Quel est le titre officiel exact adopté par Napoléon Bonaparte à partir du sénatus-consulte du 18 mai 1804 ?',
    explanation:
      'Le titre officiel est « Empereur des Français », et non « Empereur de France » : une nuance voulue par le sénatus-consulte du 18 mai 1804, fondant l’Empire sur la nation plutôt que sur le territoire.',
    source: 'Wikipédia FR, « Empereur des Français » (consulté le 07/08/2026)',
    points: 2,
    acceptedAnswers: [{ value: 'Empereur des Français', isPrimary: true }],
  },
  {
    type: 'SINGLE_CHOICE',
    statement: 'Dans quelle cathédrale Napoléon est-il sacré empereur le 2 décembre 1804 ?',
    explanation:
      'Le sacre a lieu à Notre-Dame de Paris, en présence du pape Pie VII ; contrairement à la tradition, Napoléon se couronne lui-même.',
    source: 'Wikipédia FR, « Sacre de Napoléon Ier » (consulté le 07/08/2026)',
    points: 1,
    choices: [
      { label: 'La cathédrale de Reims', isCorrect: false },
      { label: 'La basilique Saint-Denis', isCorrect: false },
      { label: 'La cathédrale Notre-Dame de Paris', isCorrect: true },
      { label: 'La Sainte-Chapelle', isCorrect: false },
    ],
  },
  {
    type: 'SINGLE_CHOICE',
    statement:
      'En quelle année Napoléon abdique-t-il une première fois, avant son exil à l’île d’Elbe ?',
    explanation:
      'Napoléon abdique le 6 avril 1814 (après une première abdication conditionnelle le 4 avril, rejetée par les Alliés — voir SEED_NOTES.md) et part en exil à l’île d’Elbe, avant de revenir en France en mars 1815 pour la période des Cent-Jours.',
    source: 'Wikipédia FR, « Napoléon Ier » (consulté le 07/08/2026)',
    points: 1,
    choices: [
      { label: '1812', isCorrect: false },
      { label: '1813', isCorrect: false },
      { label: '1814', isCorrect: true },
      { label: '1815', isCorrect: false },
    ],
  },
  {
    type: 'FREE_TEXT',
    statement:
      'Comment appelle-t-on la période de mars à juin 1815, durant laquelle Napoléon revient au pouvoir après son évasion de l’île d’Elbe ?',
    explanation:
      'Napoléon reprend le pouvoir le 20 mars 1815 et le conserve jusqu’à sa défaite à Waterloo (18 juin 1815) et sa seconde abdication (22 juin 1815) : cette période est appelée les Cent-Jours.',
    source: 'Wikipédia FR, « Napoléon Ier » (consulté le 07/08/2026)',
    points: 1,
    acceptedAnswers: [
      { value: 'les Cent-Jours', isPrimary: true },
      { value: 'Cent-Jours', isPrimary: false },
      { value: 'les cent jours', isPrimary: false },
    ],
  },
  {
    type: 'SINGLE_CHOICE',
    statement: 'En quelle année meurt Napoléon en exil à Sainte-Hélène ?',
    explanation:
      'Napoléon meurt le 5 mai 1821 à Longwood, sur l’île de Sainte-Hélène, où il était exilé sous la garde des Britanniques depuis sa seconde abdication.',
    source: 'Wikipédia FR, « Napoléon Ier » (consulté le 07/08/2026)',
    points: 1,
    choices: [
      { label: '1815', isCorrect: false },
      { label: '1818', isCorrect: false },
      { label: '1821', isCorrect: true },
      { label: '1825', isCorrect: false },
    ],
  },
];

/**
 * Quiz de démonstration cartographique (lot 3, étape 6) : « Capitales
 * d'Europe », DRAFT, sourcé. Réutilise le dataset world-countries déjà
 * importé (pnpm geo:import, étape 2) — ni MAP_CLICK ni MAP_PLACE n'ont
 * besoin d'un dataset de points dédié : le centroïde d'une feature suffit
 * de candidat clavier pour MAP_PLACE (voir ADR 001 / plan étape 5). Les
 * capitales sont des faits constitutionnels établis et non controversés,
 * pas des questions d'histoire au sens de claude.md §4 — mais chaque
 * question porte tout de même une source, par discipline.
 */
interface SeedGeoQuestion {
  type: 'MAP_CLICK' | 'MAP_PLACE';
  statement: string;
  explanation: string;
  source: string;
  points: number;
  payload: Record<string, unknown>;
}

function europeanCapitalsQuiz(datasetId: string, datasetVersion: string): SeedGeoQuestion[] {
  const source = 'Capitale constitutionnelle de l’État concerné (fait géographique établi).';

  return [
    {
      type: 'MAP_CLICK',
      statement: 'Cliquez sur le pays dont la capitale est Berlin.',
      explanation: 'Berlin est la capitale de l’Allemagne depuis la réunification de 1990.',
      source,
      points: 1,
      payload: {
        datasetId,
        datasetVersion,
        featureIds: ['DEU'],
        prompt: 'Sélectionnez le pays sur la carte ou dans la liste.',
        distractorPolicy: 'ALL_FEATURES',
      },
    },
    {
      type: 'MAP_PLACE',
      statement: 'Placez Paris, capitale de la France.',
      explanation: 'Paris est la capitale de la France.',
      source,
      points: 10,
      payload: {
        datasetId,
        datasetVersion,
        targetLat: 48.8566,
        targetLng: 2.3522,
        toleranceKm: 300,
        scoringCurve: 'LINEAR',
      },
    },
    {
      type: 'MAP_CLICK',
      statement: 'Cliquez sur le pays dont la capitale est Madrid.',
      explanation: 'Madrid est la capitale de l’Espagne.',
      source,
      points: 1,
      payload: {
        datasetId,
        datasetVersion,
        featureIds: ['ESP'],
        prompt: 'Sélectionnez le pays sur la carte ou dans la liste.',
        distractorPolicy: 'ALL_FEATURES',
      },
    },
    {
      type: 'MAP_PLACE',
      statement: 'Placez Rome, capitale de l’Italie.',
      explanation: 'Rome est la capitale de l’Italie.',
      source,
      points: 10,
      payload: {
        datasetId,
        datasetVersion,
        targetLat: 41.9028,
        targetLng: 12.4964,
        toleranceKm: 300,
        scoringCurve: 'LINEAR',
      },
    },
    {
      type: 'MAP_CLICK',
      statement: 'Cliquez sur le pays dont la capitale est Varsovie.',
      explanation: 'Varsovie est la capitale de la Pologne.',
      source,
      points: 1,
      payload: {
        datasetId,
        datasetVersion,
        featureIds: ['POL'],
        prompt: 'Sélectionnez le pays sur la carte ou dans la liste.',
        distractorPolicy: 'ALL_FEATURES',
      },
    },
    {
      type: 'MAP_PLACE',
      statement: 'Placez Athènes, capitale de la Grèce.',
      explanation: 'Athènes est la capitale de la Grèce.',
      source,
      points: 10,
      payload: {
        datasetId,
        datasetVersion,
        targetLat: 37.9838,
        targetLng: 23.7275,
        toleranceKm: 300,
        scoringCurve: 'LINEAR',
      },
    },
  ];
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const themeSlug = 'periode-napoleonienne';
  const quizSlugs = ['grandes-batailles-napoleoniennes', 'institutions-dates-cles-empire'];

  // Reseed idempotent : on repart d'une table rase pour ce thème (cascade
  // Quiz -> Question -> Choice/AcceptedAnswer déjà en place, cf. lot 5).
  await prisma.quiz.deleteMany({ where: { slug: { in: quizSlugs } } });
  await prisma.theme.deleteMany({ where: { slug: themeSlug } });

  const theme = await prisma.theme.create({
    data: {
      slug: themeSlug,
      name: 'Période napoléonienne',
      description: 'Le Consulat et le Premier Empire, 1799-1815.',
      position: 1,
    },
  });

  async function createQuiz(
    slug: string,
    title: string,
    description: string,
    difficulty: 'EASY' | 'MEDIUM' | 'HARD',
    questions: SeedQuestion[],
  ) {
    const quiz = await prisma.quiz.create({
      data: {
        themeId: theme.id,
        slug,
        title,
        description,
        difficulty,
        status: 'DRAFT',
        questionCount: questions.length,
      },
    });

    for (const [index, question] of questions.entries()) {
      await prisma.question.create({
        data: {
          quizId: quiz.id,
          position: index + 1,
          type: question.type,
          statement: question.statement,
          explanation: question.explanation,
          source: question.source,
          points: question.points,
          choices: question.choices
            ? {
                create: question.choices.map((choice, choiceIndex) => ({
                  position: choiceIndex + 1,
                  label: choice.label,
                  isCorrect: choice.isCorrect,
                })),
              }
            : undefined,
          acceptedAnswers: question.acceptedAnswers
            ? { create: question.acceptedAnswers }
            : undefined,
        },
      });
    }

    return quiz;
  }

  await createQuiz(
    quizSlugs[0]!,
    'Les grandes batailles napoléoniennes',
    'De Marengo à Waterloo : les batailles majeures du Consulat et de l’Empire.',
    'EASY',
    battlesQuiz,
  );

  await createQuiz(
    quizSlugs[1]!,
    'Institutions et dates clés de l’Empire',
    'Du 18 Brumaire à Sainte-Hélène : les grandes dates institutionnelles et politiques.',
    'MEDIUM',
    institutionsQuiz,
  );

  // --- Géographie cartographique (lot 3, étape 6) ---

  const geoThemeSlug = 'geographie-cartographique';
  const geoQuizSlug = 'capitales-europe';

  await prisma.quiz.deleteMany({ where: { slug: geoQuizSlug } });
  await prisma.theme.deleteMany({ where: { slug: geoThemeSlug } });

  // Enregistre le GeoDataset importé par `pnpm geo:import` (étape 2) à
  // partir des métadonnées écrites à côté du TopoJSON — la table n'existe
  // qu'en base, le fichier meta.json en est la source de vérité (ADR 001).
  const metaPath = path.resolve(
    __dirname,
    '../../web/public/geo/world-countries/v1.meta.json',
  );
  const datasetMeta = JSON.parse(readFileSync(metaPath, 'utf-8')) as {
    slug: string;
    name: string;
    kind: 'COUNTRY' | 'CAPITAL' | 'CITY' | 'RIVER' | 'LAKE' | 'ADMIN_FR' | 'OTHER';
    scope: string;
    sourceName: string;
    sourceUrl: string;
    license: string;
    attributionText: string;
    version: string;
  };
  const dataset = await prisma.geoDataset.upsert({
    where: { slug: datasetMeta.slug },
    create: datasetMeta,
    update: datasetMeta,
  });

  const geoTheme = await prisma.theme.create({
    data: {
      slug: geoThemeSlug,
      name: 'Géographie cartographique',
      description: 'Cartes, frontières et capitales — second corpus du projet (claude.md §1).',
      position: 2,
    },
  });

  const geoQuestions = europeanCapitalsQuiz(dataset.id, dataset.version);
  const geoQuiz = await prisma.quiz.create({
    data: {
      themeId: geoTheme.id,
      slug: geoQuizSlug,
      title: 'Capitales d’Europe',
      description: 'Cliquez et placez les capitales de quelques pays européens sur la carte.',
      difficulty: 'EASY',
      gameMode: 'GEO',
      status: 'DRAFT',
      questionCount: geoQuestions.length,
    },
  });

  for (const [index, question] of geoQuestions.entries()) {
    await prisma.question.create({
      data: {
        quizId: geoQuiz.id,
        position: index + 1,
        type: question.type,
        statement: question.statement,
        explanation: question.explanation,
        source: question.source,
        points: question.points,
        payload: question.payload as Prisma.InputJsonValue,
      },
    });
  }

  const totalQuestions = battlesQuiz.length + institutionsQuiz.length;
  console.log(
    `Seed napoléonien : thème "${theme.name}" + 2 quiz DRAFT + ${totalQuestions} questions.`,
  );
  console.log(
    `Seed géographique : dataset "${dataset.slug}" (${dataset.version}) + thème "${geoTheme.name}" + 1 quiz DRAFT + ${geoQuestions.length} questions.`,
  );

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
