import Redis from 'ioredis';
import { env } from '../config/env';

export const SEAT_LOCK_TTL_SECONDS = 5 * 60;

export interface SeatLock {
  userId: string;
  expiresAt: number; // epoch ms
}

interface SeatLockStore {
  /** Returns the lock on success, or null if another user holds it. Re-acquiring your own lock extends it. */
  acquire(flightId: string, seatId: string, userId: string): Promise<SeatLock | null>;
  /** Returns true if released, false if the lock is not held by this user. */
  release(flightId: string, seatId: string, userId: string): Promise<boolean>;
  getAllForFlight(flightId: string): Promise<Map<string, SeatLock>>;
}

const key = (flightId: string, seatId: string) => `seatlock:${flightId}:${seatId}`;

class MemoryLockStore implements SeatLockStore {
  private locks = new Map<string, SeatLock>();

  private prune() {
    const now = Date.now();
    for (const [k, lock] of this.locks) {
      if (lock.expiresAt <= now) this.locks.delete(k);
    }
  }

  async acquire(flightId: string, seatId: string, userId: string) {
    this.prune();
    const k = key(flightId, seatId);
    const existing = this.locks.get(k);
    if (existing && existing.userId !== userId) return null;
    const lock = { userId, expiresAt: Date.now() + SEAT_LOCK_TTL_SECONDS * 1000 };
    this.locks.set(k, lock);
    return lock;
  }

  async release(flightId: string, seatId: string, userId: string) {
    this.prune();
    const k = key(flightId, seatId);
    const existing = this.locks.get(k);
    if (!existing || existing.userId !== userId) return false;
    this.locks.delete(k);
    return true;
  }

  async getAllForFlight(flightId: string) {
    this.prune();
    const result = new Map<string, SeatLock>();
    const prefix = `seatlock:${flightId}:`;
    for (const [k, lock] of this.locks) {
      if (k.startsWith(prefix)) result.set(k.slice(prefix.length), lock);
    }
    return result;
  }
}

class RedisLockStore implements SeatLockStore {
  private client: Redis;

  constructor(url: string) {
    this.client = new Redis(url, { maxRetriesPerRequest: 2 });
    this.client.on('error', (err) => console.error('Redis error:', err.message));
  }

  async acquire(flightId: string, seatId: string, userId: string) {
    const k = key(flightId, seatId);
    const expiresAt = Date.now() + SEAT_LOCK_TTL_SECONDS * 1000;
    const value = JSON.stringify({ userId, expiresAt });

    const set = await this.client.set(k, value, 'EX', SEAT_LOCK_TTL_SECONDS, 'NX');
    if (set === 'OK') return { userId, expiresAt };

    // Seat already locked — allow the same user to extend their own lock
    const current = await this.client.get(k);
    if (current && (JSON.parse(current) as SeatLock).userId === userId) {
      await this.client.set(k, value, 'EX', SEAT_LOCK_TTL_SECONDS);
      return { userId, expiresAt };
    }
    return null;
  }

  async release(flightId: string, seatId: string, userId: string) {
    const k = key(flightId, seatId);
    const current = await this.client.get(k);
    if (!current || (JSON.parse(current) as SeatLock).userId !== userId) return false;
    await this.client.del(k);
    return true;
  }

  async getAllForFlight(flightId: string) {
    const result = new Map<string, SeatLock>();
    const prefix = `seatlock:${flightId}:`;
    let cursor = '0';
    do {
      const [next, keys] = await this.client.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 200);
      cursor = next;
      if (keys.length) {
        const values = await this.client.mget(keys);
        keys.forEach((k, i) => {
          if (values[i]) result.set(k.slice(prefix.length), JSON.parse(values[i]!) as SeatLock);
        });
      }
    } while (cursor !== '0');
    return result;
  }
}

export const seatLockStore: SeatLockStore = env.redisUrl
  ? new RedisLockStore(env.redisUrl)
  : new MemoryLockStore();

if (!env.redisUrl) {
  console.log('ℹ️  REDIS_URL not set — using in-memory seat locks (dev only)');
}
