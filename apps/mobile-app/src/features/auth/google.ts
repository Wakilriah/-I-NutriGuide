import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { loginWithGoogle } from "./api";

WebBrowser.maybeCompleteAuthSession();

const WEB_REDIRECT_URI = "https://app.matchcesoir.pro/oauthredirect";

export function useGoogleSignIn() {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const isConfigured = Boolean(webClientId);
  const [request, _response, promptAsync] = Google.useIdTokenAuthRequest({
    redirectUri: WEB_REDIRECT_URI,
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
