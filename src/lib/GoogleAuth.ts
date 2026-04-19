import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

WebBrowser.maybeCompleteAuthSession();

// Replace these with your actual Google OAuth client IDs
export const GOOGLE_CLIENT_ID = '705714203513-sf2t2hs1j5aosbb90iq5t92u81b6k6sb.apps.googleusercontent.com';
export const GOOGLE_IOS_CLIENT_ID = '705714203513-sf2t2hs1j5aosbb90iq5t92u81b6k6sb.apps.googleusercontent.com';
export const GOOGLE_ANDROID_CLIENT_ID = '705714203513-sf2t2hs1j5aosbb90iq5t92u81b6k6sb.apps.googleusercontent.com';

export interface GoogleAuthResult {
  success: boolean;
  isNewUser: boolean;
  error?: string;
  mergedData?: {
    coins: number;
    gems: number;
    streak: number;
    username: string;
  };
}

export async function signInWithGoogle(
  idToken: string,
  currentAnonymousUserId: string | null
): Promise<GoogleAuthResult> {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (authError || !authData.user) {
      return { success: false, isNewUser: false, error: authError?.message };
    }

    const googleUserId = authData.user.id;

    // Check if Google account already has a profile
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', googleUserId)
      .single();

    if (existingProfile) {
      // Returning user — profile already exists
      await syncProfileToStorage(existingProfile);
      return {
        success: true,
        isNewUser: false,
        mergedData: {
          coins: existingProfile.coins,
          gems: existingProfile.gems,
          streak: existingProfile.current_streak,
          username: existingProfile.username,
        },
      };
    }

    // New Google user — migrate anonymous data if exists
    if (currentAnonymousUserId && currentAnonymousUserId !== googleUserId) {
      const { data: anonProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentAnonymousUserId)
        .single();

      if (anonProfile) {
        const { error: insertError } = await supabase
          .from('profiles')
          .upsert({
            id: googleUserId,
            username: anonProfile.username,
            coins: anonProfile.coins,
            gems: anonProfile.gems,
            current_streak: anonProfile.current_streak,
            best_streak: anonProfile.best_streak,
            last_played_date: anonProfile.last_played_date,
            streak_freezes: anonProfile.streak_freezes,
            language: anonProfile.language,
            avatar_color: anonProfile.avatar_color,
            active_icon: anonProfile.active_icon,
            active_border: anonProfile.active_border,
            active_win_animation: anonProfile.active_win_animation,
            active_profile_bg: anonProfile.active_profile_bg,
            owned_icons: anonProfile.owned_icons,
            owned_borders: anonProfile.owned_borders,
            is_plus: anonProfile.is_plus,
            is_elite: anonProfile.is_elite,
            classic_high_score: anonProfile.classic_high_score,
            bronze_tickets: anonProfile.bronze_tickets,
            silver_tickets: anonProfile.silver_tickets,
            golden_tickets: anonProfile.golden_tickets,
            referral_code: anonProfile.referral_code,
            device_id: anonProfile.device_id,
            push_token: anonProfile.push_token,
            is_google_linked: true,
            google_email: authData.user.email,
          });

        if (!insertError) {
          await migratePlayerData(currentAnonymousUserId, googleUserId);
          await supabase.from('profiles').delete().eq('id', currentAnonymousUserId);
          await syncProfileToStorage({ ...anonProfile, id: googleUserId });

          return {
            success: true,
            isNewUser: false,
            mergedData: {
              coins: anonProfile.coins,
              gems: anonProfile.gems,
              streak: anonProfile.current_streak,
              username: anonProfile.username,
            },
          };
        }
      }
    }

    // Brand new player with Google — create fresh profile
    await supabase.from('profiles').insert({
      id: googleUserId,
      is_google_linked: true,
      google_email: authData.user.email,
      language: 'ar',
      coins: 30,
      gems: 0,
    });

    return { success: true, isNewUser: true };
  } catch (err: any) {
    return { success: false, isNewUser: false, error: err.message };
  }
}

async function migratePlayerData(oldId: string, newId: string) {
  const tables = [
    'daily_results',
    'duels',
    'classic_sessions',
    'spin_history',
    'referrals',
    'friendships',
  ];

  for (const table of tables) {
    try {
      await supabase.from(table).update({ player_id: newId }).eq('player_id', oldId);
      await supabase.from(table).update({ player1_id: newId }).eq('player1_id', oldId);
      await supabase.from(table).update({ player2_id: newId }).eq('player2_id', oldId);
      await supabase.from(table).update({ requester_id: newId }).eq('requester_id', oldId);
      await supabase.from(table).update({ addressee_id: newId }).eq('addressee_id', oldId);
    } catch {
      // ignore tables that don't have those columns
    }
  }
}

async function syncProfileToStorage(profile: any) {
  await Promise.all([
    AsyncStorage.setItem('kalimat_username', profile.username || ''),
    AsyncStorage.setItem('kalimat_coins', String(profile.coins || 0)),
    AsyncStorage.setItem('kalimat_gems', String(profile.gems || 0)),
    AsyncStorage.setItem('kalimat_current_streak', String(profile.current_streak || 0)),
    AsyncStorage.setItem('kalimat_classic_highscore', String(profile.classic_high_score || 0)),
    AsyncStorage.setItem('kalimat_avatar_color', profile.avatar_color || '#7C3AED'),
    AsyncStorage.setItem('kalimat_active_icon', profile.active_icon || ''),
    AsyncStorage.setItem('kalimat_active_border', profile.active_border || 'none'),
    AsyncStorage.setItem('kalimat_language', profile.language || 'ar'),
    AsyncStorage.setItem('kalimat_is_google_linked', 'true'),
  ]);
}

export async function restoreGoogleSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const isGoogle = session.user.app_metadata?.provider === 'google';
  if (!isGoogle) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (profile) {
    await syncProfileToStorage(profile);
  }
}

export async function signOutGoogle() {
  await supabase.auth.signOut();
  const lang = await AsyncStorage.getItem('kalimat_language');
  await AsyncStorage.clear();
  if (lang) await AsyncStorage.setItem('kalimat_language', lang);
}
