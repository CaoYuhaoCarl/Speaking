import React from 'react';
import { FeedbackResult } from '../types';
import { CheckCircle, XCircle, AlertCircle, Sparkles } from 'lucide-react';

interface ResultCardProps {
  result: FeedbackResult;
  onNext: () => void;
  onRetry: () => void;
  isLast: boolean;
}

const ResultCard: React.FC<ResultCardProps> = ({ result, onNext, onRetry, isLast }) => {
  const isGood = result.accuracy >= 80;
  const isPerfect = result.accuracy === 100;

  return (
    <div className="w-full bg-white rounded-2xl shadow-lg border border-slate-100 p-6 mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Score */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {isGood ? (
            <div className="p-2 bg-green-100 rounded-full text-green-600">
              {isPerfect ? <Sparkles size={24} /> : <CheckCircle size={24} />}
            </div>
          ) : (
            <div className="p-2 bg-orange-100 rounded-full text-orange-600">
              <AlertCircle size={24} />
            </div>
          )}
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              {isGood ? "Great Job!" : "Keep Practicing!"}
            </h3>
            <p className="text-sm text-slate-500">{result.encouragement}</p>
          </div>
        </div>
        <div className={`text-3xl font-black ${isGood ? 'text-green-500' : 'text-orange-500'}`}>
          {result.accuracy}%
        </div>
      </div>

      {/* Transcription vs Reality */}
      <div className="space-y-3 mb-6">
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-xs uppercase font-semibold text-slate-400 mb-1">You said:</p>
          <p className="text-slate-700 font-medium leading-relaxed">"{result.transcription}"</p>
        </div>
        
        {result.corrections.length > 0 && (
          <div className="bg-red-50 rounded-lg p-3 border border-red-100">
            <p className="text-xs uppercase font-semibold text-red-400 mb-1">Watch out for:</p>
            <ul className="list-disc list-inside text-sm text-red-700">
              {result.corrections.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onRetry}
          className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
        >
          Try Again
        </button>
        <button
          onClick={onNext}
          className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2"
        >
          {isLast ? 'Finish Lesson' : 'Next Sentence'}
        </button>
      </div>
    </div>
  );
};

export default ResultCard;
