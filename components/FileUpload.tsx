import React from 'react';
import { Upload, Loader2, FileText, RotateCcw, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  isProcessing: boolean;
  currentCourseTitle?: string;
  onReset?: () => void;
  error?: string | null;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  onFileSelected, 
  isProcessing, 
  currentCourseTitle,
  onReset,
  error
}) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelected(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-4">
      <div className="text-center max-w-xl w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        <div className="mb-8 relative">
            <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-10 rounded-full"></div>
            <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 shadow-xl text-indigo-400 mb-6">
                <Upload size={36} />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">Ready2Learn</h1>
            <p className="text-slate-400 text-lg">
              Turn any PDF into an interactive video course.
            </p>
        </div>

        {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-xl flex items-center gap-3 text-left animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
                <p className="text-sm text-red-200">{error}</p>
            </div>
        )}

        {currentCourseTitle ? (
           <div className="mb-8 p-6 bg-slate-900 rounded-xl border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
              <h3 className="text-indigo-300 font-semibold mb-2 uppercase text-xs tracking-wider">Resume Learning</h3>
              <p className="text-white text-xl font-medium mb-4">{currentCourseTitle}</p>
              <p className="text-slate-400 text-sm mb-6">
                 Your progress is saved. Please upload the original PDF to continue generating lessons.
              </p>
              <div className="flex flex-col gap-3">
                  <label className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg cursor-pointer transition-colors flex items-center justify-center gap-2">
                    <Upload size={18} />
                    Upload & Resume
                    <input 
                      type="file" 
                      accept="application/pdf" 
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={isProcessing}
                    />
                  </label>
                  {onReset && (
                    <button 
                      onClick={onReset}
                      className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <RotateCcw size={18} />
                      Start New Course
                    </button>
                  )}
              </div>
           </div>
        ) : (
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
            <div className="relative w-full bg-slate-900/80 backdrop-blur-xl rounded-2xl border-2 border-slate-800 border-dashed p-12 flex flex-col items-center justify-center hover:border-indigo-500/50 transition-all cursor-pointer">
              <input 
                type="file" 
                accept="application/pdf" 
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                disabled={isProcessing}
              />
              
              {isProcessing ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="animate-spin text-indigo-400 mb-4" size={48} />
                  <p className="text-lg font-medium text-indigo-300">Analyzing content...</p>
                  <p className="text-sm text-slate-500 mt-2">Building your course structure</p>
                </div>
              ) : (
                <>
                  <div className="p-4 bg-slate-800 rounded-full mb-4 group-hover:scale-110 transition-transform duration-300">
                     <FileText className="text-slate-400 group-hover:text-indigo-400 transition-colors" size={32} />
                  </div>
                  <p className="text-xl font-semibold text-white mb-2">Drop your PDF here</p>
                  <p className="text-sm text-slate-500">Supported files: Textbook chapters, lecture notes</p>
                </>
              )}
            </div>
          </div>
        )}
        
        <div className="mt-8 text-xs text-slate-600">
           Powered by Gemini 2.5 Flash • AI-Generated Content
        </div>
      </div>
    </div>
  );
};