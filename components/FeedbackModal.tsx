
import React, { useState } from 'react';
import { Star, X, MessageSquare } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'lesson' | 'quiz';
  title: string;
  onSubmit: (rating: number, comment: string) => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, type, title, onSubmit }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSubmit(rating, comment);
    setRating(0);
    setComment('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative">
            <button onClick={onClose} className="absolute right-4 top-4 text-slate-500 hover:text-white transition-colors">
                <X size={20} />
            </button>

            <div className="p-6 text-center">
                <div className="w-12 h-12 mx-auto bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 mb-4">
                    <MessageSquare size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Rate this {type === 'lesson' ? 'Lesson' : 'Quiz'}</h3>
                <p className="text-slate-400 text-sm mb-6">How was your experience with "{title}"?</p>

                <div className="flex justify-center gap-2 mb-6">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            onClick={() => setRating(star)}
                            className={`p-1 transition-all transform ${
                              rating >= star ? 'text-yellow-400 scale-110' : 'text-slate-600 hover:text-slate-500'
                            }`}
                        >
                            <Star size={32} fill={rating >= star ? "currentColor" : "none"} />
                        </button>
                    ))}
                </div>

                <textarea
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none mb-6 resize-none h-24 transition-all"
                    placeholder="Any additional comments? (Optional)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                />

                <button
                    onClick={handleSubmit}
                    disabled={rating === 0}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors"
                >
                    Submit Feedback
                </button>
            </div>
        </div>
    </div>
  );
};
