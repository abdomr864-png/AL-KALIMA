import AsyncStorage from '@react-native-async-storage/async-storage';

const cache: Record<string, string | null> = {};

export const AppCache = {
  async get(key: string): Promise<string | null> {
    if (cache[key] !== undefined) return cache[key];
    const value = await AsyncStorage.getItem(key);
    cache[key] = value;
    return value;
  },

  async set(key: string, value: string): Promise<void> {
    cache[key] = value;
    await AsyncStorage.setItem(key, value);
  },

  async remove(key: string): Promise<void> {
    delete cache[key];
    await AsyncStorage.removeItem(key);
  },

  clear(key: string) {
    delete cache[key];
  },

  clearAll() {
    Object.keys(cache).forEach(k => delete cache[k]);
  },
};
