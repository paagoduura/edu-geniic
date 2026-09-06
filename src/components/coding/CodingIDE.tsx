import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, RotateCcw, Save, Download, Plus, X, Eye, Code, Terminal, FileCode, Loader2 } from 'lucide-react';
import CodeEditor from './CodeEditor';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface IDEFile {
  id: string;
  name: string;
  language: string;
  code: string;
}

const DEFAULT_FILES: Record<string, IDEFile[]> = {
  web: [
    { id: 'html', name: 'index.html', language: 'html', code: '<!DOCTYPE html>\n<html>\n<head>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <h1>Hello World!</h1>\n  <p>Start building your webpage here.</p>\n  <script src="script.js"></script>\n</body>\n</html>' },
    { id: 'css', name: 'style.css', language: 'css', code: 'body {\n  font-family: sans-serif;\n  margin: 2rem;\n  background: #f0f4f8;\n  color: #1a202c;\n}\n\nh1 {\n  color: #2b6cb0;\n}' },
    { id: 'js', name: 'script.js', language: 'javascript', code: '// Your JavaScript code here\nconsole.log("Hello from JavaScript!");\n\ndocument.querySelector("h1").addEventListener("click", () => {\n  alert("You clicked the heading!");\n});' },
  ],
  javascript: [
    { id: 'main', name: 'main.js', language: 'javascript', code: '// JavaScript Playground\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\n\nconsole.log(greet("Student"));\nconsole.log("Start coding here!");' },
  ],
  python: [
    { id: 'main', name: 'main.py', language: 'python', code: '# Python Playground\ndef greet(name):\n    return f"Hello, {name}!"\n\nprint(greet("Student"))\nprint("Start coding here!")' },
  ],
  react: [
    { id: 'app', name: 'App.jsx', language: 'react', code: 'function App() {\n  const [count, setCount] = React.useState(0);\n\n  return (\n    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>\n      <h1>React App</h1>\n      <p>Count: {count}</p>\n      <button onClick={() => setCount(count + 1)}>\n        Click me!\n      </button>\n    </div>\n  );\n}' },
  ],
};

const TEMPLATES = [
  { id: 'web', label: '🌐 Web (HTML/CSS/JS)', icon: '🌐' },
  { id: 'javascript', label: '🟨 JavaScript', icon: '🟨' },
  { id: 'python', label: '🐍 Python', icon: '🐍' },
  { id: 'react', label: '⚛️ React', icon: '⚛️' },
];

