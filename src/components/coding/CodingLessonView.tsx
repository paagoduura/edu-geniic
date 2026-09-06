import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Code, ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import CodeEditor from './CodeEditor';
import ReactMarkdown from 'react-markdown';

interface Concept {
  name: string;
  explanation: string;
  codeExample: string;
  output: string;
}

interface PracticeProblem {
  id: number;
  title: string;
  description: string;
  hint: string;
  starterCode: string;
  solution: string;
  expectedOutput: string;
}

interface LessonData {
  title: string;
  introduction: string;
  concepts: Concept[];
  practiceProblems: PracticeProblem[];
  summary: string;
}

interface CodingLessonViewProps {
  lesson: LessonData;
  language: string;
  onEvaluateCode: (code: string, problemDesc: string) => Promise<any>;
  onGetHint: (code: string, problemDesc: string) => Promise<string>;
  isEvaluating: boolean;
  onBack: () => void;
  onProgressUpdate?: (solvedCount: number, totalCount: number) => void;
}

const CodingLessonView = ({ lesson, language, onEvaluateCode, onGetHint, isEvaluating, onBack, onProgressUpdate }: CodingLessonViewProps) => {
  const [activeTab, setActiveTab] = useState('learn');
  const [activeProblem, setActiveProblem] = useState(0);
  const [solvedProblems, setSolvedProblems] = useState<Set<number>>(new Set());
  const [currentFeedback, setCurrentFeedback] = useState<any>(null);
  const [currentOutput, setCurrentOutput] = useState('');
  const [hintText, setHintText] = useState('');

  const handleRunCode = async (code: string) => {
    const problem = lesson.practiceProblems[activeProblem];
    const result = await onEvaluateCode(code, `Problem: ${problem.title}\n${problem.description}\nExpected output: ${problem.expectedOutput}`);
    if (result) {
      setCurrentFeedback(result);
      setCurrentOutput(result.output || '');
      if (result.isCorrect) {
        const newSolved = new Set([...solvedProblems, activeProblem]);
        setSolvedProblems(newSolved);
        onProgressUpdate?.(newSolved.size, lesson.practiceProblems.length);
      }
    }
  };

  const handleGetHint = async () => {
    const problem = lesson.practiceProblems[activeProblem];
    const hint = await onGetHint('', `Problem: ${problem.title}\n${problem.description}\nHint from lesson: ${problem.hint}`);
    setHintText(hint);
  };

  const switchProblem = (idx: number) => {
    setActiveProblem(idx);
    setCurrentFeedback(null);
    setCurrentOutput('');
    setHintText('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div>
          <h2 className="text-2xl font-bold">{lesson.title}</h2>
          <p className="text-muted-foreground text-sm">{lesson.introduction}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="learn" className="gap-2">
            <BookOpen className="w-4 h-4" /> Learn
          </TabsTrigger>
          <TabsTrigger value="practice" className="gap-2">
            <Code className="w-4 h-4" /> Practice
            {solvedProblems.size > 0 && (
              <Badge variant="secondary" className="ml-1">{solvedProblems.size}/{lesson.practiceProblems.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="learn" className="space-y-4 mt-4">
          {lesson.concepts.map((concept, idx) => (
            <Card key={idx}>
              <CardHeader>
                <CardTitle className="text-lg">{idx + 1}. {concept.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{concept.explanation}</ReactMarkdown>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Example Code:</p>
                  <pre className="bg-muted p-3 rounded-lg text-sm font-mono overflow-x-auto">{concept.codeExample}</pre>
                </div>
                {concept.output && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Output:</p>
                    <pre className="bg-green-500/10 text-green-700 dark:text-green-300 p-2 rounded text-sm font-mono">{concept.output}</pre>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">📝 Summary</h3>
              <p className="text-sm">{lesson.summary}</p>
            </CardContent>
          </Card>

          <Button className="w-full" onClick={() => setActiveTab('practice')}>
            Ready to Practice! <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </TabsContent>

        <TabsContent value="practice" className="space-y-4 mt-4">
          {/* Problem selector */}
          <div className="flex gap-2 flex-wrap">
            {lesson.practiceProblems.map((problem, idx) => (
              <Button
                key={problem.id}
                variant={activeProblem === idx ? 'default' : 'outline'}
                size="sm"
                onClick={() => switchProblem(idx)}
                className="gap-1"
              >
                {solvedProblems.has(idx) && <CheckCircle className="w-3 h-3 text-green-500" />}
                Problem {idx + 1}
              </Button>
            ))}
          </div>

          {/* Active problem */}
          {lesson.practiceProblems[activeProblem] && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{lesson.practiceProblems[activeProblem].title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">{lesson.practiceProblems[activeProblem].description}</p>

                {hintText && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                    <p className="text-sm">💡 {hintText}</p>
                  </div>
                )}

                <CodeEditor
                  initialCode={lesson.practiceProblems[activeProblem].starterCode}
                  language={language}
                  onRun={handleRunCode}
                  onHint={handleGetHint}
                  isEvaluating={isEvaluating}
                  output={currentOutput}
                  feedback={currentFeedback}
                />

                {solvedProblems.has(activeProblem) && activeProblem < lesson.practiceProblems.length - 1 && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => switchProblem(activeProblem + 1)}
                  >
                    Next Problem <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}

                {solvedProblems.size === lesson.practiceProblems.length && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <h3 className="font-bold text-lg">🎉 All Problems Solved!</h3>
                    <p className="text-sm text-muted-foreground">Great job! You've completed all practice problems.</p>
                    <Button className="mt-3" onClick={onBack}>
                      Try Another Topic
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CodingLessonView;
