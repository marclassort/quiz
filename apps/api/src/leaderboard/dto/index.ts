import { createZodDto } from 'nestjs-zod';
import { leaderboardQuerySchema } from '@quiz/shared';

export class LeaderboardQueryDto extends createZodDto(leaderboardQuerySchema) {}
