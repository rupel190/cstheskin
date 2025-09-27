export const devlog = (...args: any[]) => {
  if (import.meta.env.DEV) {
    console.log(`${new Date().toISOString()}`, ...args);
  }
};
