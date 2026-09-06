import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import { isRtlLocale, resolveLocale, type SupportedLocale } from '@/lib/i18n';

type Language = 'english' | 'french' | 'arabic' | 'hausa' | 'yoruba' | 'igbo' | 'mandarin' | 'portuguese' | 'spanish';

const LANGUAGE_LOCALES: Record<Language, SupportedLocale> = {
  english: 'en-NG',
  french: 'fr-FR',
  arabic: 'ar-SA',
  hausa: 'ha-NG',
  yoruba: 'yo-NG',
  igbo: 'ig-NG',
  mandarin: 'zh-CN',
  portuguese: 'pt-PT',
  spanish: 'es-ES',
};

interface LanguageContextType {
  currentLanguage: Language;
  setLanguage: (language: Language) => Promise<void>;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('english');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadUserLanguage();
    }
  }, [user]);

  useEffect(() => {
    const locale = resolveLocale(LANGUAGE_LOCALES[currentLanguage]);
    document.documentElement.lang = locale;
    document.documentElement.dir = isRtlLocale(locale) ? 'rtl' : 'ltr';
  }, [currentLanguage]);

  const loadUserLanguage = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('preferred_language')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      if (data?.preferred_language) {
        if (data.preferred_language in LANGUAGE_LOCALES) {
          setCurrentLanguage(data.preferred_language as Language);
        }
      }
    } catch (error) {
      console.error('Error loading language preference:', error);
    }
  };

  const setLanguage = async (language: Language) => {
    setIsLoading(true);
    try {
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ preferred_language: language })
          .eq('user_id', user.id);

        if (error) throw error;
      }

      setCurrentLanguage(language);
      toast({
        title: 'Language Updated',
        description: `Your preferred language has been changed to ${language.charAt(0).toUpperCase() + language.slice(1)}.`,
      });
    } catch (error) {
      console.error('Error updating language:', error);
      toast({
        title: 'Error',
        description: 'Failed to update language preference.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, setLanguage, isLoading }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
