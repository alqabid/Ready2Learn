import React, { useState, useMemo } from 'react';
import { Chapter, Topic } from '../types';
import { CheckCircle2, Lock, PlayCircle, BookOpen, Trash2, Search } from 'lucide-react';

interface CourseOutlineProps {
  chapters: Chapter[];
  currentTopicId: string | null;
  onSelectTopic: (topic: Topic) => void;
  courseTitle: string;
  progress: number;
  onReset?: () => void;
}

export const CourseOutline: React.FC<CourseOutlineProps> = ({ 
  chapters, 
  currentTopicId, 
  onSelectTopic, 
  courseTitle,
  progress,
  onReset
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) return chapters;
    
    const lowerQuery = searchQuery.toLowerCase();
    
    return chapters.map(chapter => ({
      ...chapter,
      topics: chapter.topics.filter(topic => 
        topic.title.toLowerCase().includes(lowerQuery) || 
        topic.description.toLowerCase().includes(lowerQuery)
      )
    })).filter(chapter => chapter.topics.length > 0);
  }, [chapters, searchQuery]);

  return (
    <div className="w-full md:w-80 bg-slate-900 border-r border-slate-800 flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-indigo-400">
                <BookOpen size={18} />
                <span className="text-xs font-bold tracking-wider uppercase">Course Map</span>
            </div>
            {onReset && (
                <button 
                  onClick={onReset}
                  className="text-slate-600 hover:text-red-400 transition-colors p-1"
                  title="Reset Progress"
                >
                  <Trash2 size={14} />
                </button>
            )}
        </div>
        
        <h2 className="text-lg md:text-xl font-bold text-white mb-4 leading-tight line-clamp-2">
          {courseTitle}
        </h2>
        
        {/* Progress Bar */}
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
          <div 
            className="bg-indigo-500 h-full transition-all duration-700 ease-out" 
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-2 text-right font-mono">{Math.round(progress)}% Complete</p>

        {/* Search Bar */}
        <div className="mt-4 relative">
             <Search className="absolute left-3 top-2.5 text-slate-500 pointer-events-none" size={14} />
             <input 
                type="text" 
                placeholder="Find a topic..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500/50 transition-all"
             />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-700">
        {filteredChapters.length === 0 ? (
            <div className="text-center py-8 px-4 text-slate-500">
                <p className="text-sm">No topics found matching "{searchQuery}"</p>
                <button 
                    onClick={() => setSearchQuery('')}
                    className="mt-2 text-indigo-400 text-xs hover:underline"
                >
                    Clear search
                </button>
            </div>
        ) : (
            filteredChapters.map((chapter) => (
            <div key={chapter.id} className="animate-in slide-in-from-left-2 duration-500">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">
                {chapter.title}
                </h3>
                <div className="space-y-2">
                {chapter.topics.map((topic) => {
                    const isActive = topic.id === currentTopicId;
                    const isClickable = !topic.isLocked;
                    const isCompleted = topic.isCompleted;
                    
                    return (
                    <button
                        key={topic.id}
                        onClick={() => isClickable && onSelectTopic(topic)}
                        disabled={!isClickable}
                        className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all duration-300 group relative
                        ${isActive 
                            ? 'bg-indigo-600/10 border border-indigo-500/50 shadow-sm' 
                            : isCompleted
                                ? 'bg-slate-800/50 border border-green-500/20 hover:bg-slate-800'
                                : 'hover:bg-slate-800 border border-transparent'
                        }
                        ${!isClickable ? 'opacity-40 cursor-not-allowed grayscale' : 'cursor-pointer'}
                        `}
                    >
                        {/* Active Indicator Bar */}
                        {isActive && <div className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-500 rounded-r-full"></div>}
                        
                        <div className="mt-0.5 flex-shrink-0 relative">
                        {isCompleted ? (
                            <div className="relative">
                            <div className="absolute inset-0 bg-green-500 blur-sm opacity-20 rounded-full animate-pulse"></div>
                            <CheckCircle2 className="text-green-500 animate-in zoom-in spin-in-90 duration-500" size={18} />
                            </div>
                        ) : topic.isLocked ? (
                            <Lock className="text-slate-600" size={18} />
                        ) : (
                            <PlayCircle className={`transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-indigo-300'}`} size={18} />
                        )}
                        </div>
                        <div className="min-w-0">
                        <p className={`text-sm font-medium truncate transition-colors ${
                            isActive ? 'text-indigo-100' : 
                            isCompleted ? 'text-slate-400 line-through decoration-slate-600' : 'text-slate-300'
                            }`}>
                            {topic.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                            {topic.description}
                        </p>
                        </div>
                    </button>
                    );
                })}
                </div>
            </div>
            ))
        )}
        
        <div className="h-8"></div> {/* Spacer */}
      </div>
    </div>
  );
};