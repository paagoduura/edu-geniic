import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useScribe, CommitStrategy } from "@elevenlabs/react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Mic, MicOff, Loader2, Volume2, VolumeX, Settings2, Bot, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface VoiceStudyBuddyProps {
  sessionId: string | null;
  onSessionCreate: () => Promise<string | null>;
  className?: string;
}

const languages = [
  { value: "en", label: "English", recognitionCode: "en-NG" },
  // Web Speech rarely supports Yoruba/Hausa/Igbo reliably across browsers.
  // We use en-NG as a practical fallback for the browser STT engine.
  { value: "yo", label: "Yoruba", recognitionCode: "en-NG" },
  { value: "ha", label: "Hausa", recognitionCode: "en-NG" },
  { value: "ig", label: "Igbo", recognitionCode: "en-NG" },
] as const;

type LanguageCode = (typeof languages)[number]["value"];

const languageMap: Record<LanguageCode, string> = {
  en: "english",
  yo: "yoruba",
  ha: "hausa",
  ig: "igbo",
};

// ISO 639-3 codes used by ElevenLabs Scribe
const scribeLanguageCodeMap: Record<LanguageCode, string> = {
  en: "eng",
  yo: "yor",
  ha: "hau",
  ig: "ibo",
};

function isSupportedWebSpeech(): boolean {
  return "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
}

