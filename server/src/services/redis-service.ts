// @ts-nocheck
import Redis from 'ioredis';

let redisClient: Redis | null = null;

/**
 * Get or create Redis client singleton
 */
export function getRedisClient(): Redis | null {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.warn('REDIS_URL not configured - signature persistence disabled');
    return null;
  }

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          console.error('Redis connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 100, 2000);
      },
    });

    redisClient.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    return redisClient;
  } catch (error) {
    console.error('Failed to initialize Redis:', error);
    return null;
  }
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

export interface SignatureData {
  email: string;
  name: string;
  title: string;
  phone: string;
  nmls?: string;
  officeAddress?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get signature by email
 */
export async function getSignature(email: string): Promise<SignatureData | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    const key = `signature:${email.toLowerCase()}`;
    const data = await client.get(key);

    if (!data) return null;

    return JSON.parse(data) as SignatureData;
  } catch (error) {
    console.error('Error getting signature:', error);
    return null;
  }
}

/**
 * Save or update signature
 */
export async function saveSignature(signatureData: Omit<SignatureData, 'createdAt' | 'updatedAt'>): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    const key = `signature:${signatureData.email.toLowerCase()}`;

    // Check if signature exists to preserve createdAt
    const existing = await getSignature(signatureData.email);

    const data: SignatureData = {
      ...signatureData,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await client.set(key, JSON.stringify(data));
    console.log(`Signature saved for ${signatureData.email}`);
    return true;
  } catch (error) {
    console.error('Error saving signature:', error);
    return false;
  }
}

/**
 * Delete signature
 */
export async function deleteSignature(email: string): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    const key = `signature:${email.toLowerCase()}`;
    await client.del(key);
    console.log(`Signature deleted for ${email}`);
    return true;
  } catch (error) {
    console.error('Error deleting signature:', error);
    return false;
  }
}

/**
 * Check if signature exists
 */
export async function signatureExists(email: string): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    const key = `signature:${email.toLowerCase()}`;
    const exists = await client.exists(key);
    return exists === 1;
  } catch (error) {
    console.error('Error checking signature existence:', error);
    return false;
  }
}
