
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { UserPlus, LogIn, GraduationCap, ChevronRight, Trash2 } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🎓');

  const avatars = ['🎓', '🚀', '💡', '🌍', '🤖', '📚', '🎨', '🦁'];

  useEffect(() => {
    const savedUsers = localStorage.getItem('ready2learn_users');
    if (savedUsers) {
      setUsers(JSON.parse(savedUsers));
    }
  }, []);

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;

    const newUser: User = {
      id: Date.now().toString(),
      username: newUsername.trim(),
      avatar: selectedAvatar,
      createdAt: new Date().toISOString()
    };

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    localStorage.setItem('ready2learn_users', JSON.stringify(updatedUsers));
    onLogin(newUser);
  };

  const handleDeleteUser = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    if (window.confirm("Delete this user profile? All progress will be lost.")) {
      const updatedUsers = users.filter(u => u.id !== userId);
      setUsers(updatedUsers);
      localStorage.setItem('ready2learn_users', JSON.stringify(updatedUsers));
      // Also clean up specific user data
      localStorage.removeItem(`ready2learn_state_${userId}`);
      localStorage.removeItem(`ready2learn_feedback_${userId}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-4xl z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        
        {/* Hero Text */}
        <div className="text-center lg:text-left space-y-6">
           <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 mb-4">
              <GraduationCap className="text-indigo-400" size={20} />
              <span className="text-slate-200 font-medium tracking-wide text-sm">Ready2Learn AI Agent</span>
           </div>
           <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight">
              Your Personal <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">AI Tutor</span>
           </h1>
           <p className="text-slate-400 text-lg max-w-md mx-auto lg:mx-0">
              Upload any PDF and instantly convert it into interactive video lessons, quizzes, and a personalized curriculum.
           </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl">
          {isCreating ? (
            <form onSubmit={handleCreateUser} className="animate-in slide-in-from-right duration-300">
               <h2 className="text-2xl font-bold text-white mb-6">Create Profile</h2>
               
               <div className="mb-6">
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Choose Avatar</label>
                 <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {avatars.map(char => (
                      <button
                        key={char}
                        type="button"
                        onClick={() => setSelectedAvatar(char)}
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all border-2 ${
                           selectedAvatar === char ? 'bg-indigo-600 border-indigo-400 scale-110' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {char}
                      </button>
                    ))}
                 </div>
               </div>

               <div className="mb-8">
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Username</label>
                 <input 
                    type="text" 
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    placeholder="Enter your name"
                    autoFocus
                 />
               </div>

               <div className="flex flex-col gap-3">
                 <button 
                   type="submit"
                   disabled={!newUsername.trim()}
                   className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                 >
                   Start Learning <ChevronRight size={18} />
                 </button>
                 <button 
                   type="button"
                   onClick={() => setIsCreating(false)}
                   className="w-full py-3.5 bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white font-medium rounded-xl transition-all"
                 >
                   Cancel
                 </button>
               </div>
            </form>
          ) : (
            <div className="animate-in slide-in-from-left duration-300">
               <h2 className="text-2xl font-bold text-white mb-6">Who is learning?</h2>
               
               <div className="space-y-3 mb-8 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700">
                 {users.length === 0 ? (
                   <p className="text-center text-slate-500 py-8 italic">No profiles found. Create one to start.</p>
                 ) : (
                   users.map(user => (
                     <div 
                       key={user.id}
                       onClick={() => onLogin(user)}
                       className="group flex items-center justify-between p-3 rounded-xl bg-slate-800 border border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800/80 cursor-pointer transition-all"
                     >
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                            {user.avatar}
                          </div>
                          <div className="flex flex-col">
                             <span className="text-white font-bold group-hover:text-indigo-300 transition-colors">{user.username}</span>
                             <span className="text-xs text-slate-500">Last seen recently</span>
                          </div>
                       </div>
                       
                       <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            className="p-2 rounded-full hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
                            onClick={(e) => handleDeleteUser(e, user.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                          <ChevronRight size={20} className="text-indigo-400" />
                       </div>
                     </div>
                   ))
                 )}
               </div>

               <button 
                 onClick={() => setIsCreating(true)}
                 className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 border-dashed text-indigo-400 font-bold rounded-xl transition-all flex items-center justify-center gap-2 group"
               >
                 <UserPlus size={18} className="group-hover:scale-110 transition-transform"/> 
                 Add New Profile
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
