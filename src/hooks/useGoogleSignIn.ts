import * as Google from 'expo-auth-session/providers/google';
import { useState } from 'react';
import { signInWithGoogle, GoogleAuthResult, GOOGLE_CLIENT_ID, GOOGLE_IOS_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID } from '../lib/GoogleAuth';

export function useGoogleSignIn() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
  });

  async function handleGoogleResponse(
    resp: any,
    currentUserId: string | null,
    onSuccess: (result: GoogleAuthResult) => void
  ) {
    if (resp?.type !== 'success') return;
    setLoading(true);
    setError(null);

    const idToken = resp.params.id_token;
    const result = await signInWithGoogle(idToken, currentUserId);

    if (result.success) {
      onSuccess(result);
    } else {
      setError(result.error || 'Sign in failed');
    }
    setLoading(false);
  }

  return { request, response, promptAsync, loading, error, handleGoogleResponse };
}
