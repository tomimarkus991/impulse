// In-memory stand-in for expo-sqlite/kv-store's synchronous Storage in Jest
const items = new Map<string, string>();

export const Storage = {
  getItemSync: (key: string) => items.get(key) ?? null,
  setItemSync: (key: string, value: string) => {
    items.set(key, value);
  },
  removeItemSync: (key: string) => items.delete(key),
  clearSync: () => {
    items.clear();
    return true;
  },
};
