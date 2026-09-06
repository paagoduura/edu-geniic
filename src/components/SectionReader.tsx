import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, Loader2, Square } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SectionReaderProps {
  text: string;
  language?: string;
  className?: string;
}

export function SectionReader({ text, language = 'en', className = '' }: SectionReaderProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handlePlay = async () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    if (!text.trim()) {
      toast({
        title: "No content",
        description: "There's no text to read.",
        variant: "destructive"
      });
      return;
    }

    if (!window.speechSynthesis) {
      toast({
        title: "Not Supported",
        description: "Text-to-speech is not supported in this browser.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Translate if not English
      let textToSpeak = text;
      if (language !== 'en') {
        const { data: translateData, error: translateError } = await supabase.functions.invoke('translate', {
          body: { text, targetLanguage: language }
        });

        if (translateError) throw translateError;
        textToSpeak = translateData.translatedText || text;
      }

      // Use Web Speech API
      const utterance = new SpeechSynthesisUtterance(textToSpeak.substring(0, 2000));
      
      // Map language codes
      const langMap: Record<string, string> = {
        en: 'en-US',
        ig: 'ig-NG',
        ha: 'ha-NG',
        yo: 'yo-NG',
        igbo: 'ig-NG',
        hausa: 'ha-NG',
        yoruba: 'yo-NG',
      };
      utterance.lang = langMap[language] || 'en-US';
      utterance.rate = 0.9;
      
      utterance.onstart = () => {
        setIsLoading(false);
        setIsPlaying(true);
      };
      
      utterance.onend = () => {
        setIsPlaying(false);
      };
      
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setIsPlaying(false);
        setIsLoading(false);
        toast({
          title: "Playback Error",
          description: "Failed to play audio.",
          variant: "destructive"
        });
      };
      
      window.speechSynthesis.speak(utterance);
    } catch (error: any) {
      console.error('Section reader error:', error);
      setIsLoading(false);
      toast({
        title: "Read Error",
        description: error.message || "Failed to read section.",
        variant: "destructive"
      });
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handlePlay}
      disabled={isLoading}
      className={`h-8 px-2 ${className}`}
      title={isPlaying ? "Stop reading" : "Read this section"}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isPlaying ? (
        <Square className="w-4 h-4" />
      ) : (
        <Volume2 className="w-4 h-4" />
      )}
    </Button>
  );
}
