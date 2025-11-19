import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, ChevronRight, Volume2, BookOpen, Trophy, RefreshCw, Edit3, ArrowLeft } from 'lucide-react';
import { APP_NAME } from './constants';
import { AppState, FeedbackResult, LessonSegment } from './types';
import { analyzeRecitation } from './services/geminiService';
import AudioVisualizer from './components/AudioVisualizer';
import ResultCard from './components/ResultCard';
import Confetti from './components/Confetti';
import SetupScreen from './components/SetupScreen';

const getSupportedMimeType = () => {
  const types = [
    'audio/webm',
    'audio/webm;codecs=opus',
    'audio/mp4',
    'audio/ogg',
    'audio/wav',
    'audio/aac'
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  // Fallback to empty string to let browser choose default if none match
  return '';
};

const App: React.FC = () => {
  // Navigation State
  const [screen, setScreen] = useState<'SETUP' | 'PRACTICE' | 'COMPLETED'>('SETUP');
  const [lessonData, setLessonData] = useState<LessonSegment[]>([]);
  const [lessonTitle, setLessonTitle] = useState<string>('Custom Lesson');

  // Practice State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);
  const [showEnglish, setShowEnglish] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingMimeTypeRef = useRef<string>('');
  const startTimeRef = useRef<number>(0);
  const toastTimeoutRef = useRef<number>();

  const currentSegment = lessonData[currentIndex];
  const isLastSegment = currentIndex === lessonData.length - 1;

  // Initialize Mic Permission early
  useEffect(() => {
    const getMic = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setAudioStream(stream);
      } catch (err) {
        console.error("Error accessing microphone", err);
      }
    };
    getMic();
  }, []);

  const showToast = (message: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(message);
    toastTimeoutRef.current = window.setTimeout(() => setToastMessage(null), 2000);
  };

  const startLesson = (data: LessonSegment[], title: string = 'Custom Lesson') => {
    setLessonData(data);
    setLessonTitle(title);
    setCurrentIndex(0);
    setTotalScore(0);
    setAttemptCount(0);
    setFeedback(null);
    setShowEnglish(false);
    setAppState(AppState.IDLE);
    setScreen('PRACTICE');
  };

  const returnToSetup = () => {
    setAppState(AppState.IDLE);
    setScreen('SETUP');
  };

  const startRecording = (e: React.SyntheticEvent) => {
    // Crucial: Prevent default to stop mouse emulation on touch devices (prevents double firing)
    if (e.nativeEvent.cancelable) {
      e.preventDefault(); 
    }

    // Prevent handling if already recording to avoid restart issues
    if (appState === AppState.RECORDING || mediaRecorderRef.current?.state === 'recording') {
      return;
    }

    if (!audioStream) {
        alert("Microphone not found. Please allow microphone access.");
        return;
    }
    
    chunksRef.current = [];
    const mimeType = getSupportedMimeType();
    recordingMimeTypeRef.current = mimeType;
    startTimeRef.current = Date.now();
    
    try {
      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(audioStream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const duration = Date.now() - startTimeRef.current;
        const finalMimeType = recordingMimeTypeRef.current || mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: finalMimeType });

        // CHECKS:
        // 1. Duration < 500ms (Tap instead of hold)
        // 2. Blob size < 1000 bytes (Empty/invalid audio, just headers)
        if (duration < 500 || blob.size < 1000) {
          setAppState(AppState.IDLE);
          showToast("Hold button to speak");
          return;
        }

        setAppState(AppState.ANALYZING);
        
        // Convert to Base64
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64String = (reader.result as string);
          // robust split to handle data:audio/xyz;base64, prefix
          const base64data = base64String.split(',')[1];
          
          if (!base64data) {
             setAppState(AppState.IDLE);
             showToast("Audio recording failed");
             return;
          }

          // Pass both English target and Chinese context for semantic analysis
          const result = await analyzeRecitation(
            base64data, 
            currentSegment.english, 
            currentSegment.chinese,
            finalMimeType
          );
          setFeedback(result);
          
          if (result.accuracy >= 80) {
               setTotalScore(prev => prev + result.accuracy);
               setAttemptCount(prev => prev + 1);
          }
          
          setAppState(AppState.FEEDBACK);
        };
      };

      // Start recording - passing 100ms timeslice ensures ondataavailable fires periodically
      // which helps if stop is called very quickly
      mediaRecorder.start(100);
      setAppState(AppState.RECORDING);
    } catch (e) {
      console.error("Failed to create MediaRecorder", e);
      alert("Could not start recording. Please check your browser settings.");
    }
  };

  const stopRecording = (e?: React.SyntheticEvent) => {
    if (e && e.nativeEvent.cancelable) {
      e.preventDefault(); 
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleNext = () => {
    if (isLastSegment) {
      setScreen('COMPLETED');
      setAppState(AppState.COMPLETED);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setAppState(AppState.IDLE);
      setFeedback(null);
      setShowEnglish(false);
    }
  };

  const handleRetry = () => {
    setAppState(AppState.IDLE);
    setFeedback(null);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setAppState(AppState.IDLE);
    setFeedback(null);
    setTotalScore(0);
    setAttemptCount(0);
    setShowEnglish(false);
    setScreen('PRACTICE');
  };

  const calculateFinalScore = () => {
     if (attemptCount === 0) return 0;
     return Math.round(totalScore / attemptCount);
  };

  // --- RENDER: HEADER ---
  const Header = () => (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
      <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={returnToSetup}>
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
            <BookOpen size={18} />
          </div>
          <span className="font-bold text-lg tracking-tight text-slate-800 hidden sm:block">{APP_NAME}</span>
        </div>
        
        {screen !== 'SETUP' && (
          <div className="flex items-center gap-3">
             <div className="text-xs font-semibold text-slate-400 truncate max-w-[150px]">
                {lessonTitle}
             </div>
             <button 
               onClick={returnToSetup}
               className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
               title="Change Lesson"
             >
               <Edit3 size={18} />
             </button>
          </div>
        )}
      </div>
    </header>
  );

  // --- RENDER: COMPLETED STATE ---
  if (screen === 'COMPLETED') {
    const finalScore = calculateFinalScore();
    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        <Header />
        <div className="flex flex-col items-center justify-center pt-12 p-4 relative">
          <Confetti />
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center border border-white/50 backdrop-blur-sm z-10">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6 text-yellow-600 animate-bounce">
              <Trophy size={40} />
            </div>
            <h1 className="text-3xl font-black text-slate-800 mb-2">Lesson Complete!</h1>
            <p className="text-slate-500 mb-8">You've successfully recited all segments.</p>
            
            <div className="bg-indigo-50 rounded-2xl p-6 mb-8">
               <span className="text-sm font-bold text-indigo-400 uppercase tracking-wider">Average Accuracy</span>
               <div className="text-5xl font-black text-indigo-600 mt-2">{finalScore}%</div>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={handleRestart}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw size={20} /> Practice Again
              </button>
              <button 
                onClick={returnToSetup}
                className="w-full py-4 bg-white hover:bg-slate-50 text-slate-600 font-bold rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft size={20} /> Choose New Text
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER: SETUP STATE ---
  if (screen === 'SETUP') {
    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        <Header />
        <SetupScreen onStart={startLesson} />
      </div>
    );
  }

  // --- RENDER: PRACTICE STATE ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Header />

      <main className="max-w-2xl mx-auto p-4 pb-32">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-xs font-medium text-slate-500 mb-2">
            <span>Segment {currentIndex + 1} of {lessonData.length}</span>
            <span>{Math.round(((currentIndex) / lessonData.length) * 100)}% Completed</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 transition-all duration-500 ease-out"
              style={{ width: `${((currentIndex) / lessonData.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 relative overflow-hidden">
          
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
          
          <div className="mb-6">
             <h2 className="text-sm font-bold text-indigo-500 uppercase tracking-wider mb-3">Translate & Recite</h2>
             <p className="text-2xl md:text-3xl font-medium text-slate-800 leading-normal">
               {currentSegment.chinese}
             </p>
          </div>

          {/* Reveal English Hint */}
          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showEnglish ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 text-indigo-800 font-medium">
              {currentSegment.english}
            </div>
          </div>
          
          {!showEnglish && appState === AppState.IDLE && (
            <button 
              onClick={() => setShowEnglish(true)}
              className="text-sm text-slate-400 hover:text-indigo-500 font-medium flex items-center gap-1 mt-2 transition-colors"
            >
              Need a hint?
            </button>
          )}
        </div>

        {/* Feedback Area */}
        {appState === AppState.ANALYZING && (
           <div className="mt-6 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-4 animate-pulse">
             <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
             <p className="text-slate-500 font-medium">Analyzing your pronunciation...</p>
           </div>
        )}

        {appState === AppState.FEEDBACK && feedback && (
          <ResultCard 
            result={feedback} 
            onNext={handleNext}
            onRetry={handleRetry}
            isLast={isLastSegment}
          />
        )}
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-fade-in z-50 whitespace-nowrap">
          {toastMessage}
        </div>
      )}

      {/* Bottom Control Bar */}
      {appState !== AppState.FEEDBACK && appState !== AppState.ANALYZING && (
        <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 pb-safe select-none">
          <div className="max-w-2xl mx-auto flex items-center gap-4">
            {/* Visualizer takes remaining space */}
            <div className="flex-1 h-16 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 relative">
               {!audioStream ? (
                 <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                   Waiting for microphone...
                 </div>
               ) : (
                  <AudioVisualizer stream={audioStream} isRecording={appState === AppState.RECORDING} />
               )}
            </div>

            {/* Main Action Button */}
            <button
              onMouseDown={startRecording}
              onMouseUp={(e) => stopRecording(e)}
              onMouseLeave={(e) => stopRecording(e)}
              onTouchStart={startRecording}
              onTouchEnd={(e) => stopRecording(e)}
              onContextMenu={(e) => e.preventDefault()}
              disabled={!audioStream}
              className={`
                h-16 w-16 rounded-2xl flex items-center justify-center shadow-lg transition-all transform active:scale-95
                ${appState === AppState.RECORDING 
                  ? 'bg-red-500 shadow-red-200 text-white ring-4 ring-red-100 scale-110' 
                  : 'bg-indigo-600 shadow-indigo-200 text-white hover:bg-indigo-700'}
                disabled:opacity-50 disabled:cursor-not-allowed touch-none select-none
              `}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {appState === AppState.RECORDING ? (
                <Square fill="currentColor" size={24} />
              ) : (
                <Mic size={28} />
              )}
            </button>
          </div>
          <div className="max-w-2xl mx-auto text-center mt-2">
             <span className="text-xs font-medium text-slate-400">
               {appState === AppState.RECORDING ? 'Release to stop' : 'Hold to speak'}
             </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;