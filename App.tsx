import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { CourseOutline } from './components/CourseOutline';
import { LessonPlayer } from './components/LessonPlayer';
import { QuizView } from './components/QuizView';
import { TutorSettings } from './components/TutorSettings';
import { FeedbackModal } from './components/FeedbackModal';
import { LoginScreen } from './components/LoginScreen';
import { AppState, CourseStructure, Topic, LessonState, QuizQuestion, TutorProfile, Feedback, User } from './types';
import * as GeminiService from './services/geminiService';
import { Menu, X, Settings, UserCircle2, LogOut } from 'lucide-react';

const STORAGE_KEY_PREFIX = 'ready2learn_state_';
const FEEDBACK_KEY_PREFIX = 'ready2learn_feedback_';
// Reduced to 4MB to prevent "Rpc failed due to xhr error" in browser environments
const MAX_FILE_SIZE_MB = 4; 
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const DEFAULT_TUTOR: TutorProfile = {
  region: 'American',
  gender: 'Male',
  name: 'Alex'
};

const App: React.FC = () => {
  // User Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const [appState, setAppState] = useState<AppState>(AppState.UPLOAD);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [courseStructure, setCourseStructure] = useState<CourseStructure | null>(null);
  const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Tutor State
  const [tutorProfile, setTutorProfile] = useState<TutorProfile>(DEFAULT_TUTOR);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Lesson State
  const [lessonState, setLessonState] = useState<LessonState>({
    audioUrl: null,
    imageUrl: null,
    content: null,
    isLoading: false,
  });

  // Quiz State
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);

  // Feedback State
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'lesson' | 'quiz'>('lesson');

  // 1. Load Data When User Logs In
  useEffect(() => {
    if (!currentUser) return;

    const userStorageKey = `${STORAGE_KEY_PREFIX}${currentUser.id}`;
    const userFeedbackKey = `${FEEDBACK_KEY_PREFIX}${currentUser.id}`;

    const savedData = localStorage.getItem(userStorageKey);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.courseStructure) {
          setCourseStructure(parsed.courseStructure);
          if (parsed.pdfBase64) {
            setPdfBase64(parsed.pdfBase64);
            setAppState(AppState.DASHBOARD);
          } else {
            setAppState(AppState.UPLOAD);
          }
        } else {
            // Clean start if no course structure
            setAppState(AppState.UPLOAD);
        }
        if (parsed.tutorProfile) {
          setTutorProfile(parsed.tutorProfile);
        } else {
          setTutorProfile(DEFAULT_TUTOR);
        }
      } catch (e) {
        console.error("Failed to load saved state", e);
        setAppState(AppState.UPLOAD);
      }
    } else {
        // New user or no data
        setAppState(AppState.UPLOAD);
        setCourseStructure(null);
        setPdfBase64(null);
        setTutorProfile(DEFAULT_TUTOR);
    }

    const savedFeedback = localStorage.getItem(userFeedbackKey);
    if (savedFeedback) {
       try {
           setFeedbacks(JSON.parse(savedFeedback));
       } catch (e) {
           console.error("Failed to load feedback", e);
           setFeedbacks([]);
       }
    } else {
        setFeedbacks([]);
    }
  }, [currentUser]);

  // 2. Save Data When State Changes (Only if Logged In)
  useEffect(() => {
    if (!currentUser) return;
    
    const userStorageKey = `${STORAGE_KEY_PREFIX}${currentUser.id}`;

    // Only save if we have meaningful data or if we explicitly want to save empty state (reset)
    if (courseStructure || tutorProfile) {
      try {
        localStorage.setItem(userStorageKey, JSON.stringify({
          courseStructure,
          pdfBase64,
          tutorProfile
        }));
      } catch (e) {
        console.warn("Storage quota exceeded. Saving progress without PDF cache.");
        try {
          localStorage.setItem(userStorageKey, JSON.stringify({
            courseStructure,
            pdfBase64: null,
            tutorProfile
          }));
        } catch (innerError) {}
      }
    }
  }, [courseStructure, pdfBase64, tutorProfile, currentUser]);

  // Save Feedback on Change
  useEffect(() => {
    if (!currentUser) return;
    const userFeedbackKey = `${FEEDBACK_KEY_PREFIX}${currentUser.id}`;
    localStorage.setItem(userFeedbackKey, JSON.stringify(feedbacks));
  }, [feedbacks, currentUser]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    // Reset local state to avoid flashing old data on next login
    setCourseStructure(null);
    setPdfBase64(null);
    setCurrentTopic(null);
    setFeedbacks([]);
    setAppState(AppState.UPLOAD);
  };

  // --- Existing Handlers ---

  const handleFileUpload = async (file: File) => {
    setUploadError(null);

    if (file.type !== 'application/pdf') {
        setUploadError("Invalid file type. Please upload a PDF document.");
        return;
    }

    if (file.size === 0) {
        setUploadError("The file is empty. Please upload a valid PDF.");
        return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
        setUploadError(`File is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Please choose a PDF smaller than ${MAX_FILE_SIZE_MB}MB.`);
        return;
    }

    const isResuming = !!courseStructure;
    setAppState(AppState.ANALYZING);
    
    const reader = new FileReader();
    
    reader.onload = async () => {
      const result = reader.result as string;
      const base64String = result.split(',')[1];
      
      if (!base64String) {
          setUploadError("Failed to read file. Please try again.");
          setAppState(AppState.UPLOAD);
          return;
      }

      setPdfBase64(base64String);
      
      if (isResuming) {
         console.log("Resuming session with new PDF upload.");
         setAppState(AppState.DASHBOARD);
         return;
      }

      try {
        const structure = await GeminiService.analyzePdfStructure(base64String);
        setCourseStructure(structure);
        setAppState(AppState.DASHBOARD);
      } catch (err: any) {
        console.error(err);
        setUploadError(err.message || "Failed to analyze PDF. Please ensure it is a valid text-based PDF.");
        setAppState(AppState.UPLOAD);
        setCourseStructure(null);
      }
    };

    reader.onerror = () => {
        setUploadError("Error reading file.");
        setAppState(AppState.UPLOAD);
    };

    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    if (window.confirm("Are you sure? This will delete your progress and feedback for this course.")) {
      if (currentUser) {
          const userStorageKey = `${STORAGE_KEY_PREFIX}${currentUser.id}`;
          const userFeedbackKey = `${FEEDBACK_KEY_PREFIX}${currentUser.id}`;
          localStorage.removeItem(userStorageKey);
          localStorage.removeItem(userFeedbackKey);
      }
      
      setCourseStructure(null);
      setPdfBase64(null);
      setCurrentTopic(null);
      setFeedbacks([]);
      setAppState(AppState.UPLOAD);
      setIsSidebarOpen(false);
      setUploadError(null);
    }
  };

  const handleTopicSelect = async (topic: Topic) => {
    if (!courseStructure) {
        setAppState(AppState.UPLOAD);
        return;
    }

    if (!pdfBase64) {
        alert("Course content is missing. Please upload the PDF again to continue.");
        setAppState(AppState.UPLOAD);
        return;
    }
    
    setCurrentTopic(topic);
    setAppState(AppState.LESSON);
    setIsSidebarOpen(false);
    setLessonState(prev => ({ ...prev, isLoading: true, audioUrl: null, imageUrl: null, content: null }));

    try {
      const contentPromise = GeminiService.generateLessonContent(topic.title, pdfBase64, tutorProfile);
      const content = await contentPromise;
      
      const [audioUrl, imageUrl] = await Promise.all([
        GeminiService.generateLessonAudio(content.script, tutorProfile),
        GeminiService.generateLessonImage(content.visualPrompt)
      ]);

      setLessonState({
        content,
        audioUrl,
        imageUrl,
        isLoading: false
      });
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error generating lesson content. Please try again.");
      setAppState(AppState.DASHBOARD);
    }
  };

  const startQuiz = async () => {
    if (!currentTopic || !pdfBase64) return;
    setQuizLoading(true);
    try {
      const questions = await GeminiService.generateQuiz(currentTopic.title, pdfBase64);
      setQuizQuestions(questions);
      setAppState(AppState.QUIZ);
    } catch (err) {
      console.error(err);
      alert("Could not generate quiz.");
    } finally {
      setQuizLoading(false);
    }
  };

  const handleQuizFinish = (passed: boolean) => {
    if (!courseStructure || !currentTopic) return;

    if (passed) {
      const allTopics = courseStructure.chapters.flatMap(ch => ch.topics);
      const currentIdx = allTopics.findIndex(t => t.id === currentTopic.id);
      const nextTopic = allTopics[currentIdx + 1];

      const newChapters = courseStructure.chapters.map(ch => ({
        ...ch,
        topics: ch.topics.map(t => {
          if (t.id === currentTopic.id) {
            return { ...t, isCompleted: true };
          }
          if (nextTopic && t.id === nextTopic.id) {
            return { ...t, isLocked: false };
          }
          return t;
        })
      }));
      
      const updatedStructure = { ...courseStructure, chapters: newChapters };
      setCourseStructure(updatedStructure);
      setAppState(AppState.DASHBOARD);
    } else {
       setAppState(AppState.LESSON);
    }
  };

  const openFeedbackModal = (type: 'lesson' | 'quiz') => {
     setFeedbackType(type);
     setFeedbackModalOpen(true);
  };

  const handleFeedbackSubmit = (rating: number, comment: string) => {
      if (!currentTopic) return;
      const newFeedback: Feedback = {
          id: Date.now().toString(),
          topicId: currentTopic.id,
          topicTitle: currentTopic.title,
          type: feedbackType,
          rating,
          comment,
          createdAt: new Date().toISOString()
      };
      setFeedbacks(prev => [...prev, newFeedback]);
  };

  const calculateProgress = () => {
    if (!courseStructure) return 0;
    let total = 0;
    let completed = 0;
    courseStructure.chapters.forEach(c => {
      c.topics.forEach(t => {
        total++;
        if (t.isCompleted) completed++;
      });
    });
    return total === 0 ? 0 : (completed / total) * 100;
  };

  // --- Views ---

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // Helper to wrap the main content area
  const renderContent = () => {
      if (appState === AppState.UPLOAD || appState === AppState.ANALYZING) {
        return (
          <div className="relative min-h-[100dvh]">
              <button 
                onClick={handleLogout}
                className="absolute top-4 right-4 z-50 text-slate-500 hover:text-white flex items-center gap-2 bg-slate-900/50 px-3 py-2 rounded-lg backdrop-blur-sm transition-colors"
              >
                <LogOut size={18} /> <span className="text-sm font-medium">Log out</span>
              </button>
              <FileUpload 
                onFileSelected={handleFileUpload} 
                isProcessing={appState === AppState.ANALYZING} 
                currentCourseTitle={courseStructure?.title}
                onReset={handleReset}
                error={uploadError}
              />
          </div>
        );
      }

      return (
        <div className="flex flex-col md:flex-row h-[100dvh] w-full bg-slate-950 overflow-hidden font-sans">
          
          <TutorSettings 
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            currentProfile={tutorProfile}
            onSave={setTutorProfile}
          />

          <FeedbackModal 
            isOpen={feedbackModalOpen}
            onClose={() => setFeedbackModalOpen(false)}
            type={feedbackType}
            title={currentTopic?.title || ""}
            onSubmit={handleFeedbackSubmit}
          />

          {isSidebarOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setIsSidebarOpen(false)}>
              <div 
                className="w-4/5 max-w-xs h-full bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-left duration-300"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex justify-end p-4 border-b border-slate-800">
                    <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>
                <CourseOutline 
                    chapters={courseStructure?.chapters || []}
                    currentTopicId={currentTopic?.id || null}
                    onSelectTopic={handleTopicSelect}
                    courseTitle={courseStructure?.title || "Course"}
                    progress={calculateProgress()}
                    onReset={handleReset}
                />
              </div>
            </div>
          )}

          <div className="hidden md:block h-full flex-shrink-0">
            <CourseOutline 
              chapters={courseStructure?.chapters || []}
              currentTopicId={currentTopic?.id || null}
              onSelectTopic={handleTopicSelect}
              courseTitle={courseStructure?.title || "Course"}
              progress={calculateProgress()}
              onReset={handleReset}
            />
          </div>

          <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative h-full">
            {/* Header */}
            <header className="h-16 flex-shrink-0 border-b border-slate-800 flex items-center justify-between px-4 md:px-8 bg-slate-950/80 backdrop-blur z-10">
              <div className="flex items-center gap-4">
                 <button 
                   className="md:hidden text-slate-400 hover:text-white"
                   onClick={() => setIsSidebarOpen(true)}
                 >
                   <Menu size={24} />
                 </button>
                 <div className="flex flex-col">
                    <h2 className="text-sm md:text-lg font-medium text-slate-200 truncate max-w-[200px] md:max-w-none">
                        {appState === AppState.DASHBOARD && `Hello, ${currentUser.username}`}
                        {appState === AppState.LESSON && `${currentTopic?.title}`}
                        {appState === AppState.QUIZ && `Quiz: ${currentTopic?.title}`}
                    </h2>
                 </div>
              </div>
              
              <div className="flex items-center gap-3">
                 {/* Tutor Profile Trigger */}
                 <button 
                   onClick={() => setIsSettingsOpen(true)}
                   className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 transition-all group"
                   title="Configure Tutor"
                 >
                    <UserCircle2 size={18} />
                    <span className="text-xs font-semibold hidden sm:inline">{tutorProfile.name}</span>
                    <Settings size={14} className="group-hover:rotate-45 transition-transform opacity-50" />
                 </button>

                 {appState !== AppState.DASHBOARD && (
                   <button 
                     onClick={() => setAppState(AppState.DASHBOARD)}
                     className="text-xs md:text-sm px-3 py-1.5 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                   >
                     Exit Lesson
                   </button>
                 )}

                 <button 
                   onClick={handleLogout}
                   className="text-slate-500 hover:text-red-400 transition-colors p-2"
                   title="Logout"
                 >
                   <LogOut size={18} />
                 </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
                {appState === AppState.DASHBOARD && (
                   <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-6 animate-in fade-in zoom-in duration-500">
                      <div className="relative group cursor-pointer" onClick={() => setIsSettingsOpen(true)}>
                        <div className="absolute -inset-4 bg-indigo-500/20 blur-xl rounded-full group-hover:bg-indigo-500/30 transition-all"></div>
                        <div className="relative w-24 h-24 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700 flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform">
                           <span className="text-5xl">
                              {tutorProfile.gender === 'Male' ? '👨‍🏫' : '👩‍🏫'}
                           </span>
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-slate-800 border border-slate-600 rounded-full p-1.5 text-xs text-white">
                           <Settings size={12} />
                        </div>
                      </div>
                      <div>
                          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Ready to Learn, {currentUser.username}?</h1>
                          <p className="text-slate-400 max-w-md mx-auto text-sm md:text-base mb-4">
                            Select a topic to begin your lesson with 
                            <span className="text-indigo-400 font-semibold"> {tutorProfile.name}</span>, 
                            your {tutorProfile.region} AI tutor.
                          </p>
                      </div>
                      
                      <button 
                        onClick={() => setIsSidebarOpen(true)}
                        className="md:hidden px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold shadow-lg shadow-indigo-500/20"
                      >
                        View Topics
                      </button>
                   </div>
                )}

                {appState === AppState.LESSON && currentTopic && (
                  <div className="animate-in slide-in-from-bottom-4 duration-500">
                    <LessonPlayer 
                        topic={currentTopic} 
                        state={lessonState} 
                        onComplete={startQuiz} 
                        onFeedback={() => openFeedbackModal('lesson')}
                    />
                  </div>
                )}

                {appState === AppState.QUIZ && (
                   <div className="animate-in slide-in-from-right-4 duration-500">
                       <QuizView 
                         questions={quizQuestions}
                         onFinish={handleQuizFinish}
                         onFeedback={() => openFeedbackModal('quiz')}
                       />
                   </div>
                )}
            </div>
            
            {quizLoading && (
                 <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50">
                     <div className="text-center p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl">
                         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                         <h3 className="text-white font-bold text-lg">Generating Quiz</h3>
                         <p className="text-slate-400 text-sm">Analyzing content...</p>
                     </div>
                 </div>
            )}
          </main>
        </div>
      );
  }

  return renderContent();
};

export default App;