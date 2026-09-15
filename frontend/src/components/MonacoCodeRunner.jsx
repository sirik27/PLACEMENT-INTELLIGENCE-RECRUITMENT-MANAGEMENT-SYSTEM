import { useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { executeCode } from '../lib/api';

const LANGS = {
  python:     { id: 'python',     version: '3.10.0', monaco: 'python' },
  javascript: { id: 'javascript', version: '18.15.0', monaco: 'javascript' },
  java:       { id: 'java',       version: '15.0.2', monaco: 'java' },
  cpp:        { id: 'c++',        version: '10.2.0', monaco: 'cpp' },
  c:          { id: 'c',          version: '10.2.0', monaco: 'c' },
};

const BOILERPLATE = {
  python:     '# Write your solution here\ndef solve():\n    pass\n\nsolve()',
  javascript: '// Write your solution here\nfunction solve() {\n  \n}\nsolve();',
  java:       'public class Main {\n    public static void main(String[] args) {\n        // solution\n    }\n}',
  cpp:        '#include <iostream>\nusing namespace std;\nint main() {\n    // solution\n    return 0;\n}',
  c:          '#include <stdio.h>\nint main() {\n    // solution\n    return 0;\n}',
};

/* ── Icons ────────────────────────────────────── */
const CheckIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const XIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const PlayIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const RotateIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>;

export default function MonacoCodeRunner({ onSubmit, disabled = false, initialCode = '', initialLang = 'python', testCases = [] }) {
  const [lang, setLang] = useState(initialLang);
  const [code, setCode] = useState(initialCode || BOILERPLATE[initialLang]);
  const [stdin, setStdin] = useState('');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [runningTests, setRunningTests] = useState(false);
  const [activePanel, setActivePanel] = useState(testCases.length > 0 ? 'tests' : 'console');

  const run = useCallback(async () => {
    setRunning(true);
    setOutput('Running code...');
    setActivePanel('console');
    try {
      const l = LANGS[lang];
      const res = await executeCode({ language: l.id, version: l.version, code, stdin });
      const r = res.data;
      setOutput(r.run?.stderr ? `Error:\n${r.run.stderr}` : (r.run?.stdout || '(No output)'));
    } catch (err) {
      setOutput(`Error: ${err.message}`);
    }
    setRunning(false);
  }, [code, lang, stdin]);

  const runAllTests = useCallback(async () => {
    if (testCases.length === 0) return;
    setRunningTests(true);
    setActivePanel('tests');
    const results = [];

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      try {
        const l = LANGS[lang];
        const res = await executeCode({ language: l.id, version: l.version, code, stdin: tc.input || '' });
        const r = res.data;
        const actualOutput = (r.run?.stdout || '').trim();
        const expectedOutput = (tc.expectedOutput || '').trim();
        const passed = actualOutput === expectedOutput;
        results.push({
          id: i,
          input: tc.input || '',
          expected: expectedOutput,
          actual: actualOutput,
          passed,
          hidden: tc.hidden || false,
          error: r.run?.stderr || null,
        });
      } catch (err) {
        results.push({
          id: i, input: tc.input || '', expected: tc.expectedOutput || '',
          actual: '', passed: false, hidden: tc.hidden || false, error: err.message,
        });
      }
    }
    setTestResults(results);
    setRunningTests(false);
  }, [code, lang, testCases]);

  const passedCount = testResults.filter(r => r.passed).length;
  const totalTests = testCases.length;

  const changeLang = (l) => { setLang(l); setCode(BOILERPLATE[l] || ''); setOutput(''); setTestResults([]); };

  return (
    <div className="glass-card code-editor-allowed p-0 overflow-hidden border border-slate-800" id="code-runner">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center gap-3">
          <select className="input-field text-xs w-36" value={lang} onChange={e => changeLang(e.target.value)} disabled={disabled} id="code-lang-select">
            {Object.keys(LANGS).map(l => <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>)}
          </select>
          {totalTests > 0 && testResults.length > 0 && (
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${
              passedCount === totalTests ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              {passedCount === totalTests ? <CheckIcon /> : null}
              {passedCount}/{totalTests} Passed
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary text-xs flex items-center gap-1.5" onClick={() => { setCode(BOILERPLATE[lang]); setOutput(''); setTestResults([]); }} disabled={disabled || running}>
            <RotateIcon /> Reset
          </button>
          <button className="btn btn-primary text-xs flex items-center gap-1.5" onClick={run} disabled={disabled || running} id="btn-run-code">
            <PlayIcon /> {running ? 'Running...' : 'Run Code'}
          </button>
          {totalTests > 0 && (
            <button className="btn text-xs flex items-center gap-1.5 bg-amber-600 text-white border-none hover:bg-amber-500" onClick={runAllTests} disabled={disabled || runningTests}>
              {runningTests ? 'Testing...' : `Run All Tests (${totalTests})`}
            </button>
          )}
          {onSubmit && (
            <button className="btn text-xs bg-emerald-600 text-white border-none hover:bg-emerald-500 flex items-center gap-1.5"
              onClick={() => onSubmit({ code, lang, output, testResults, passedCount, totalTests })} disabled={disabled} id="btn-submit-code">
              Submit Solution
            </button>
          )}
        </div>
      </div>

      {/* Editor */}
      <Editor height="340px" language={LANGS[lang]?.monaco} value={code} onChange={v => setCode(v || '')} theme="vs-dark"
        options={{ minimap: { enabled: false }, fontSize: 14, fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          scrollBeyondLastLine: false, wordWrap: 'on', automaticLayout: true, padding: { top: 12 }, readOnly: disabled }}
      />

      {/* Panel Tabs */}
      <div className="flex items-center gap-1 p-2 border-t border-slate-800 bg-slate-900/40">
        {totalTests > 0 && (
          <button onClick={() => setActivePanel('tests')} className={`tab-pill text-xs ${activePanel === 'tests' ? 'active' : ''}`}>
            Test Cases ({totalTests})
          </button>
        )}
        <button onClick={() => setActivePanel('console')} className={`tab-pill text-xs ${activePanel === 'console' ? 'active' : ''}`}>
          Console Output
        </button>
        <button onClick={() => setActivePanel('stdin')} className={`tab-pill text-xs ${activePanel === 'stdin' ? 'active' : ''}`}>
          Custom Input
        </button>
      </div>

      {/* Test Cases Panel */}
      {activePanel === 'tests' && totalTests > 0 && (
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 space-y-2 max-h-64 overflow-auto">
          {testCases.map((tc, i) => {
            const result = testResults[i];
            const statusClass = result ? (result.passed ? 'passed' : 'failed') : '';
            return (
              <div key={i} className={`test-case-item ${statusClass}`}>
                <div className={`test-case-icon ${statusClass}`}>
                  {result ? (result.passed ? <CheckIcon /> : <XIcon />) : <span style={{ fontSize: '0.65rem', color: 'var(--slate-500)' }}>{i + 1}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-slate-200">
                      Test Case {i + 1} {tc.hidden ? '(Hidden)' : ''}
                    </span>
                    {result && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${result.passed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {result.passed ? 'PASSED' : 'FAILED'}
                      </span>
                    )}
                  </div>
                  {!tc.hidden && (
                    <div className="flex gap-4 text-xs">
                      <div><span className="text-slate-500">Input: </span><span className="font-mono text-slate-300">{tc.input || '(none)'}</span></div>
                      <div><span className="text-slate-500">Expected: </span><span className="font-mono text-slate-300">{tc.expectedOutput}</span></div>
                      {result && <div><span className="text-slate-500">Got: </span><span className={`font-mono ${result.passed ? 'text-emerald-400' : 'text-rose-400'}`}>{result.actual || '(empty)'}</span></div>}
                    </div>
                  )}
                  {result?.error && <div className="text-xs text-rose-400 mt-1 font-mono">{result.error}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Console Output */}
      {activePanel === 'console' && (
        <div className="p-4 border-t border-slate-800 bg-slate-950 space-y-1">
          <label className="text-xs text-slate-400 font-mono block">Console Output</label>
          <pre className="font-mono text-xs text-slate-200 whitespace-pre-wrap max-h-48 overflow-auto" id="code-output">
            {output || 'Run your code to see output here...'}
          </pre>
        </div>
      )}

      {/* Stdin */}
      {activePanel === 'stdin' && (
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 space-y-1">
          <label className="text-xs text-slate-400 font-mono block">Input (stdin)</label>
          <textarea className="input-field text-xs font-mono" rows={3} value={stdin} onChange={e => setStdin(e.target.value)} placeholder="Program input..." disabled={disabled} id="code-stdin" />
        </div>
      )}
    </div>
  );
}