export function VoiceStudyBuddy({ sessionId, onSessionCreate, className = "" }: VoiceStudyBuddyProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [speechRate, setSpeechRate] = useState(0.85);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const isListeningRef = useRef(false);
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  const processVoiceInputRef = useRef<(text: string) => void | Promise<void>>(() => undefined);

  // Cache whether ElevenLabs-based speech services are working.
  // If the API key is invalid/expired (401), we avoid repeated failing calls.
  const elevenLabsSttAvailableRef = useRef<boolean | null>(null);
  const elevenLabsTtsAvailableRef = useRef<boolean | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const sessionIdRef = useRef<string | null>(sessionId);
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  const messagesRef = useRef<Message[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: CommitStrategy.VAD,
    onPartialTranscript: (data) => {
      if (!isListeningRef.current) return;
      if (data?.text) setCurrentTranscript(data.text);
    },
    onCommittedTranscript: (data) => {
      const text = data?.text?.trim();
      if (!text) return;
      setCurrentTranscript("");
      void processVoiceInputRef.current(text);
    },
  });

  const sttProvider = useMemo<"elevenlabs" | "webspeech">(() => {
    // Prefer ElevenLabs; if it errors or cannot connect, we fallback to Web Speech.
    return "elevenlabs";
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        if (recognitionRef.current) recognitionRef.current.abort();
      } catch {
        // ignore
      }
      try {
        if (scribe.isConnected) scribe.disconnect();
      } catch {
        // ignore
      }
      stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const appendMessage = useCallback((msg: Message) => {
    setMessages((prev) => {
      const next = [...prev, msg];
      messagesRef.current = next;
      return next;
    });
  }, []);

  const requestMicrophonePermission = useCallback(async () => {
    // Some browsers are flaky about prompting for mic permissions only via speech APIs.
    // We request mic permission explicitly first.
    if (!navigator.mediaDevices?.getUserMedia) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
  }, []);

  const startListening = useCallback(async () => {
    if (isProcessing || isSpeaking) return;

    setCurrentTranscript("");

    // Don’t hard-block on getUserMedia here: previews/iframes and some browsers can fail this
    // while SpeechRecognition (or other STT engines) can still work.
    try {
      await requestMicrophonePermission();
    } catch (e) {
      console.warn("Mic permission preflight failed; continuing:", e);
      toast({
        title: "Microphone permission",
        description: "If voice doesn’t start, please allow microphone access in your browser settings and try again.",
        variant: "destructive",
      });
      // continue to attempt STT engines
    }

    const startWebSpeechFallback = () => {
      if (!isSupportedWebSpeech()) {
        toast({
          title: "Voice not supported",
          description:
            "Your browser doesn’t support speech recognition. Use Chrome/Edge, or fix the speech service key for voice mode.",
          variant: "destructive",
        });
        return;
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      const langConfig = languages.find((l) => l.value === language);
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = langConfig?.recognitionCode || "en-NG";

      let lastTranscript = "";

      recognition.onstart = () => {
        setIsListening(true);
        setCurrentTranscript("");
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const combined = (finalTranscript || interimTranscript || "").trim();
        if (combined) {
          lastTranscript = combined;
          setCurrentTranscript(combined);
        }

        if (finalTranscript.trim()) {
          setCurrentTranscript("");
          void processVoiceInputRef.current(finalTranscript.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);

        if (event.error === "no-speech") {
          toast({
            title: "No speech detected",
            description: "I didn’t hear anything. Try speaking closer to the mic and ensure mic access is allowed.",
            variant: "destructive",
          });
          return;
        }

        if (event.error !== "aborted") {
          toast({
            title: "Recognition Error",
            description: "Could not understand. Please try again.",
            variant: "destructive",
          });
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        // If we have something but never got a final result, still process it.
        if (!isProcessing && lastTranscript.trim()) {
          const t = lastTranscript.trim();
          setCurrentTranscript("");
          void processVoiceInputRef.current(t);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    };

    // If we already detected ElevenLabs auth failures, skip it and go straight to browser STT.
    if (elevenLabsSttAvailableRef.current === false) {
      startWebSpeechFallback();
      return;
    }

    // Prefer ElevenLabs realtime STT when available (better for Yoruba/Hausa), otherwise fallback.
    try {
      const { data, error } = await supabase.functions.invoke("elevenlabs-scribe-token");
      if (error) throw error;
      if (!data?.token) throw new Error("No transcription token received");

      await scribe.connect({
        token: data.token,
        languageCode: scribeLanguageCodeMap[language],
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      elevenLabsSttAvailableRef.current = true;
      setIsListening(true);
      return;
    } catch (err: any) {
      const msg = err?.message ? String(err.message) : String(err);
      console.warn("ElevenLabs STT failed; attempting Web Speech fallback", err);

      // Mark as unavailable if we see auth errors (commonly invalid/expired API key)
      if (msg.includes("401")) {
        elevenLabsSttAvailableRef.current = false;
        toast({
          title: "Speech service error (401)",
          description:
            "Voice transcription service is not authorized. I’ll use your browser’s speech recognition instead (best in Chrome/Edge).",
          variant: "destructive",
        });
      }

      startWebSpeechFallback();
    }
  }, [isProcessing, isSpeaking, language, requestMicrophonePermission, scribe]);

  const stopListening = useCallback(() => {
    try {
      if (scribe.isConnected) scribe.disconnect();
    } catch {
      // ignore
    }

    try {
      if (recognitionRef.current) recognitionRef.current.stop();
    } catch {
      // ignore
    }

    setIsListening(false);
  }, [scribe]);

  const getActiveSessionId = useCallback(async (): Promise<string> => {
    const activeSessionId = sessionIdRef.current;
    if (activeSessionId) return activeSessionId;

    const newId = await onSessionCreate();
    if (!newId) throw new Error("Failed to create session");
    sessionIdRef.current = newId;
    return newId;
  }, [onSessionCreate]);

  const processVoiceInput = useCallback(
    async (userInput: string) => {
      if (!userInput.trim() || isProcessing) return;

      setIsProcessing(true);
      appendMessage({ role: "user", content: userInput });

      try {
        const activeSessionId = await getActiveSessionId();

        // Translate to English for AI processing when needed
        let englishInput = userInput;
        if (language !== "en") {
          try {
            const { data: translateData, error: translateError } = await supabase.functions.invoke("translate", {
              body: {
                text: userInput,
                targetLanguage: "en",
                sourceLanguage: language,
              },
            });

            if (!translateError && translateData?.translatedText) {
              englishInput = String(translateData.translatedText).trim();
            }
          } catch (translateErr) {
            console.warn("Translation to English failed, using original input:", translateErr);
          }
        }

        // AI response (always ask backend for English)
        const prior = messagesRef.current.map((m) => ({ role: m.role, content: m.content }));
        const { data: aiData, error: aiError } = await supabase.functions.invoke("ai-study-buddy", {
          body: {
            messages: [...prior, { role: "user", content: englishInput }],
            sessionId: activeSessionId,
            language: "english",
          },
        });

        if (aiError) throw aiError;

        let responseText = aiData?.message || "I couldn't generate a response.";

        // Translate back to user's language
        if (language !== "en") {
          try {
            const { data: translateData, error: translateError } = await supabase.functions.invoke("translate", {
              body: {
                text: responseText,
                targetLanguage: language,
                sourceLanguage: "en",
              },
            });

            if (!translateError && translateData?.translatedText) {
              responseText = String(translateData.translatedText).trim();
            }
          } catch (translateErr) {
            console.warn("Translation to target language failed, using English:", translateErr);
          }
        }

        appendMessage({ role: "assistant", content: responseText });

        await speakResponse(responseText);
      } catch (error: any) {
        console.error("Voice Study Buddy error:", error);
        toast({
          title: "Error",
          description: error?.message || "Failed to process your question.",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [appendMessage, getActiveSessionId, isProcessing, language]
  );

  useEffect(() => {
    processVoiceInputRef.current = processVoiceInput;
  }, [processVoiceInput]);

  const speakResponse = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      setIsSpeaking(true);

      // Stop any ongoing audio
      try {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
      } catch {
        // ignore
      }

      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }

      // Also stop browser speech synthesis if any other component is using it
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }

      // Prefer backend TTS (better language support) when authorized.
      try {
        if (elevenLabsTtsAvailableRef.current === false) {
          throw new Error("Speech service unavailable");
        }

        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;

        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-teach`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${accessToken || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            text: text.substring(0, 2500),
            language: languageMap[language],
            voice: "default",
          }),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          // Commonly indicates invalid/expired ElevenLabs key.
          if (res.status === 401) {
            elevenLabsTtsAvailableRef.current = false;
          }
          throw new Error(`Voice generation failed: ${res.status} ${errText}`);
        }

        elevenLabsTtsAvailableRef.current = true;

        const audioBlob = await res.blob();
        const url = URL.createObjectURL(audioBlob);
        audioUrlRef.current = url;

        const audio = new Audio(url);
        audio.playbackRate = speechRate;
        audioRef.current = audio;

        audio.onended = () => {
          setIsSpeaking(false);
          if (audioUrlRef.current) {
            URL.revokeObjectURL(audioUrlRef.current);
            audioUrlRef.current = null;
          }
        };

        audio.onerror = () => {
          setIsSpeaking(false);
        };

        await audio.play();
        return;
      } catch (err) {
        console.warn("Backend voice-teach failed; falling back to browser TTS", err);
      }

      // Fallback: browser speech synthesis
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = speechRate;
        utterance.pitch = 1;
        utterance.volume = 1;
        utterance.lang = language === "en" ? "en-NG" : "en-GB";

        const voices = window.speechSynthesis.getVoices();
        const preferred =
          voices.find((v) => v.lang.startsWith("en") && v.name.toLowerCase().includes("google")) ||
          voices.find((v) => v.lang.startsWith("en")) ||
          voices[0];
        if (preferred) utterance.voice = preferred;

        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        if (voices.length === 0) {
          await new Promise<void>((resolve) => {
            window.speechSynthesis.onvoiceschanged = () => resolve();
            setTimeout(resolve, 500);
          });
        }

        window.speechSynthesis.speak(utterance);
      } catch (error) {
        console.error("Speech error:", error);
        setIsSpeaking(false);
        toast({
          title: "Speech Error",
          description: "Failed to speak the response.",
          variant: "destructive",
        });
      }
    },
    [language, speechRate]
  );

  const stopSpeaking = useCallback(() => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    } catch {
      // ignore
    }

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }

    setIsSpeaking(false);
  }, []);

  const replayMessage = useCallback(
    (message: Message) => {
      if (isSpeaking) {
        stopSpeaking();
      } else {
        void speakResponse(message.content);
      }
    },
    [isSpeaking, speakResponse, stopSpeaking]
  );

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header with Language Selection and Settings */}
      <div className="p-4 border-b bg-card/50">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <span className="font-semibold">Voice Mode</span>
          </div>

          <div className="flex items-center gap-2">
            <Select value={language} onValueChange={(v) => setLanguage(v as LanguageCode)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>
        </div>

        <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
          <CollapsibleContent className="mt-4 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Speech Speed</span>
                <span>{speechRate.toFixed(2)}x</span>
              </div>
              <Slider
                value={[speechRate]}
                onValueChange={([value]) => setSpeechRate(value)}
                min={0.5}
                max={1.5}
                step={0.05}
                className="w-full"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              💡 Tip: If speech recognition fails, check microphone permissions and try again.
            </p>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isListening && !isProcessing && (
          <div className="text-center py-12">
            <Mic className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Voice Study Buddy</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Tap the microphone and ask me anything! I can respond in English, Yoruba, Hausa, and Igbo.
            </p>
            <p className="text-sm text-muted-foreground">Select your language above, then speak clearly.</p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              "flex gap-3",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {message.role === "assistant" && (
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-5 w-5 text-primary" />
              </div>
            )}
            <div className="flex flex-col gap-1 max-w-[80%]">
              <div
                className={cn(
                  "rounded-lg px-4 py-2",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                )}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
              {message.role === "assistant" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="self-start"
                  onClick={() => replayMessage(message)}
                >
                  {isSpeaking ? (
                    <VolumeX className="h-4 w-4 mr-1" />
                  ) : (
                    <Volume2 className="h-4 w-4 mr-1" />
                  )}
                  {isSpeaking ? "Stop" : "Replay"}
                </Button>
              )}
            </div>
            {message.role === "user" && (
              <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                <User className="h-5 w-5" />
              </div>
            )}
          </div>
        ))}

        {/* Current transcript while listening */}
        {currentTranscript && (
          <div className="flex gap-3 justify-end">
            <div className="rounded-lg px-4 py-2 max-w-[80%] bg-primary/50 text-primary-foreground italic">
              <p>{currentTranscript}</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
              <User className="h-5 w-5" />
            </div>
          </div>
        )}

        {/* Processing indicator */}
        {isProcessing && (
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div className="bg-secondary rounded-lg px-4 py-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-foreground rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-foreground rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 bg-foreground rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Voice Control Area */}
      <div className="p-6 border-t bg-card/50">
        <div className="flex flex-col items-center gap-4">
          <Button
            size="lg"
            variant={isListening ? "destructive" : "default"}
            onClick={isListening ? stopListening : startListening}
            disabled={isProcessing || isSpeaking}
            className="w-20 h-20 rounded-full shadow-lg"
          >
            {isProcessing ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : isListening ? (
              <MicOff className="w-8 h-8" />
            ) : (
              <Mic className="w-8 h-8" />
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {isListening
              ? "Listening... Tap to stop"
              : isProcessing
              ? "Processing your question..."
              : isSpeaking
              ? "Speaking..."
              : "Tap to start speaking"}
          </p>

          {isSpeaking && (
            <Button variant="outline" size="sm" onClick={stopSpeaking}>
              <VolumeX className="w-4 h-4 mr-2" />
              Stop Speaking
            </Button>
          )}

          {/* Hidden debug note for future: provider chosen */}
          <span className="sr-only">stt:{sttProvider}</span>
        </div>
      </div>
    </div>
  );
}
