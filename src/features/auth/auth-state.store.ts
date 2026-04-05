import { CacheService } from 'src/infrastructure/cache/cache.service';
import { randomBytes } from 'crypto';

const STATE_TTL_SECONDS = 600; // 10 minutes — matches guide requirement
const STATE_KEY_PREFIX = 'oauth:state:';

// passport-github2 calls these methods during the OAuth flow.
// We implement a store that persists state in Redis instead of the session.
export class RedisOAuthStateStore {
  constructor(private readonly cacheService: CacheService) {}

  // Called before redirecting to GitHub — generate and persist a state token
  async store(_req: any, callback: (err: any, state: string) => void): Promise<void> {
    try {
      // 32 bytes of random hex = 64-char state token — cryptographically secure
      const state = randomBytes(32).toString('hex');
      await this.cacheService.set(`${STATE_KEY_PREFIX}${state}`, 'valid', STATE_TTL_SECONDS);
      callback(null, state);
    } catch (err) {
      callback(err, '');
    }
  }

  // Called on callback — verify the state exists and delete it (one-time use)
  async verify(
    _req: any,
    providedState: string,
    callback: (err: any, ok: boolean, state?: any) => void,
  ): Promise<void> {
    try {
      const key = `${STATE_KEY_PREFIX}${providedState}`;
      const value = await this.cacheService.get<string>(key);

      if (!value) {
        // State missing or expired — reject the callback (CSRF attempt or stale link)
        callback(null, false, { message: 'Invalid or expired OAuth state' });
        return;
      }

      // Delete immediately — state tokens are single-use
      await this.cacheService.del(key);
      callback(null, true);
    } catch (err) {
      callback(err, false);
    }
  }
}