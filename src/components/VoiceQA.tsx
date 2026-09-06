import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mic, MicOff, Loader2, Volume2, MessageCircle, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface VoiceQAProps {
  context?: string; // Lesson context for better answers
  className?: string;
}

const languages = [
  { value: 'en', label: 'English' },
  { value: 'ig', label: 'Igbo' },
  { value: 'ha', label: 'Hausa' },
  { value: 'yo', label: 'Yoruba' },
];

export function VoiceQA({ context, className = '' }: VoiceQAProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [language, setLanguage] = useState('en');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Use Web Speech API for speech recognition (widely supported)
  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in your browser. Please use Chrome or Edge.",
        variant: "destructive"
      });
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = language === 'en' ? 'en-US' : 
                       language === 'yo' ? 'yo-NG' : 
                       language === 'ha' ? 'ha-NG' : 
                       language === 'ig' ? 'ig-NG' : 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
      setResponse('');
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          setTranscript(transcript);
        } else {
          interimTranscript += transcript;
        }
      }
      if (interimTranscript) {
        setTranscript(interimTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error !== 'aborted') {
        toast({
          title: "Recognition Error",
          description: "Could not understand. Please try again.",
          variant: "destructive"
        });
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [language]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  const processQuestion = async () => {
    if (!transcript.trim()) {
      toast({
        title: "No Question",
        description: "Please ask a question first.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Get AI response
      const { data: aiData, error: aiError } = await supabase.functions.invoke('ai-study-buddy', {
        body: {
          message: transcript,
          context: context || '',
          subject: 'general',
        }
      });

      if (aiError) throw aiError;

      let answerText = aiData.response || aiData.message || "I couldn't generate a response.";
      
      // Translate if not English
      if (language !== 'en') {
        const { data: translateData, error: translateError } = await supabase.functions.invoke('translate', {
          body: { text: answerText, targetLanguage: language }
        });

        if (!translateError && translateData.translatedText) {
          answerText = translateData.translatedText;
        }
      }

      setResponse(answerText);

      // Speak the response
      await speakResponse(answerText);
    } catch (error: any) {
      console.error('Voice QA error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process your question.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const speakResponse = async (text: string) => {
    setIsSpeaking(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-teach`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            text: text.substring(0, 2000),
            language,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Voice generation failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        setIsSpeaking(false);
      };
      
      await audio.play();
    } catch (error) {
      console.error('Speech error:', error);
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsSpeaking(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Auto-process when transcript is final
  useEffect(() => {
    if (transcript && !isListening && !isProcessing && !response) {
      processQuestion();
    }
  }, [transcript, isListening]);

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className={`gap-2 ${className}`}
        variant="outline"
      >
        <MessageCircle className="w-4 h-4" />
        Ask a Question
      </Button>
    );
  }

  return (
    <Card className={`${className}`}>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Voice Q&A
          </h4>
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            {languages.map((lang) => (
              <SelectItem key={lang.value} value={lang.value}>
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex justify-center">
          <Button
            size="lg"
            variant={isListening ? "destructive" : "default"}
            onClick={isListening ? stopListening : startListening}
            disabled={isProcessing || isSpeaking}
            className="w-20 h-20 rounded-full"
          >
            {isProcessing ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : isListening ? (
              <MicOff className="w-8 h-8" />
            ) : (
              <Mic className="w-8 h-8" />
            )}
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          {isListening ? "Listening... Tap to stop" : 
           isProcessing ? "Processing your question..." :
           isSpeaking ? "Speaking..." :
           "Tap to ask a question"}
        </p>

        {transcript && (
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm font-medium mb-1">Your question:</p>
            <p className="text-sm text-muted-foreground">{transcript}</p>
          </div>
        )}

        {response && (
          <div className="bg-primary/5 p-3 rounded-lg">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">Answer:</p>
                <p className="text-sm text-muted-foreground">{response}</p>
              </div>
              {isSpeaking ? (
                <Button variant="ghost" size="sm" onClick={stopSpeaking}>
                  <Volume2 className="w-4 h-4 animate-pulse" />
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => speakResponse(response)}>
                  <Volume2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {(transcript || response) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setTranscript('');
              setResponse('');
            }}
            className="w-full"
          >
            Ask Another Question
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
