
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { LessonState, Topic } from '../types';
import { Play, Pause, ChevronRight, Loader2, Volume2, Volume1, VolumeX, FileText, Maximize2, Star } from 'lucide-react';

interface LessonPlayerProps {
  topic: Topic;
  state: LessonState;
  onComplete: () => void;
  onFeedback: () => void;
}

export const LessonPlayer: React.FC<LessonPlayerProps> = ({ topic, state, onComplete, onFeedback }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  // Prepare transcript data for karaoke effect
  const transcriptData = useMemo(() => {
    if (!state.content?.script) return { paragraphs: [], totalWords: 0 };
    
    const rawParagraphs = state.content.script.split('\n').filter(p => p.trim());
    let wordCountAccumulator = 0;
    
    const paragraphs = rawParagraphs.map(text => {
      const words = text.split(/\s+/).filter(w => w.length > 0);
      const start = wordCountAccumulator;
      wordCountAccumulator += words.length;
      return { text, words, start, end: wordCountAccumulator };
    });

    return { paragraphs, totalWords: wordCountAccumulator };
  }, [state.content?.script]);

  // Calculate current word index based on audio progress
  const currentWordIndex = Math.floor((progress / 100) * transcriptData.totalWords);

  useEffect(() => {
    // Reset state when URL changes
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
    
    if (state.audioUrl && audioRef.current) {
      audioRef.current.src = state.audioUrl;
      audioRef.current.load();
      // Mobile browsers block autoplay often, so we don't auto-play unless triggered by user gesture.
      // However, if the user clicked a topic to get here, we might be able to play if loading was fast.
      // For safety in hybrid apps, we let the user press play, or try catching the error.
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(e => console.log("Autoplay prevented by policy, waiting for interaction"));
      }
    }
  }, [state.audioUrl]);

  // Volume Effect
  useEffect(() => {
      if (audioRef.current) {
          audioRef.current.volume = isMuted ? 0 : volume;
      }
  }, [volume, isMuted]);

  // Auto-scroll transcript
  useEffect(() => {
    if (isPlaying && transcriptRef.current) {
       const scrollHeight = transcriptRef.current.scrollHeight;
       const clientHeight = transcriptRef.current.clientHeight;
       const maxScroll = scrollHeight - clientHeight;
       
       if (maxScroll > 0) {
           // Smoothly scroll proportional to progress
           transcriptRef.current.scrollTo({
               top: (progress / 100) * maxScroll,
               behavior: 'smooth'
           });
       }
    }
  }, [progress, isPlaying]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
      setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      setVolume(val);
      if (val > 0) setIsMuted(false);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration;
      if (total > 0 && !isNaN(total)) {
        setProgress((current / total) * 100);
        setDuration(total);
      }
      
      if (current >= total && total > 0) {
        setIsPlaying(false);
      }
    }
  };
  
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!audioRef.current || !duration) return;
      const bar = e.currentTarget;
      const rect = bar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      const percentage = Math.min(Math.max(0, clickX / width), 1);
      const newTime = percentage * duration;
      
      audioRef.current.currentTime = newTime;
      setProgress(percentage * 100);
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (state.isLoading) {
    return (
      <div className="w-full min-h-[400px] flex flex-col items-center justify-center bg-slate-900/50 rounded-2xl border border-slate-800 p-8 md:p-12 backdrop-blur-sm">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 rounded-full animate-pulse"></div>
          <div className="relative bg-slate-900 rounded-2xl p-4 border border-slate-700 shadow-xl">
             <Loader2 className="animate-spin text-indigo-400 w-12 h-12" />
          </div>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 text-center">Creating Your Lesson</h2>
        <div className="flex flex-col md:flex-row gap-4 text-sm text-slate-400 items-center">
           <span className="flex items-center gap-2 animate-pulse"><FileText size={16}/> Writing Script</span>
           <span className="hidden md:inline text-slate-700">•</span>
           <span className="flex items-center gap-2 animate-pulse delay-150"><Volume2 size={16}/> Synthesizing Voice</span>
           <span className="hidden md:inline text-slate-700">•</span>
           <span className="flex items-center gap-2 animate-pulse delay-300"><Maximize2 size={16}/> Rendering Visuals</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full pb-12">
      {/* Video Player Container */}
      <div className="relative aspect-video bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 group ring-1 ring-white/5 touch-none">
        
        {/* Ambient Background Blur */}
        {state.imageUrl && (
            <div className="absolute inset-0 opacity-40 pointer-events-none">
                <img 
                    src={state.imageUrl} 
                    alt="Background Ambience"
                    className="w-full h-full object-cover blur-3xl scale-110"
                />
            </div>
        )}

        {/* Visual Content with Ken Burns Effect */}
        {state.imageUrl ? (
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
                <img 
                    src={state.imageUrl} 
                    alt="Lesson Visual" 
                    className={`w-full h-full object-contain drop-shadow-2xl transition-transform ease-linear will-change-transform ${
                        isPlaying ? 'duration-[30s] scale-110' : 'duration-1000 scale-100'
                    }`}
                />
            </div>
        ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-900 relative z-10">
                <div className="text-slate-600 font-medium">Visual Unavailable</div>
            </div>
        )}

        {/* Gradient Overlay for UI readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/30 pointer-events-none"></div>

        {/* Captions Overlay - Responsive Text */}
        <div className="absolute bottom-28 lg:bottom-24 left-0 right-0 px-6 md:px-12 text-center z-20 pointer-events-none">
           <div className="inline-block bg-black/60 backdrop-blur-md p-3 md:p-4 rounded-xl border border-white/5 shadow-xl transform transition-all">
             <p className="text-white/90 text-sm md:text-xl font-medium leading-relaxed line-clamp-2">
               "{state.content?.keyPoints[0] || topic.description}"
             </p>
           </div>
        </div>

        {/* Controls Toolbar */}
        <div className="absolute bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-xl p-3 md:p-4 flex flex-col gap-3 border-t border-white/10 z-30">
            {/* Progress Bar */}
            <div 
                className="w-full bg-slate-800 h-2 md:h-1.5 rounded-full cursor-pointer group/bar transition-all touch-none py-1"
                onClick={handleSeek}
            >
                <div 
                    className="bg-indigo-500 h-full rounded-full relative transition-all" 
                    style={{ width: `${progress}%` }}
                >
                    <div className="absolute right-0 -top-1.5 w-4 h-4 bg-white rounded-full opacity-100 md:opacity-0 md:group-hover/bar:opacity-100 shadow-[0_0_10px_rgba(255,255,255,0.5)] md:transform md:scale-0 md:group-hover/bar:scale-100 transition-all"></div>
                </div>
            </div>
            
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={togglePlay}
                        className="w-10 h-10 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-indigo-500 text-white transition-all active:scale-95"
                    >
                        {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1"/>}
                    </button>
                    
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-white tracking-wide font-mono">
                            {formatTime(audioRef.current?.currentTime || 0)} / {formatTime(duration)}
                        </span>
                    </div>

                    {/* Volume Control - Hidden on small mobile unless active */}
                    <div 
                        className="relative hidden md:flex items-center group/vol"
                        onMouseEnter={() => setShowVolumeSlider(true)}
                        onMouseLeave={() => setShowVolumeSlider(false)}
                    >
                        <button onClick={toggleMute} className="text-slate-400 hover:text-white transition-colors p-1">
                             {isMuted || volume === 0 ? <VolumeX size={20} /> : volume < 0.5 ? <Volume1 size={20} /> : <Volume2 size={20} />}
                        </button>
                        
                        <div className={`overflow-hidden transition-all duration-300 ${showVolumeSlider ? 'w-24 ml-2 opacity-100' : 'w-0 opacity-0'}`}>
                             <input 
                                type="range" 
                                min="0" 
                                max="1" 
                                step="0.05" 
                                value={isMuted ? 0 : volume} 
                                onChange={handleVolumeChange}
                                className="w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                             />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={onFeedback}
                        className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-yellow-400 transition-all"
                        title="Rate this lesson"
                    >
                        <Star size={18} />
                    </button>
                    
                    <button 
                        onClick={onComplete}
                        className="flex items-center gap-2 px-4 md:px-5 py-2 bg-white text-slate-900 hover:bg-indigo-400 hover:text-white text-sm font-bold rounded-full transition-all shadow-lg active:scale-95"
                    >
                        Start Quiz <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* Supplemental Content - Stacked on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Interactive Transcript */}
         <div className="lg:col-span-2 bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden flex flex-col h-[400px] md:h-[500px]">
            <div className="p-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-10 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 uppercase tracking-wider">
                    <FileText size={16} className="text-indigo-400"/> 
                    Live Transcript
                </h3>
                <div className="text-xs text-slate-500 font-mono">
                    {(progress).toFixed(0)}% READ
                </div>
            </div>
            
            <div 
                ref={transcriptRef}
                className="p-4 md:p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 flex-1 relative scroll-smooth"
            >
                <div className="space-y-6 max-w-3xl mx-auto">
                    {transcriptData.paragraphs.map((para, pIdx) => (
                        <p key={pIdx} className="text-base md:text-xl leading-relaxed md:leading-loose text-slate-600">
                            {para.words.map((word, wIdx) => {
                                const globalIdx = para.start + wIdx;
                                const isRead = globalIdx < currentWordIndex;
                                const isCurrent = globalIdx === currentWordIndex;
                                
                                return (
                                    <span 
                                        key={wIdx} 
                                        className={`transition-all duration-300 inline-block mr-1.5 rounded px-0.5 ${
                                            isRead ? "text-slate-200" : 
                                            isCurrent ? "text-indigo-300 bg-indigo-500/20 font-medium scale-105 shadow-sm" : 
                                            ""
                                        }`}
                                    >
                                        {word}
                                    </span>
                                );
                            })}
                        </p>
                    ))}
                </div>
                
                {/* Gradient fade at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-12 md:h-24 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none"></div>
            </div>
         </div>

         {/* Key Points Sidebar */}
         <div className="lg:col-span-1 bg-slate-900 rounded-2xl border border-slate-800 p-6 h-full flex flex-col">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                Key Takeaways
            </h3>
            
            <ul className="space-y-4 flex-1">
                {state.content?.keyPoints.map((point, idx) => (
                    <li key={idx} className="flex gap-4 text-sm text-slate-300 group p-3 rounded-xl hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-700/50">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-mono text-indigo-400 group-hover:border-indigo-500 group-hover:text-indigo-300 transition-colors shadow-sm">
                            {idx + 1}
                        </span>
                        <span className="pt-0.5 leading-relaxed">{point}</span>
                    </li>
                ))}
            </ul>
         </div>
      </div>

      {/* Hidden Audio Element - Must be present in DOM (not display:none) for iOS playback control compatibility in some WebViews */}
      <audio 
        ref={audioRef} 
        onTimeUpdate={handleTimeUpdate} 
        onEnded={() => setIsPlaying(false)}
        className="absolute w-0 h-0 opacity-0 pointer-events-none"
        playsInline
      />
    </div>
  );
};