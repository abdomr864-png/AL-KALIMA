import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export type Language = 'ar' | 'en';

interface LanguageContextType {
  language: Language;
  isArabic: boolean;
  isEnglish: boolean;
  t: (ar: string, en: string) => string;
  setLanguage: (lang: Language) => Promise<void>;
  loaded: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'ar',
  isArabic: true,
  isEnglish: false,
  t: (ar) => ar,
  setLanguage: async () => {},
  loaded: false,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLang] = useState<Language>('ar');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('kalimat_language').then(lang => {
      if (lang === 'en' || lang === 'ar') setLang(lang);
      setLoaded(true);
    });
  }, []);

  async function setLanguage(lang: Language) {
    setLang(lang);
    await AsyncStorage.setItem('kalimat_language', lang);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({ language: lang }).eq('id', user.id);
      }
    } catch {}
  }

  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  return (
    <LanguageContext.Provider
      value={{
        language,
        isArabic: language === 'ar',
        isEnglish: language === 'en',
        t,
        setLanguage,
        loaded,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
