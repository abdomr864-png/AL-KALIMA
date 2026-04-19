import { supabase } from './supabase'
import Constants from 'expo-constants'
import { Linking, Alert, Platform } from 'react-native'

function compareVersions(v1: string, v2: string): number {
  const a = v1.split('.').map(Number)
  const b = v2.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) > (b[i] || 0)) return 1
    if ((a[i] || 0) < (b[i] || 0)) return -1
  }
  return 0
}

export async function checkForceUpdate(): Promise<{
  needsUpdate: boolean
  maintenanceMode: boolean
}> {
  try {
    const { data } = await supabase
      .from('app_config')
      .select('key, value')
      .in('key', ['minimum_version', 'maintenance_mode'])

    const config: Record<string, string> = {}
    data?.forEach((row: { key: string; value: string }) => { config[row.key] = row.value })

    const currentVersion = Constants.expoConfig?.version || '1.0.0'
    const minimumVersion = config.minimum_version || '1.0.0'
    const maintenanceMode = config.maintenance_mode === 'true'

    const needsUpdate = compareVersions(currentVersion, minimumVersion) < 0

    return { needsUpdate, maintenanceMode }
  } catch {
    return { needsUpdate: false, maintenanceMode: false }
  }
}

export function showForceUpdateAlert(language: 'ar' | 'en') {
  const isArabic = language === 'ar'
  Alert.alert(
    isArabic ? 'تحديث مطلوب' : 'Update Required',
    isArabic
      ? 'يجب تحديث التطبيق للاستمرار في اللعب. يرجى تحديث كلمات من متجر التطبيقات.'
      : 'Please update Kalimat to continue playing.',
    [
      {
        text: isArabic ? 'تحديث الآن' : 'Update Now',
        onPress: () => {
          const url = Platform.OS === 'ios'
            ? 'https://apps.apple.com/app/kalimat/id0000000000'
            : 'https://play.google.com/store/apps/details?id=com.kalimat.app'
          Linking.openURL(url)
        },
      },
    ],
    { cancelable: false }
  )
}
