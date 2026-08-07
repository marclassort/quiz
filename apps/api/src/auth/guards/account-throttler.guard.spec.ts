import { Reflector } from '@nestjs/core';

import { AccountThrottlerGuard } from './account-throttler.guard';

interface GetTrackerAccessor {
  getTracker(req: Record<string, unknown>): Promise<string>;
}

describe('AccountThrottlerGuard', () => {
  const guard = new AccountThrottlerGuard(new Reflector(), {
    increment: jest.fn(),
  } as never);
  const { getTracker } = guard as unknown as GetTrackerAccessor;

  it("dérive la clé de suivi depuis l'email en minuscules", async () => {
    const tracker = await getTracker.call(guard, { body: { email: 'Napoleon@Example.com' } });
    expect(tracker).toBe('napoleon@example.com');
  });

  it("retombe sur 'unknown' si aucun email n'est présent", async () => {
    const tracker = await getTracker.call(guard, { body: {} });
    expect(tracker).toBe('unknown');
  });
});
