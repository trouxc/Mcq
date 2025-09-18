import React, { useState, useCallback, useRef } from 'react';
import { type MCQ } from './types';
import { generateMcqsFromText } from './services/geminiService';
import { Loader } from './components/Loader';
import { McqCard } from './components/McqCard';

declare const pdfjsLib: any;

type AppState = 'welcome' | 'loading' | 'results';
type ResultsMode = 'study' | 'test';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('welcome');
  const [resultsMode, setResultsMode] = useState<ResultsMode>('study');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [testAnswers, setTestAnswers] = useState<Record<number, string>>({});
  const [showTestScore, setShowTestScore] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setError(null);
    } else {
      setPdfFile(null);
      setError('Please select a valid PDF file.');
    }
  };

  const extractTextFromPdf = useCallback(async (file: File): Promise<string> => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n\n';
    }
    return fullText;
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pdfFile) {
      setError('Please select a PDF file first.');
      return;
    }

    setAppState('loading');
    setError(null);
    setMcqs([]);
    setShowTestScore(false);
    setTestAnswers({});

    try {
      const text = await extractTextFromPdf(pdfFile);
      if (text.trim().length < 100) {
        throw new Error("Text extracted from PDF is too short. Please use a more content-rich document.");
      }
      const generatedMcqs = await generateMcqsFromText(text, numQuestions);
      setMcqs(generatedMcqs);
      setAppState('results');
      setResultsMode('study');
    } catch (e: any) {
      console.error(e);
      setError(`An error occurred: ${e.message || 'Failed to generate questions.'}`);
      setAppState('welcome');
    }
  };
  
  const handleTryAgain = () => {
    setAppState('welcome');
    setPdfFile(null);
    setMcqs([]);
    setError(null);
  };

  const handleAnswerSelect = (questionIndex: number, answer: string) => {
    setTestAnswers(prev => ({ ...prev, [questionIndex]: answer }));
  };

  const handleSubmitTest = () => {
    setShowTestScore(true);
  };

  const calculateScore = () => {
    return mcqs.reduce((score, mcq, index) => {
      return score + (testAnswers[index] === mcq.answer ? 1 : 0);
    }, 0);
  };

  const score = calculateScore();

  const renderWelcomeScreen = () => (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-white p-4">
      <div className="text-center">
        <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-300">AI MCQ Generator</h1>
        <p className="mt-4 text-lg text-slate-300 max-w-2xl mx-auto">Transform your PDF documents into interactive quizzes for studying and self-assessment.</p>
      </div>
      <main className="w-full max-w-lg mt-12 bg-slate-800/50 rounded-xl shadow-2xl p-6 sm:p-8 border border-slate-700 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:bg-slate-700/50 hover:border-blue-400 transition-colors">
            <input type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" ref={fileInputRef} />
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg className="w-10 h-10 mb-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
              {pdfFile ? (
                <p className="font-semibold text-blue-300">{pdfFile.name}</p>
              ) : (
                <>
                  <p className="mb-2 text-sm text-slate-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                  <p className="text-xs text-slate-500">PDF (MAX. 5MB)</p>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col">
            <label htmlFor="numQuestions" className="mb-2 font-medium text-slate-300">Number of Questions: <span className="font-bold text-white">{numQuestions}</span></label>
            <input 
              type="range" 
              id="numQuestions" 
              min="3" 
              max="15" 
              value={numQuestions} 
              onChange={(e) => setNumQuestions(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
          <button type="submit" disabled={!pdfFile} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed">
            Generate MCQs
          </button>
          {error && <p className="text-red-400 text-center">{error}</p>}
        </form>
      </main>
    </div>
  );

  const renderLoadingScreen = () => (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-white p-4">
      <Loader />
      <p className="mt-4 text-lg">Generating your study material... this may take a moment.</p>
    </div>
  );

  const renderResultsScreen = () => (
    <div className="min-h-screen w-full bg-slate-100 text-slate-800 pb-20">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex flex-wrap justify-between items-center gap-4">
          <h1 className="text-2xl font-bold text-slate-800">Your Study Zone</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => { setResultsMode('study'); setShowTestScore(false); }} className={`px-4 py-2 rounded-md font-semibold transition-colors ${resultsMode === 'study' ? 'bg-blue-600 text-white' : 'bg-slate-200 hover:bg-slate-300'}`}>
              Study Mode
            </button>
            <button onClick={() => setResultsMode('test')} className={`px-4 py-2 rounded-md font-semibold transition-colors ${resultsMode === 'test' ? 'bg-teal-600 text-white' : 'bg-slate-200 hover:bg-slate-300'}`}>
              Test Mode
            </button>
            <button onClick={handleTryAgain} className="px-4 py-2 rounded-md font-semibold bg-slate-600 text-white hover:bg-slate-700">
              Start Over
            </button>
          </div>
        </div>
      </header>
      <main className="container mx-auto p-4 md:p-8">
        {showTestScore && resultsMode === 'test' && (
          <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-teal-500 mb-8 text-center">
            <h2 className="text-2xl font-bold text-teal-700">Test Complete!</h2>
            <p className="text-4xl font-bold my-2">{score} / {mcqs.length}</p>
            <p className="text-slate-600">You've answered {Object.keys(testAnswers).length} out of {mcqs.length} questions.</p>
          </div>
        )}
        <div className="space-y-6">
          {mcqs.map((mcq, index) => (
            <McqCard 
              key={index} 
              mcq={mcq} 
              index={index} 
              mode={resultsMode}
              userAnswer={testAnswers[index]}
              showAnswer={resultsMode === 'study' || showTestScore}
              onAnswerSelect={handleAnswerSelect}
            />
          ))}
        </div>
        {resultsMode === 'test' && !showTestScore && mcqs.length > 0 && (
          <div className="mt-8 text-center">
            <button onClick={handleSubmitTest} className="bg-teal-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-teal-700 transition-colors shadow-lg">
              Submit Test
            </button>
          </div>
        )}
      </main>
    </div>
  );

  switch(appState) {
    case 'loading': return renderLoadingScreen();
    case 'results': return renderResultsScreen();
    case 'welcome':
    default:
      return renderWelcomeScreen();
  }
};

export default App;
