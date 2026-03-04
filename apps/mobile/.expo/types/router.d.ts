/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/(auth)` | `/(auth)/login` | `/(auth)/register` | `/(tabs)` | `/(tabs)/` | `/(tabs)/library` | `/(tabs)/profile` | `/_sitemap` | `/library` | `/login` | `/profile` | `/register` | `/store`;
      DynamicRoutes: `/episode/${Router.SingleRoutePart<T>}` | `/series/${Router.SingleRoutePart<T>}`;
      DynamicRouteTemplate: `/episode/[id]` | `/series/[id]`;
    }
  }
}
