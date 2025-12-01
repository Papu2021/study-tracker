import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Button } from './ui/Button';
import { X, Grid, Mail, User, AlignLeft, Check, ChevronLeft } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Extended seeds list: ~20 Male-leaning, ~20 Female-leaning styles
const AVATAR_SEEDS = [
  // Male / Masculine Styles
  'Felix', 'Jude', 'Leo', 'Finn', 'Jack', 'Oliver', 'Harry', 'Noah', 'Arthur', 'Liam',
  'Mason', 'Ethan', 'Lucas', 'Henry', 'Aiden', 'Matthew', 'David', 'James', 'Alexander', 'Ryan',
  // Female / Feminine Styles
  'Aneka', 'Lilac', 'Maya', 'Zoe', 'Sophie', 'Chloe', 'Ruby', 'Jessica', 'Emily', 'Sarah',
  'Olivia', 'Ava', 'Mia', 'Isabella', 'Charlotte', 'Amelia', 'Harper', 'Evelyn', 'Abigail', 'Ella'
];

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, userProfile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(userProfile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile?.uid}`);
  const [isSaving, setIsSaving] = useState(false);
  const [showAvatarSelection, setShowAvatarSelection] = useState(false);

  if (!isOpen || !userProfile) return null;

  const handleSelectAvatar = (seed: string) => {
    setAvatarUrl(`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`);
    setShowAvatarSelection(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName,
        bio,
        photoURL: avatarUrl
      });
      await refreshProfile();
      onClose();
    } catch (error) {
      console.error("Failed to update profile", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Modal Container */}
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 relative"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Floating Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-all z-20 shadow-sm"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative flex flex-col">
          
          {/* Header Banner */}
          <div className="relative h-32 bg-gradient-to-r from-brand-600 to-indigo-600 shrink-0">
            <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 z-10">
               <div className="relative group">
                <div className="w-24 h-24 rounded-full border-4 border-white dark:border-slate-800 bg-white shadow-lg overflow-hidden transition-all duration-300">
                  <img 
                    src={avatarUrl} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Toggle Selection Mode Button */}
                <button 
                  onClick={() => setShowAvatarSelection(!showAvatarSelection)}
                  className={`absolute bottom-0 right-0 p-2 rounded-full shadow-lg hover:scale-105 transition-all border-2 border-white dark:border-slate-800 ${showAvatarSelection ? 'bg-slate-700 text-white' : 'bg-brand-600 text-white hover:bg-brand-700'}`}
                  title={showAvatarSelection ? "Back to Edit" : "Choose Avatar"}
                >
                  {showAvatarSelection ? <ChevronLeft className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="px-6 pt-16 pb-6 flex-1">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {showAvatarSelection ? 'Choose Avatar' : 'Edit Profile'}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                {showAvatarSelection ? 'Select a style that suits you' : 'Update your personal details'}
              </p>
            </div>

            {showAvatarSelection ? (
              // --- AVATAR GRID VIEW ---
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
                {AVATAR_SEEDS.map((seed) => {
                  const url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
                  const isSelected = avatarUrl === url;
                  return (
                    <button
                      key={seed}
                      onClick={() => handleSelectAvatar(seed)}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105 ${isSelected ? 'border-brand-500 ring-2 ring-brand-200 ring-offset-2 dark:ring-offset-slate-800' : 'border-slate-200 dark:border-slate-700 hover:border-brand-300'}`}
                      title={seed}
                    >
                      <img src={url} alt={seed} className="w-full h-full bg-slate-100 dark:bg-slate-700/50" loading="lazy" />
                      {isSelected && (
                        <div className="absolute inset-0 bg-brand-500/20 flex items-center justify-center">
                          <div className="bg-brand-500 text-white rounded-full p-1 shadow-sm">
                            <Check className="w-3 h-3" />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              // --- FORM VIEW ---
              <div className="space-y-5 animate-in fade-in slide-in-from-left-4 duration-300">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">
                    Display Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                    <input 
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-slate-900/50 dark:border-slate-700 dark:text-white transition-all"
                      placeholder="Your Name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                    <input 
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full pl-10 pr-3 py-2 border border-slate-200 bg-slate-50 text-slate-500 rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1 ml-1">Email cannot be changed.</p>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">
                    Bio
                  </label>
                  <div className="relative">
                    <AlignLeft className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <textarea
                      className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 
                        focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
                        dark:bg-slate-900/50 dark:border-slate-700 dark:text-white resize-none h-28 transition-all"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us a bit about yourself..."
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 shrink-0 flex justify-end gap-3 z-20">
          <Button variant="secondary" onClick={onClose} className="px-6">Cancel</Button>
          {!showAvatarSelection && (
            <Button onClick={handleSave} isLoading={isSaving} className="px-8 shadow-lg shadow-brand-500/20">
              Save Changes
            </Button>
          )}
          {showAvatarSelection && (
            <Button onClick={() => setShowAvatarSelection(false)} className="px-8">
              Confirm Avatar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};