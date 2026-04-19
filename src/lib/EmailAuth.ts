import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export interface EmailAuthResult {
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

export async function signUpWithEmail(
  email: string,
  password: string,
  currentAnonymousUserId: string | null
): Promise<EmailAuthResult> {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      return { success: false, isNewUser: false, error: authError?.message };
    }

    const newUserId = authData.user.id;

    // Migrate anonymous profile data to the new email account
    if (currentAnonymousUserId && currentAnonymousUserId !== newUserId) {
      const { data: anonProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentAnonymousUserId)
        .single();

      if (anonProfile) {
        const { error: upsertError } = await supabase
          .from('profiles')
          .upsert({
            id: newUserId,
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
            is_email_linked: true,
          });

        if (!upsertError) {
          await migratePlayerData(currentAnonymousUserId, newUserId);
          await supabase.from('profiles').delete().eq('id', currentAnonymousUserId);
          await syncProfileToStorage({ ...anonProfile, id: newUserId });

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

    // No anonymous data — create fresh profile using values stored locally
    const [username, language, coins, gems, streak, highScore, avatarColor] = await Promise.all([
      AsyncStorage.getItem('kalimat_username'),
      AsyncStorage.getItem('kalimat_language'),
      AsyncStorage.getItem('kalimat_coins'),
      AsyncStorage.getItem('kalimat_gems'),
      AsyncStorage.getItem('kalimat_current_streak'),
      AsyncStorage.getItem('kalimat_classic_highscore'),
      AsyncStorage.getItem('kalimat_avatar_color'),
    ]);

    await supabase.from('profiles').upsert({
      id: newUserId,
      username: username || null,
      language: language || 'ar',
      coins: coins ? parseInt(coins, 10) : 30,
      gems: gems ? parseInt(gems, 10) : 0,
      current_streak: streak ? parseInt(streak, 10) : 0,
      classic_high_score: highScore ? parseInt(highScore, 10) : 0,
      avatar_color: avatarColor || '#7C3AED',
      is_email_linked: true,
    });

    await AsyncStorage.setItem('kalimat_is_linked', 'true');
    await AsyncStorage.setItem('kalimat_is_email_linked', 'true');
    return { success: true, isNewUser: true };
  } catch (err: any) {
    return { success: false, isNewUser: false, error: err.message };
  }
}

export async function signInWithEmail(email: string, password: string): Promise<EmailAuthResult> {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return { success: false, isNewUser: false, error: authError?.message };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profile) {
      if (!profile.is_email_linked) {
        await supabase.from('profiles').update({ is_email_linked: true }).eq('id', authData.user.id);
      }
      await syncProfileToStorage(profile);
      return {
        success: true,
        isNewUser: false,
        mergedData: {
          coins: profile.coins,
          gems: profile.gems,
          streak: profile.current_streak,
          username: profile.username,
        },
      };
    }

    // Auth succeeded but no profile row — create one
    await supabase.from('profiles').insert({
      id: authData.user.id,
      is_email_linked: true,
      language: (await AsyncStorage.getItem('kalimat_language')) || 'ar',
      coins: 30,
      gems: 0,
    });
    await AsyncStorage.setItem('kalimat_is_linked', 'true');
    await AsyncStorage.setItem('kalimat_is_email_linked', 'true');
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
    AsyncStorage.setItem('kalimat_is_linked', 'true'),
    AsyncStorage.setItem('kalimat_is_email_linked', 'true'),
  ]);
}
