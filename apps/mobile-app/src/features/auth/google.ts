import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { loginWithGoogle } from "./api";

WebBrowser.maybeCompleteAuthSession();

export function useGoogleSignIn() {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const isConfigured = Platform.select({
    android: Boolean(androidClientId),
    ios: Boolean(iosClientId),
    web: Boolean(webClientId),
    default: Boolean(webClientId || iosClientId || androidClientId),
  });
  const [request, _response, promptAsync] = Google.useAuthRequest({
    androidClientId: androidClientId || "missing-google-android-client-id",
    iosClientId: iosClientId || "missing-google-ios-client-id",
    redirectUri: "inutriguide:/oauthredirect",
    webClientId: webClientId || "missing-google-web-client-id",
    scopes: ["openid", "email", "profile"],
    selectAccount: true,
  });

  const signIn = async () => {
    if (!isConfigured) {
      throw new Error("Google sign-in is not configured.");
    }
    const result = await promptAsync();
    if (result.type !== "success") {
      return null;
    }
    const idToken = result.authentication?.idToken ?? result.params.id_token;
    if (!idToken) {
      throw new Error("Google did not return an identity token.");
    }
    return loginWithGoogle({ idToken });
  };

  return { disabled: !request || !isConfigured, signIn };
}
