import { createClient } from 'redis';
import { config } from '../config/config';
import { SessionSettings } from '../models/models';

export const redisClient = createClient({ 
  disableOfflineQueue: true,
  url: config.REDIS_URL
});

redisClient.connect();

let isReady: boolean = false;

redisClient
  .on('error', (err) => {
    isReady = false;
  })
  .on('ready', () => {
    isReady = true;
  });

export async function redisDel(key: string) {
  try {
    await redisClient.del(key);
  } catch { }
}

export async function redisSet<T>(key: string, value: T) {
  try {
    const result = await redisClient.set(key, stringifyValue(value));
    return result;
  } catch {
    return null;
  }
}

export async function redisGet<T>(key: string) {
  try {
    const result = await redisClient.get(key);
    return _parseGet<T>(result);
  } catch {
    return null;
  }
}

export async function redisHSet<T>(key: string, field: string | number, value: T) {
  try {
    const result = await redisClient.hSet(key, field, stringifyValue(value));
    return result;
  } catch {
    return null;
  }
}

export async function redisHGet<T>(key: string, field: string | number) {
  try {
    const result = await redisClient.hGet(key, '' + field);
    return _parseGet<T>(result);
  } catch {
    return null;
  }
}

function stringifyValue(value: any) {
  if(value == null) {
    return '';
  }
  return typeof value == 'object' ? JSON.stringify(value) : '' + value;
}


function _parseGet<T>(getResult: string) {
  if(getResult == null || getResult == '') return null;
  try {
    return JSON.parse(getResult) as T;
  } catch {
    return getResult as any as T;
  }
}

export async function getSessionSettings() {
  const cache = await redisGet<SessionSettings>('sessionSettings');
  if(!cache) return SessionSettings.findOne();
}



