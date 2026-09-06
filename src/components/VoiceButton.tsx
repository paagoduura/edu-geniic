import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceButtonProps {
  text: string;
  voice?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
}

const VoiceButton = ({ 
  text, 
  voice = 'default',
  size = 'icon',
  variant = 'ghost'
}: VoiceButtonProps) => {
  const { toast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const handleSpeak = () => {
    // Stop if currently playing
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    if (!text || text.trim() === '') {
      toast({
        title: 'No Text',
        description: 'There is no text to read aloud.',
        variant: 'destructive',
      });
      return;
    }

    // Check browser support
    if (!('speechSynthesis' in window)) {
      toast({
        title: 'Not Supported',
        description: 'Your browser does not support text-to-speech.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    // Create utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    // Configure voice settings
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1;
    utterance.volume = 1;

    // Try to find a good voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Microsoft'))
    ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

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
      if (event.error !== 'canceled') {
        toast({
          title: 'Error',
          description: 'Failed to play audio. Please try again.',
          variant: 'destructive',
        });
      }
    };

    // Speak the text
    window.speechSynthesis.speak(utterance);
    
    // Fallback: if onstart doesn't fire, set loading to false after a delay
    setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        setIsPlaying(true);
      }
    }, 500);
  };

  return (
    <Button
      onClick={handleSpeak}
      size={size}
      variant={variant}
      disabled={isLoading}
      title={isPlaying ? 'Stop' : 'Listen'}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isPlaying ? (
        <VolumeX className="w-4 h-4" />
      ) : (
        <Volume2 className="w-4 h-4" />
      )}
    </Button>
  );
};

export default VoiceButton;
