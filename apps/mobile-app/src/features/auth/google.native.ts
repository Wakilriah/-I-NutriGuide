import { GoogleSignin, isCancelledResponse } from "@react-native-google-signin/google-signin";
import { useEffect } from "react";
import { loginWithGoogle } from "./api";

export function useGoogleSignIn() {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const isConfigured = Boolean(webClientId);

  useEffect(() => {
    if (!webClientId) {
      return;
    }
    GoogleSignin.configure({
      scopes: ["openid", "email", "profile"],
      webClientId,
    });
  }, [webClientId]);

  const signIn = async () => {
    if (!isConfigured) {
      throw new Error("Google sign-in is not configured.");
    }
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const result = await GoogleSignin.signIn();
    if (isCancelledResponse(result)) {
      return null;
    }
    const idToken = result.data.idToken;
    if (!idToken) {
      throw new Error("Google did not return an identity token.");
    }
    return loginWithGoogle({ idToken });
  };

  return { disabled: !isConfigured, signIn };
}
