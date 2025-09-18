import React, { useState, useCallback } from 'react';
import { type MCQ } from '../types';
import { translateText } from '../services/geminiService';
import { Loader } from './Loader';

interface McqCardProps {
  mcq: MCQ;
  index: number;
  mode: 'study' | 'test';
  userAnswer?: string;
  showAnswer?: boolean;
  onAnswerSelect?: (questionIndex: number, selectedOption: string) => void;
}

interface Translation {
  question: string;
  options: string[];
}

export const McqCard: React.FC<McqCardProps> = ({ mcq, index, mode, userAnswer, showAnswer, onAnswerSelect }) => {
  const [translation, setTranslation] = useState<Translation | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);

  const handleTranslate = useCallback(async () => {
    if (translation) {
      setShowTranslation(prev => !prev);
      return;
    }
    
    setIsTranslating(true);
    try {
      const [tQuestion, ...tOptions] = await Promise.all([
        translateText(mcq.question),
        ...mcq.options.map(opt => translateText(opt))
      ]);
      setTranslation({ question: tQuestion, options: tOptions });
      setShowTranslation(true);
    } catch (error) {
      console.error("Translation failed for card", index, error);
      // Optionally set an error state to show in the UI
    } finally {
      setIsTranslating(false);
    }
  }, [mcq, index, translation]);

  const getOptionClasses = (option: string) => {
    const isSelected = userAnswer === option;

    // In Test mode AFTER submission or in Study mode
    if (showAnswer) {
      if (option === mcq.answer) {
        return 'bg-green-100 border-green-500 text-green-800 font-semibold'; // Correct answer
      }
      if (isSelected && option !== mcq.answer) {
        return 'bg-red-100 border-red-500 text-red-800'; // Incorrectly selected answer
      }
      return 'border-slate-300 text-slate-500 bg-slate-50'; // Not selected, not the answer
    }
    
    // In Test mode BEFORE submission
    if (isSelected) {
      return 'bg-blue-100 border-blue-500'; // Selected by user
    }
    
    return 'border-slate-300 hover:bg-slate-200 hover:border-slate-400';
  };

  const isTestModeActive = mode === 'test' && !showAnswer;

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200 transition-all duration-300 hover:shadow-lg hover:border-teal-300">
      <div className="flex justify-between items-start">
        <div className="flex-grow">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
                <span className="font-bold text-teal-600">{index + 1}.</span> {mcq.question}
            </h3>
            {showTranslation && translation && (
                <p className="text-md font-medium text-slate-600 mb-4 rtl-text">{translation.question}</p>
            )}
        </div>
        <button onClick={handleTranslate} disabled={isTranslating} className="ml-4 px-3 py-1 text-sm border border-slate-300 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-50 flex items-center h-8">
            {isTranslating ? <Loader /> : (showTranslation ? 'Show Original' : 'Translate to Arabic')}
        </button>
      </div>

      <div className="space-y-3">
        {mcq.options.map((option, i) => (
          <button
            key={i}
            onClick={() => onAnswerSelect && onAnswerSelect(index, option)}
            disabled={!isTestModeActive}
            className={`w-full text-left p-3 border rounded-lg transition-colors duration-200 ${getOptionClasses(option)} ${!isTestModeActive ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <span>{option}</span>
            {showTranslation && translation && (
                <span className="block text-right rtl-text text-slate-500 mt-1">{translation.options[i]}</span>
            )}
          </button>
        ))}
      </div>
      {showAnswer && mode === 'study' && (
         <div className="mt-4 p-3 bg-yellow-50 border-r-4 border-yellow-400 rounded">
            <p className="text-sm font-medium text-yellow-800">Correct Answer: <span className="font-bold">{mcq.answer}</span></p>
            {showTranslation && translation && (
                <p className="text-sm font-medium text-yellow-800 rtl-text mt-1">الإجابة الصحيحة: <span className="font-bold">{translation.options[mcq.options.indexOf(mcq.answer)]}</span></p>
            )}
        </div>
      )}
    </div>
  );
};
