import { Injectable, OnModuleDestroy } from '@nestjs/common';

/**
 * Redis Service - Simple in-memory implementation
 * Replace with actual Redis client (ioredis) in production
 *
 * For production, install: npm install ioredis
 * Then import and use: import Redis from 'ioredis'
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  // In-memory storage (replace with actual Redis in production)
  private storage: Map<string, { value: any; expiry?: number }> = new Map();
  private sets: Map<string, Set<string>> = new Map();
  private lists: Map<string, any[]> = new Map();
  private hashes: Map<string, Map<string, string>> = new Map();

  constructor() {
    console.log('[RedisService] Using in-memory storage (replace with Redis in production)');
  }

  async onModuleDestroy() {
    this.storage.clear();
    this.sets.clear();
    this.lists.clear();
    this.hashes.clear();
  }

  // String operations
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.storage.set(key, { value, expiry });
  }

  async get(key: string): Promise<any> {
    const item = this.storage.get(key);
    if (!item) return null;

    // Check expiry
    if (item.expiry && Date.now() > item.expiry) {
      this.storage.delete(key);
      return null;
    }

    return item.value;
  }

  async del(key: string): Promise<void> {
    this.storage.delete(key);
    this.sets.delete(key);
    this.lists.delete(key);
    this.hashes.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.storage.has(key) || this.sets.has(key) || this.lists.has(key) || this.hashes.has(key);
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    const item = this.storage.get(key);
    if (item) {
      item.expiry = Date.now() + ttlSeconds * 1000;
    }
  }

  // Set operations
  async sadd(key: string, ...members: string[]): Promise<number> {
    if (!this.sets.has(key)) {
      this.sets.set(key, new Set());
    }
    const set = this.sets.get(key);
    members.forEach(member => set.add(member));
    return set.size;
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    const set = this.sets.get(key);
    if (!set) return 0;

    let removed = 0;
    members.forEach(member => {
      if (set.delete(member)) removed++;
    });
    return removed;
  }

  async smembers(key: string): Promise<string[]> {
    const set = this.sets.get(key);
    return set ? Array.from(set) : [];
  }

  async sismember(key: string, member: string): Promise<boolean> {
    const set = this.sets.get(key);
    return set ? set.has(member) : false;
  }

  // List operations
  async lpush(key: string, ...values: any[]): Promise<number> {
    if (!this.lists.has(key)) {
      this.lists.set(key, []);
    }
    const list = this.lists.get(key);
    list.unshift(...values);
    return list.length;
  }

  async rpush(key: string, ...values: any[]): Promise<number> {
    if (!this.lists.has(key)) {
      this.lists.set(key, []);
    }
    const list = this.lists.get(key);
    list.push(...values);
    return list.length;
  }

  async lrange(key: string, start: number, stop: number): Promise<any[]> {
    const list = this.lists.get(key);
    if (!list) return [];

    const end = stop === -1 ? list.length : stop + 1;
    return list.slice(start, end);
  }

  async ltrim(key: string, start: number, stop: number): Promise<void> {
    const list = this.lists.get(key);
    if (!list) return;

    const end = stop === -1 ? list.length : stop + 1;
    const trimmed = list.slice(start, end);
    this.lists.set(key, trimmed);
  }

  // Hash operations
  async hset(key: string, field: string, value: string): Promise<void> {
    if (!this.hashes.has(key)) {
      this.hashes.set(key, new Map());
    }
    this.hashes.get(key).set(field, value);
  }

  async hget(key: string, field: string): Promise<string | null> {
    const hash = this.hashes.get(key);
    return hash ? hash.get(field) || null : null;
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const hash = this.hashes.get(key);
    if (!hash) return {};

    const result: Record<string, string> = {};
    hash.forEach((value, field) => {
      result[field] = value;
    });
    return result;
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    const hash = this.hashes.get(key);
    if (!hash) return 0;

    let deleted = 0;
    fields.forEach(field => {
      if (hash.delete(field)) deleted++;
    });
    return deleted;
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    if (!this.hashes.has(key)) {
      this.hashes.set(key, new Map());
    }
    const hash = this.hashes.get(key);
    const current = parseInt(hash.get(field) || '0', 10);
    const newValue = current + increment;
    hash.set(field, newValue.toString());
    return newValue;
  }

  // Utility
  async flushall(): Promise<void> {
    this.storage.clear();
    this.sets.clear();
    this.lists.clear();
    this.hashes.clear();
  }
}
