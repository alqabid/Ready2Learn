
import React, { useState } from 'react';
import { QuizQuestion } from '../types';
import { Check, X, ArrowRight, RefreshCcw, Trophy, MessageSquarePlus } from 'lucide-react';

interface QuizViewProps {
  questions: QuizQuestion[];
  onFinish: (passed: boolean) => void;
  onFeedback: () => void;
}

export const QuizView: React.FC<QuizViewProps> = ({ questions, onFinish, onFeedback }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const currentQuestion = questions[currentIndex];

  const handleOptionClick = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);
    if (idx === currentQuestion.correctOptionIndex) {
      setScore(s => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setShowResult(true);
    }
  };

  const passed = score >= Math.ceil(questions.length * 0.6); // 60% to pass

  if (showResult) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-900 p-8 rounded-2xl border border-slate-800 animate-in fade-in duration-500">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-xl ${passed ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
          <Trophy size={40} className={passed ? 'animate-bounce' : ''} />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">
          {passed ? 'Topic Mastered!' : 'Needs Review'}
        </h2>
        <p className="text-slate-400 mb-8 text-lg">
          You scored <span className="text-white font-bold">{score}</span> out of {questions.length}
        </p>
        
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => onFinish(passed)}
            className="w-full px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25"
          >
            {passed ? 'Next Topic' : 'Retry Topic'} <ArrowRight size={18} />
          </button>
          
          <button
            onClick={onFeedback}
            className="w-full px-8 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <MessageSquarePlus size={18} /> Give Feedback
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full py-8">
      {/* Progress */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm font-medium text-slate-400">Question {currentIndex + 1} of {questions.length}</span>
        <div className="flex gap-1">
          {questions.map((_, idx) => (
            <div 
              key={idx} 
              className={`h-1.5 w-8 rounded-full transition-colors ${
                idx < currentIndex ? 'bg-indigo-500' : 
                idx === currentIndex ? 'bg-white' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-slate-800 rounded-2xl p-8 shadow-xl border border-slate-700 transition-all">
        <h3 className="text-xl font-semibold text-white mb-6 leading-relaxed">
          {currentQuestion.question}
        </h3>

        <div className="space-y-3">
          {currentQuestion.options.map((option, idx) => {
            let stateClass = "border-slate-700 hover:bg-slate-700/50 hover:border-slate-600";
            
            if (isAnswered) {
              if (idx === currentQuestion.correctOptionIndex) {
                stateClass = "border-green-500 bg-green-500/10 text-green-400";
              } else if (idx === selectedOption && idx !== currentQuestion.correctOptionIndex) {
                stateClass = "border-red-500 bg-red-500/10 text-red-400";
              } else {
                stateClass = "border-slate-800 opacity-50";
              }
            } else if (selectedOption === idx) {
              stateClass = "border-indigo-500 bg-indigo-500/10";
            }

            return (
              <button
                key={idx}
                onClick={() => handleOptionClick(idx)}
                disabled={isAnswered}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between ${stateClass}`}
              >
                <span className={isAnswered && idx === currentQuestion.correctOptionIndex ? 'font-semibold' : 'text-slate-300'}>
                  {option}
                </span>
                {isAnswered && idx === currentQuestion.correctOptionIndex && <Check size={20} />}
                {isAnswered && idx === selectedOption && idx !== currentQuestion.correctOptionIndex && <X size={20} />}
              </button>
            );
          })}
        </div>

        {/* Feedback Section */}
        {isAnswered && (
          <div className="mt-6 pt-6 border-t border-slate-700/50 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-slate-900/50 rounded-lg p-4 mb-6 border border-slate-800">
              <p className="text-sm text-slate-400">
                <span className="font-bold text-indigo-400 block mb-1">Explanation:</span>
                {currentQuestion.explanation}
              </p>
            </div>
            <button
              onClick={handleNext}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {currentIndex === questions.length - 1 ? 'See Results' : 'Next Question'} <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
