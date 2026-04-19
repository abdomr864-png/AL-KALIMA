import { Platform } from 'react-native';

const VOICE_LINES = {
  correct: ['ممتاز!', 'رائع!', 'أحسنت!', 'عظيم!'],
  present: ['قريب!', 'موجودة!', 'ابحث أكثر!'],
  wrong: ['حاول مجدداً', 'استمر', 'لا تستسلم'],
  win: ['فزت! رائع جداً!', 'أنت بطل!', 'ممتاز يا بطل!'],
  lose: ['حظاً أفضل غداً', 'كان صعباً!', 'حاول غداً'],
  duel_win: ['فزت بالمباراة!', 'أنت الأفضل!'],
  duel_lose: ['المرة القادمة!', 'تدرب أكثر!'],
  streak: ['سلسلة رائعة!', 'استمر في التحدي!'],
} as const;

type VoiceType = keyof typeof VOICE_LINES;

class VoiceSystem {
  private enabled = true;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  speak(type: VoiceType) {
    if (!this.enabled) return;
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.speechSynthesis) {
      const lines = VOICE_LINES[type];
      const text = lines[Math.floor(Math.random() * lines.length)];
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ar-SA';
      utterance.pitch = 1.2;
      utterance.rate = 1.0;
      utterance.volume = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
    // On native, we'd use expo-speech — can be added later
  }
}

export const voiceSystem = new VoiceSystem();
