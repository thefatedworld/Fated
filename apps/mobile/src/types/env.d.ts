// Expo inlines EXPO_PUBLIC_* env vars at build time.
// This declaration tells TypeScript that `process.env` exists in the Expo context.
declare const process: {
  env: {
    EXPO_PUBLIC_API_URL?: string;
    NODE_ENV: 'development' | 'production' | 'test';
  };
};
