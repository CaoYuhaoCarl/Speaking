import React, { useState, useEffect } from 'react';
import { Play, FileText, Sparkles, RotateCw, CheckSquare, Square, Shuffle, ListOrdered, ArrowLeft, Check } from 'lucide-react';
import { DEFAULT_RAW_TEXT } from '../constants';
import { parseLearningContent } from '../services/geminiService';
import { LessonSegment } from '../types';

interface SetupScreenProps {
  onStart: (data: LessonSegment[], title?: string) => void;
}

type SetupStep = 'INPUT' | 'CONFIG';

const SetupScreen: React.FC<SetupScreenProps> = ({ onStart }) => {
  const [step, setStep] = useState<SetupStep>('INPUT');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Config State
  const [parsedSegments, setParsedSegments] = useState<LessonSegment[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isShuffle, setIsShuffle] = useState(false);
  const [generatedTitle, setGeneratedTitle] = useState('Custom Lesson');

  // Automatically select all when segments are loaded
  useEffect(() => {
    if (parsedSegments.length > 0) {
      setSelectedIds(new Set(parsedSegments.map(s => s.id)));
    }
  }, [parsedSegments]);

  const handleAnalyze = async () => {
    if (!input.trim()) {
      setError("Please enter some text first.");
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const rawSegments = await parseLearningContent(input);
      
      // Add IDs to segments
      const segments: LessonSegment[] = rawSegments.map((seg, index) => ({
        id: index + 1,
        english: seg.english,
        chinese: seg.chinese
      }));

      // Generate a simple title
      const title = input.split('\n')[0].slice(0, 30) + (input.length > 30 ? '...' : '');
      
      setParsedSegments(segments);
      setGeneratedTitle(title);
      setStep('CONFIG'); // Move to config step
    } catch (err) {
      console.error(err);
      setError("Failed to analyze text. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadExample = () => {
    setInput(DEFAULT_RAW_TEXT);
    setError(null);
  };

  const toggleSegment = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === parsedSegments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(parsedSegments.map(s => s.id)));
    }
  };

  const handleStartLesson = () => {
    if (selectedIds.size === 0) return;

    // 1. Filter selected
    let finalSegments = parsedSegments.filter(s => selectedIds.has(s.id));

    // 2. Shuffle if enabled (Fisher-Yates shuffle)
    if (isShuffle) {
      for (let i = finalSegments.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [finalSegments[i], finalSegments[j]] = [finalSegments[j], finalSegments[i]];
      }
    }

    onStart(finalSegments, generatedTitle);
  };

  // --- VIEW: INPUT STEP ---
  if (step === 'INPUT') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Create Your Lesson</h1>
            <p className="text-slate-500">Paste any English text below. AI will segment it and generate translations for you to recite.</p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste English text here (e.g., a story, news article, or essay)..."
                className="w-full h-64 p-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none resize-none transition-all text-slate-700 leading-relaxed"
                disabled={isLoading}
              />
              <button 
                onClick={loadExample}
                className="absolute bottom-4 right-4 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                Load Example
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                 <span className="font-bold">Error:</span> {error}
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={isLoading || !input.trim()}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 text-lg"
            >
              {isLoading ? (
                <>
                  <RotateCw className="animate-spin" /> Analyzing Content...
                </>
              ) : (
                <>
                  <Sparkles size={20} /> Prepare Lesson
                </>
              )}
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              Powered by Gemini AI • Generates translation & segmentation automatically
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW: CONFIG STEP ---
  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white z-10">
           <button 
             onClick={() => setStep('INPUT')}
             className="p-2 -ml-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
           >
             <ArrowLeft size={24} />
           </button>
           <h2 className="font-bold text-lg text-slate-800">Configure Lesson</h2>
           <div className="w-10"></div> {/* Spacer for centering */}
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Select Segments</h3>
            <button 
              onClick={toggleSelectAll}
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
            >
              {selectedIds.size === parsedSegments.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="space-y-3">
            {parsedSegments.map((seg) => {
              const isSelected = selectedIds.has(seg.id);
              return (
                <div 
                  key={seg.id}
                  onClick={() => toggleSegment(seg.id)}
                  className={`
                    p-4 rounded-xl border cursor-pointer transition-all duration-200 flex gap-4 items-start group
                    ${isSelected 
                      ? 'bg-white border-indigo-200 shadow-sm ring-1 ring-indigo-100' 
                      : 'bg-slate-100 border-transparent opacity-60 hover:opacity-100'}
                  `}
                >
                  <div className={`mt-1 transition-colors ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}>
                    {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                  </div>
                  <div>
                    <p className={`font-medium text-sm ${isSelected ? 'text-slate-800' : 'text-slate-500'}`}>
                      {seg.english}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {seg.chinese}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-200 bg-white z-10">
          <div className="flex items-center justify-between mb-6 bg-slate-50 p-1 rounded-lg border border-slate-200 max-w-xs mx-auto">
            <button
              onClick={() => setIsShuffle(false)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all ${!isShuffle ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <ListOrdered size={16} /> Sequential
            </button>
            <button
              onClick={() => setIsShuffle(true)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all ${isShuffle ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Shuffle size={16} /> Shuffle
            </button>
          </div>

          <button
            onClick={handleStartLesson}
            disabled={selectedIds.size === 0}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 text-lg"
          >
            <Play fill="currentColor" size={20} />
            Start Practice ({selectedIds.size})
          </button>
        </div>
        
      </div>
    </div>
  );
};

export default SetupScreen;