import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Volume2, Loader2, Languages, Square, Settings2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface VoiceTeacherProps {
  text: string;
  title?: string;
  showLanguageSelector?: boolean;
  defaultLanguage?: 'english' | 'igbo' | 'hausa' | 'yoruba';
  onLanguageChange?: (language: string) => void;
}

const LANGUAGES = [
  { value: 'english', label: 'English', flag: '🇬🇧' },
  { value: 'igbo', label: 'Igbo', flag: '🇳🇬' },
  { value: 'hausa', label: 'Hausa', flag: '🇳🇬' },
  { value: 'yoruba', label: 'Yorùbá', flag: '🇳🇬' },
];

const VoiceTeacher = ({ 
  text, 
  title = "Voice Teacher",
  showLanguageSelector = true,
  defaultLanguage = 'english',
  onLanguageChange 
}: VoiceTeacherProps) => {
  const { toast } = useToast();
  const [selectedLanguage, setSelectedLanguage] = useState(defaultLanguage);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [speechRate, setSpeechRate] = useState(0.9);
  const [speechPitch, setSpeechPitch] = useState(1);
  const [showSettings, setShowSettings] = useState(false);

  const translateText = useCallback(async (targetLanguage: string): Promise<string> => {
    if (targetLanguage === 'english') {
      return text;
    }

    setIsTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke('translate', {
        body: { text, targetLanguage }
      });

      if (error) throw error;
      return data.translatedText || text;
    } catch (error) {
      console.error('Translation error:', error);
      toast({
        title: 'Translation Failed',
        description: 'Could not translate. Using original text.',
        variant: 'destructive',
      });
      return text;
    } finally {
      setIsTranslating(false);
    }
  }, [text, toast]);

  const handleLanguageChange = async (language: string) => {
    setSelectedLanguage(language as typeof selectedLanguage);
    onLanguageChange?.(language);
    
    // Stop current speech if playing
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }

    // Pre-translate if not English
    if (language !== 'english') {
      const translated = await translateText(language);
      setTranslatedText(translated);
    } else {
      setTranslatedText(null);
    }
  };

  const handleSpeak = async () => {
    // Stop if currently playing
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    if (!text || text.trim() === '') {
      toast({
        title: 'No Content',
        description: 'There is no text to read aloud.',
        variant: 'destructive',
      });
      return;
    }

    if (!window.speechSynthesis) {
      toast({
        title: 'Not Supported',
        description: 'Text-to-speech is not supported in this browser.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Get the text to speak (translated or original)
      let textToSpeak = text;
      if (selectedLanguage !== 'english') {
        textToSpeak = translatedText || await translateText(selectedLanguage);
        if (!translatedText) {
          setTranslatedText(textToSpeak);
        }
      }

      // Use Web Speech API
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      
      // Set language based on selection
      const langMap: Record<string, string> = {
        english: 'en-US',
        igbo: 'ig-NG',
        hausa: 'ha-NG',
        yoruba: 'yo-NG',
      };
      utterance.lang = langMap[selectedLanguage] || 'en-US';
      utterance.rate = speechRate;
      utterance.pitch = speechPitch;
      utterance.pitch = 1;

      utterance.onstart = () => {
        setIsLoading(false);
        setIsPlaying(true);
      };

      utterance.onend = () => {
        setIsPlaying(false);
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setIsLoading(false);
        setIsPlaying(false);
        toast({
          title: 'Playback Error',
          description: 'Failed to play audio. Please try again.',
          variant: 'destructive',
        });
      };

      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Voice teacher error:', error);
      setIsLoading(false);
      setIsPlaying(false);
      toast({
        title: 'Voice Teacher Error',
        description: error instanceof Error ? error.message : 'Failed to generate voice. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const selectedLang = LANGUAGES.find(l => l.value === selectedLanguage);

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Languages className="w-5 h-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showLanguageSelector && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Learn in:</span>
            <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-[160px]">
                <SelectValue>
                  {selectedLang && (
                    <span className="flex items-center gap-2">
                      <span>{selectedLang.flag}</span>
                      <span>{selectedLang.label}</span>
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    <span className="flex items-center gap-2">
                      <span>{lang.flag}</span>
                      <span>{lang.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {translatedText && selectedLanguage !== 'english' && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">
              {selectedLang?.label} Translation:
            </p>
            <p className="text-sm">{translatedText}</p>
          </div>
        )}

        <Collapsible open={showSettings} onOpenChange={setShowSettings}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Voice Settings
              </span>
              <span className="text-xs text-muted-foreground">
                {showSettings ? 'Hide' : 'Show'}
              </span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Speed</Label>
                <span className="text-xs text-muted-foreground w-12 text-right">
                  {speechRate === 0.5 ? 'Slow' : speechRate === 1 ? 'Normal' : speechRate === 1.5 ? 'Fast' : `${speechRate}x`}
                </span>
              </div>
              <Slider
                value={[speechRate]}
                onValueChange={(value) => setSpeechRate(value[0])}
                min={0.5}
                max={1.5}
                step={0.1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Slower</span>
                <span>Faster</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Pitch</Label>
                <span className="text-xs text-muted-foreground w-12 text-right">
                  {speechPitch === 0.5 ? 'Low' : speechPitch === 1 ? 'Normal' : speechPitch === 1.5 ? 'High' : `${speechPitch}x`}
                </span>
              </div>
              <Slider
                value={[speechPitch]}
                onValueChange={(value) => setSpeechPitch(value[0])}
                min={0.5}
                max={1.5}
                step={0.1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Lower</span>
                <span>Higher</span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSpeak}
            disabled={isLoading || isTranslating}
            className="flex-1"
            variant={isPlaying ? "destructive" : "default"}
          >
            {isLoading || isTranslating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isTranslating ? 'Translating...' : 'Generating Voice...'}
              </>
            ) : isPlaying ? (
              <>
                <Square className="w-4 h-4 mr-2" />
                Stop
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 mr-2" />
                Listen in {selectedLang?.label}
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          🎓 Voice teaching powered by AI • Learn at your own pace
        </p>
      </CardContent>
    </Card>
  );
};

export default VoiceTeacher;
