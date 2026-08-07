import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client';
import type { PrismaService } from '../src/prisma/prisma.service';
import { UserStatsService } from '../src/user-stats/user-stats.service';

/**
 * claude.md §6.4 : "prévoir une commande CLI de recalcul complet
 * (`pnpm --filter api stats:rebuild`) pour réparer une dérive." Recalcule
 * UserStats pour tous les utilisateurs ayant au moins un Attempt comptabilisé,
 * en réutilisant exactement la même logique que la mise à jour normale
 * (UserStatsService.recomputeForUser) — pas de code dupliqué qui pourrait
 * diverger.
 */
async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const userStatsService = new UserStatsService(prisma as unknown as PrismaService);

  const userIds = await prisma.attempt.findMany({
    where: { countsForRanking: true, finishedAt: { not: null }, userId: { not: null } },
    distinct: ['userId'],
    select: { userId: true },
  });

  console.log(`Recalcul de UserStats pour ${userIds.length} utilisateur(s)...`);

  for (const { userId } of userIds) {
    if (userId) {
      await userStatsService.recomputeForUser(userId);
    }
  }

  console.log('Recalcul terminé.');
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