const CodingIDE = () => {
  const { toast } = useToast();
  const [template, setTemplate] = useState('web');
  const [files, setFiles] = useState<IDEFile[]>(DEFAULT_FILES.web);
  const [activeFileId, setActiveFileId] = useState('html');
  const [output, setOutput] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [activePanel, setActivePanel] = useState<'preview' | 'console'>('preview');
  const [isRunning, setIsRunning] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const activeFile = files.find(f => f.id === activeFileId) || files[0];

  const handleTemplateChange = (t: string) => {
    setTemplate(t);
    const newFiles = DEFAULT_FILES[t] || DEFAULT_FILES.web;
    setFiles(newFiles);
    setActiveFileId(newFiles[0].id);
    setOutput('');
    setPreviewHtml('');
  };

  const updateFileCode = useCallback((code: string) => {
    setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, code } : f));
  }, [activeFileId]);

  const runCode = useCallback(() => {
    setIsRunning(true);
    setOutput('');

    if (template === 'web') {
      const htmlFile = files.find(f => f.language === 'html');
      const cssFile = files.find(f => f.language === 'css');
      const jsFile = files.find(f => f.language === 'javascript');

      let html = htmlFile?.code || '';
      // Inject CSS inline
      if (cssFile) {
        html = html.replace('</head>', `<style>${cssFile.code}</style></head>`);
      }
      // Replace script src with inline
      if (jsFile) {
        html = html.replace(/<script src="script\.js"><\/script>/i, '');
        const consoleOverride = `
          <script>
            const __logs = [];
            const __origConsole = console.log;
            console.log = (...args) => {
              __logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
              __origConsole(...args);
              window.parent.postMessage({ type: 'console', logs: __logs }, '*');
            };
            console.error = (...args) => {
              __logs.push('ERROR: ' + args.join(' '));
              window.parent.postMessage({ type: 'console', logs: __logs }, '*');
            };
            window.onerror = (msg) => {
              __logs.push('ERROR: ' + msg);
              window.parent.postMessage({ type: 'console', logs: __logs }, '*');
            };
          </script>
        `;
        html = html.replace('<body>', `<body>${consoleOverride}`);
        html = html.replace('</body>', `<script>${jsFile.code}</script></body>`);
      }
      setPreviewHtml(html);
      setActivePanel('preview');
    } else if (template === 'javascript' || template === 'react') {
      // Simulate JS execution via console capture
      const code = activeFile.code;
      try {
        const logs: string[] = [];
        const mockConsole = {
          log: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
          error: (...args: any[]) => logs.push('ERROR: ' + args.join(' ')),
        };
        const fn = new Function('console', code);
        fn(mockConsole);
        setOutput(logs.join('\n') || 'No output');
      } catch (err: any) {
        setOutput(`Error: ${err.message}`);
      }
      setActivePanel('console');
    } else {
      // For Python, use edge function
      setOutput('⏳ Python execution requires AI evaluation...');
      setActivePanel('console');
    }
    setIsRunning(false);
  }, [template, files, activeFile]);

  const handleAIReview = async () => {
    setIsEvaluating(true);
    try {
      const allCode = files.map(f => `// ${f.name}\n${f.code}`).join('\n\n');
      const { data, error } = await supabase.functions.invoke('coding-lesson', {
        body: { action: 'evaluate_code', language: activeFile.language, code: allCode, lessonContent: 'Free coding practice in IDE. Review the code for quality, bugs, and best practices.' },
      });
      if (error) throw error;
      setOutput(data?.feedback || data?.raw || 'Code looks good!');
      setActivePanel('console');
    } catch {
      toast({ title: 'Error', description: 'Failed to get AI review', variant: 'destructive' });
    } finally {
      setIsEvaluating(false);
    }
  };

  // Listen for console messages from iframe
  const handleMessage = useCallback((e: MessageEvent) => {
    if (e.data?.type === 'console') {
      setOutput(e.data.logs.join('\n'));
    }
  }, []);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  const addFile = () => {
    const name = prompt('File name (e.g., utils.js):');
    if (!name) return;
    const ext = name.split('.').pop() || 'js';
    const langMap: Record<string, string> = { js: 'javascript', ts: 'typescript', jsx: 'react', tsx: 'react', py: 'python', html: 'html', css: 'css' };
    const newFile: IDEFile = { id: `file-${Date.now()}`, name, language: langMap[ext] || 'javascript', code: `// ${name}\n` };
    setFiles(prev => [...prev, newFile]);
    setActiveFileId(newFile.id);
  };

  const removeFile = (id: string) => {
    if (files.length <= 1) return;
    setFiles(prev => prev.filter(f => f.id !== id));
    if (activeFileId === id) setActiveFileId(files[0].id);
  };

  const downloadProject = () => {
    const content = files.map(f => `=== ${f.name} ===\n${f.code}`).join('\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-project.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-[calc(100vh-60px)] flex flex-col">
      {/* IDE Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-card/80 backdrop-blur-sm flex-wrap">
        <Select value={template} onValueChange={handleTemplateChange}>
          <SelectTrigger className="w-[180px] h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TEMPLATES.map(t => (
              <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Button size="sm" variant="outline" onClick={addFile} className="h-8 gap-1">
          <Plus className="w-3 h-3" /> File
        </Button>
        <Button size="sm" variant="outline" onClick={downloadProject} className="h-8 gap-1">
          <Download className="w-3 h-3" /> Export
        </Button>
        <Button size="sm" variant="outline" onClick={handleAIReview} disabled={isEvaluating} className="h-8 gap-1">
          {isEvaluating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Code className="w-3 h-3" />}
          AI Review
        </Button>
        <Button size="sm" onClick={runCode} disabled={isRunning} className="h-8 gap-1 bg-green-600 hover:bg-green-700 text-white">
          <Play className="w-3 h-3" /> Run
        </Button>
      </div>

      {/* File Tabs */}
      <div className="flex items-center gap-0.5 px-2 py-1 border-b bg-muted/30 overflow-x-auto">
        {files.map(f => (
          <div
            key={f.id}
            className={`flex items-center gap-1 px-3 py-1 text-xs rounded-t cursor-pointer border border-b-0 transition-colors ${
              f.id === activeFileId ? 'bg-card border-border text-foreground' : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted'
            }`}
            onClick={() => setActiveFileId(f.id)}
          >
            <FileCode className="w-3 h-3" />
            {f.name}
            {files.length > 1 && (
              <X className="w-3 h-3 hover:text-destructive ml-1" onClick={(e) => { e.stopPropagation(); removeFile(f.id); }} />
            )}
          </div>
        ))}
      </div>

      {/* Main Editor Area */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={55} minSize={30}>
          <div className="h-full">
            <CodeEditor
              key={activeFileId}
              initialCode={activeFile.code}
              language={activeFile.language}
              onRun={(code) => { updateFileCode(code); runCode(); }}
              isEvaluating={isRunning}
            />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={45} minSize={20}>
          <div className="h-full flex flex-col">
            <div className="flex items-center border-b">
              <button
                className={`px-4 py-2 text-xs font-medium transition-colors ${activePanel === 'preview' ? 'bg-card border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setActivePanel('preview')}
              >
                <Eye className="w-3 h-3 inline mr-1" /> Preview
              </button>
              <button
                className={`px-4 py-2 text-xs font-medium transition-colors ${activePanel === 'console' ? 'bg-card border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setActivePanel('console')}
              >
                <Terminal className="w-3 h-3 inline mr-1" /> Console
              </button>
            </div>

            {activePanel === 'preview' ? (
              <div className="flex-1 bg-white">
                {previewHtml ? (
                  <iframe
                    ref={iframeRef}
                    srcDoc={previewHtml}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-modals"
                    title="Preview"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    <div className="text-center">
                      <Eye className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p>Click <strong>Run</strong> to see your output here</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <ScrollArea className="flex-1 bg-card">
                <pre className="p-3 text-sm font-mono whitespace-pre-wrap text-foreground">
                  {output || 'Console output will appear here...'}
                </pre>
              </ScrollArea>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default CodingIDE;
