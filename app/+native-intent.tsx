/**
 * Native Intent Handler for Expo Router
 *
 * This file intercepts deep links before expo-router processes them.
 * Used to prevent navigation flash when WalletConnect redirects back to the app.
 *
 * See: https://docs.expo.dev/router/advanced/native-intent/
 */

export function redirectSystemPath({
  path,
  initial,
}: {
  path: string
  initial: boolean
}): string {
  // Intercept WalletConnect redirect - this just brings app to foreground
  // Return "/" to stay on current screen (no navigation change)
  if (path.includes("wc-redirect")) {
    console.log("[+native-intent] Intercepted wc-redirect, staying on current screen")
    return "/"
  }

  // All other deeplinks handled normally by expo-router
  return path
}
