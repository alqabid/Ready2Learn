import React, { useState } from 'react';
import { TutorProfile, Region, Gender } from '../types';
import { User, Globe, Check, X, GraduationCap } from 'lucide-react';

interface TutorSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: TutorProfile;
  onSave: (profile: TutorProfile) => void;
}

export const TutorSettings: React.FC<TutorSettingsProps> = ({ isOpen, onClose, currentProfile, onSave }) => {
  const [profile, setProfile] = useState<TutorProfile>(currentProfile);

  if (!isOpen) return null;

  const regions: { id: Region; label: string; emoji: string }[] = [
    { id: 'African', label: 'African', emoji: '🌍' },
    { id: 'European', label: 'European', emoji: '🏛️' },
    { id: 'Asian', label: 'Asian', emoji: '🏯' },
    { id: 'American', label: 'American', emoji: '🗽' },
  ];

  const genders: { id: Gender; label: string }[] = [
    { id: 'Male', label: 'Male' },
    { id: 'Female', label: 'Female' },
  ];

  const handleSave = () => {
    onSave(profile);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <GraduationCap size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Tutor Persona</h2>
              <p className="text-xs text-slate-400">Customize your AI teacher</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Name Input */}
          <div className="space-y-3">
             <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tutor Name</label>
             <div className="relative">
                <User className="absolute left-3 top-3 text-slate-500" size={18} />
                <input 
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({...profile, name: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  placeholder="e.g. Professor X"
                />
             </div>
          </div>

          {/* Region Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Globe size={14} /> Region / Style
            </label>
            <div className="grid grid-cols-2 gap-3">
              {regions.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setProfile({ ...profile, region: r.id })}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${
                    profile.region === r.id
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                      : 'bg-slate-800 border-transparent text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span className="text-xl">{r.emoji}</span>
                  <span className="font-medium text-sm">{r.label}</span>
                  {profile.region === r.id && <Check size={16} className="ml-auto text-indigo-400"/>}
                </button>
              ))}
            </div>
          </div>

          {/* Gender Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Voice & Avatar</label>
            <div className="flex gap-3">
              {genders.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setProfile({ ...profile, gender: g.id })}
                  className={`flex-1 py-3 rounded-xl border transition-all duration-200 font-medium text-sm ${
                    profile.gender === g.id
                      ? 'bg-indigo-600/20 border-indigo-500 text-white'
                      : 'bg-slate-800 border-transparent text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end">
           <button 
             onClick={handleSave}
             className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
           >
             Update Tutor
           </button>
        </div>

      </div>
    </div>
  );
};
