import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Play, RotateCcw, Lightbulb, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-python';

interface CodeEditorProps {
  initialCode?: string;
  language: string;
  onRun: (code: string) => void;
  onHint?: () => void;
  isEvaluating?: boolean;
  output?: string;
  feedback?: {
    isCorrect: boolean;
    feedback: string;
    hints?: string[];
    correctedCode?: string;
  } | null;
}

const languageToPrism: Record<string, string> = {
  javascript: 'javascript',
  python: 'python',
  html: 'markup',
  css: 'css',
  react: 'jsx',
  typescript: 'typescript',
  'react-native': 'jsx',
  expo: 'jsx',
};

const CodeEditor = ({ initialCode = '', language, onRun, onHint, isEvaluating, output, feedback }: CodeEditorProps) => {
  const [code, setCode] = useState(initialCode);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  const syncScroll = useCallback(() => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  const lineCount = code.split('\n').length;

  const getHighlightedCode = useCallback(() => {
    const prismLang = languageToPrism[language] || 'javascript';
    const grammar = Prism.languages[prismLang];
    if (!grammar) return code;
    return Prism.highlight(code, grammar, prismLang);
  }, [code, language]);

  const autoClosePairs: Record<string, string> = {
    '(': ')',
    '[': ']',
    '{': '}',
    '"': '"',
    "'": "'",
    '`': '`',
    '<': '>',
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const ta = e.currentTarget as HTMLTextAreaElement;
    const selStart = ta.selectionStart;
    const selEnd = ta.selectionEnd;

    if (e.key === 'Tab') {
      e.preventDefault();
      const newCode = code.substring(0, selStart) + '  ' + code.substring(selEnd);
      setCode(newCode);
      setTimeout(() => {
        ta.selectionStart = ta.selectionEnd = selStart + 2;
      }, 0);
      return;
    }

    // Auto-close brackets and quotes
    const closeChar = autoClosePairs[e.key];
    if (closeChar) {
      // For quotes, skip if the next char is the same quote (closing existing)
      const nextChar = code[selStart];
      if ((e.key === '"' || e.key === "'" || e.key === '`') && nextChar === e.key) {
        e.preventDefault();
        setTimeout(() => {
          ta.selectionStart = ta.selectionEnd = selStart + 1;
        }, 0);
        return;
      }
      // For < only auto-close in HTML-like languages
      if (e.key === '<' && !['html', 'react', 'react-native', 'expo'].includes(language)) {
        return;
      }
      e.preventDefault();
      const selectedText = code.substring(selStart, selEnd);
      const newCode = code.substring(0, selStart) + e.key + selectedText + closeChar + code.substring(selEnd);
      setCode(newCode);
      setTimeout(() => {
        ta.selectionStart = ta.selectionEnd = selStart + 1;
      }, 0);
      return;
    }

    // Skip over closing bracket/quote if typed and already next char
    const closingChars = [')', ']', '}', '"', "'", '`', '>'];
    if (closingChars.includes(e.key) && code[selStart] === e.key) {
      e.preventDefault();
      setTimeout(() => {
        ta.selectionStart = ta.selectionEnd = selStart + 1;
      }, 0);
      return;
    }

    // Auto-indent on Enter after {
    if (e.key === 'Enter') {
      const before = code.substring(0, selStart);
      const after = code.substring(selStart);
      const lastLine = before.split('\n').pop() || '';
      const indent = lastLine.match(/^(\s*)/)?.[1] || '';
      if (before.endsWith('{') && after.startsWith('}')) {
        e.preventDefault();
        const newCode = before + '\n' + indent + '  \n' + indent + after;
        setCode(newCode);
        setTimeout(() => {
          ta.selectionStart = ta.selectionEnd = selStart + 1 + indent.length + 2;
        }, 0);
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="flex items-center justify-between bg-muted px-3 py-2 rounded-t-lg border border-b-0 border-border">
          <span className="text-xs font-mono text-muted-foreground uppercase">{language}</span>
          <div className="flex gap-2">
            {onHint && (
              <Button variant="ghost" size="sm" onClick={onHint} disabled={isEvaluating}>
                <Lightbulb className="w-4 h-4 mr-1 text-yellow-500" />
                Hint
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setCode(initialCode)}>
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
          </div>
        </div>
        <div className="relative rounded-b-lg border border-border overflow-hidden flex">
          {/* Line numbers */}
          <div
            className="select-none bg-muted/50 text-muted-foreground font-mono text-sm leading-relaxed text-right py-3 px-2 border-r border-border shrink-0"
            aria-hidden="true"
          >
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i + 1}>{i + 1}</div>
            ))}
          </div>
          <div className="relative flex-1 overflow-hidden">
            {/* Highlighted layer */}
            <pre
              ref={preRef}
              aria-hidden="true"
              className="absolute inset-0 m-0 p-3 font-mono text-sm leading-relaxed overflow-auto pointer-events-none bg-[hsl(var(--card))]"
              style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}
            >
              <code
                dangerouslySetInnerHTML={{ __html: getHighlightedCode() + '\n' }}
              />
            </pre>
            {/* Editable textarea */}
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleKeyDown}
              onScroll={syncScroll}
              className="relative w-full min-h-[200px] p-3 font-mono text-sm leading-relaxed resize-y bg-transparent text-transparent caret-foreground outline-none"
              placeholder={`Write your ${language} code here...`}
              spellCheck={false}
              style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}
            />
          </div>
        </div>
      </div>

      <Button
        onClick={() => onRun(code)}
        disabled={isEvaluating || !code.trim()}
        className="w-full"
      >
        {isEvaluating ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking your code...</>
        ) : (
          <><Play className="w-4 h-4 mr-2" /> Run & Check Code</>
        )}
      </Button>

      {(output || feedback) && (
        <div className={cn(
          "rounded-lg border p-4 space-y-2",
          feedback?.isCorrect
            ? "bg-green-500/10 border-green-500/30"
            : feedback && !feedback.isCorrect
              ? "bg-orange-500/10 border-orange-500/30"
              : "bg-muted border-border"
        )}>
          {output && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Output:</p>
              <pre className="text-sm font-mono whitespace-pre-wrap bg-background/50 p-2 rounded">{output}</pre>
            </div>
          )}
          {feedback && (
            <div>
              <p className={cn(
                "font-semibold text-sm",
                feedback.isCorrect ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"
              )}>
                {feedback.isCorrect ? '✅ Correct!' : '🔄 Not quite right'}
              </p>
              <p className="text-sm mt-1">{feedback.feedback}</p>
              {feedback.hints && feedback.hints.length > 0 && !feedback.isCorrect && (
                <div className="mt-2">
                  <p className="text-xs font-semibold text-muted-foreground">💡 Hints:</p>
                  <ul className="text-sm list-disc list-inside space-y-1 mt-1">
                    {feedback.hints.map((hint, i) => (
                      <li key={i}>{hint}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CodeEditor;
