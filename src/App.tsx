import React, { useState, useEffect } from 'react';
import { Pickaxe, Download, Sparkles, Terminal, FileJson, Package, Play, Info, Users, BookOpen, Layout, Share2, Copy, Check, Zap, Brain, Search, Clock, LogIn, UserPlus, LogOut, Shield, MessageSquare, Trash2, ShieldAlert, User, Star, RefreshCw, ChevronLeft } from 'lucide-react';
import JSZip from 'jszip';
import { generateMod, GeneratedMod, GenerationMode } from './services/modGenerator';
import { motion, AnimatePresence } from 'motion/react';
import { View } from './types';
import { Tutorial } from './components/Tutorial';
import { Community } from './components/Community';
import { ModWizard } from './components/ModWizard';
import { ModTester } from './components/ModTester';

export default function App() {
  const [view, setView] = useState<View | 'auth' | 'history' | 'admin' | 'banned_mods' | 'profile'>('auth');
  const [user, setUser] = useState<{ email: string; username: string; role: string } | null>(null);
  const [prompt, setPrompt] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [mode, setMode] = useState<GenerationMode>('normal');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMod, setGeneratedMod] = useState<GeneratedMod | null>(null);
  const [editableMod, setEditableMod] = useState<{ name: string; description: string; icon: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [userStatus, setUserStatus] = useState<{ status: string; reason?: string; role: string; bio?: string; pfp?: string; username?: string } | null>(null);
  const [violations, setViolations] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allMods, setAllMods] = useState<any[]>([]);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [bannedMods, setBannedMods] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [socialStatus, setSocialStatus] = useState({ isFriend: false, isFollowing: false });
  const [showReportModal, setShowReportModal] = useState<string | null>(null);
  const [editingMod, setEditingMod] = useState<any | null>(null);
  const [reportForm, setReportForm] = useState({ reason: 'harassing', explanation: '', proof: '' });
  const [generationProgress, setGenerationProgress] = useState(0);

  // Profile Edit State
  const [profileForm, setProfileForm] = useState({ username: '', bio: '', pfp: '' });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Auth States
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ email: '', username: '', password: '' });

  const getDeviceId = () => {
    let id = localStorage.getItem('bedrock_device_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('bedrock_device_id', id);
    }
    return id;
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('bedrock_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      setView('forge');
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchStatus();
      fetchChatHistory();
    }
  }, [user]);

  useEffect(() => {
    if (view === 'banned_mods') fetchBannedMods();
    if (view === 'messages' && activeChat) fetchMessages(activeChat);
  }, [view, activeChat]);

  const fetchStatus = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/user/status', { 
        headers: { 
          'x-user-email': user.email,
          'x-device-id': getDeviceId()
        } 
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setUserStatus(data);
      setProfileForm({ username: data.username || '', bio: data.bio || '', pfp: data.pfp || '' });
      if (['owner', 'operator', 'mod'].includes(data.role)) fetchAdminData();
    } catch (e) {
      console.error("Failed to fetch status:", e);
    }
  };

  const fetchAdminData = async () => {
    if (!user) return;
    try {
      const [vRes, uRes, bRes, mRes] = await Promise.all([
        fetch('/api/admin/violations', { headers: { 'x-user-email': user.email, 'x-device-id': getDeviceId() } }),
        fetch('/api/admin/users', { headers: { 'x-user-email': user.email, 'x-device-id': getDeviceId() } }),
        fetch('/api/admin/banned-mods', { headers: { 'x-user-email': user.email, 'x-device-id': getDeviceId() } }),
        fetch('/api/mods', { headers: { 'x-user-email': user.email, 'x-device-id': getDeviceId() } })
      ]);
      
      if (!vRes.ok || !uRes.ok || !bRes.ok || !mRes.ok) throw new Error("Failed to fetch admin data");
      
      setViolations(await vRes.json());
      setAllUsers(await uRes.json());
      setBannedMods(await bRes.json());
      setAllMods(await mRes.json());
    } catch (e) {
      console.error("Failed to fetch admin data:", e);
    }
  };

  const fetchChatHistory = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/chat/history', { headers: { 'x-user-email': user.email } });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      setChatHistory(await res.json());
    } catch (e) {
      console.error("Failed to fetch chat history:", e);
    }
  };

  const fetchBannedMods = async () => {
    try {
      const res = await fetch('/api/mods/banned');
      if (res.ok) setBannedMods(await res.json());
    } catch (e) {
      console.error("Failed to fetch banned mods:", e);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...authForm, device_id: getDeviceId() })
    });
    const data = await res.json();
    if (res.ok) {
      if (authMode === 'login') {
        setUser(data);
        localStorage.setItem('bedrock_user', JSON.stringify(data));
        setView('forge');
      } else {
        setAuthMode('login');
        alert("Registration successful! Please login.");
      }
    } else {
      alert(data.error);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('bedrock_user');
    setView('auth');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingProfile(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-email': user.email },
        body: JSON.stringify(profileForm)
      });
      if (res.ok) {
        fetchStatus();
        alert("Profile updated successfully!");
      }
    } catch (e) {
      console.error("Failed to save profile:", e);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSocialAction = async (target: string, type: 'friend' | 'follow', action: string) => {
    if (!user) return;
    await fetch(`/api/social/${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-email': user.email },
      body: JSON.stringify({ target, action })
    });
    fetchSocialStatus(target);
  };

  const fetchSocialStatus = async (target: string) => {
    if (!user) return;
    const res = await fetch(`/api/social/status?target=${target}`, { headers: { 'x-user-email': user.email } });
    setSocialStatus(await res.json());
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !showReportModal) return;
    await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-email': user.email },
      body: JSON.stringify({ reported: showReportModal, ...reportForm })
    });
    setShowReportModal(null);
    alert("Report submitted. Robbie The Robot Guard will review it shortly.");
  };

  const fetchMessages = async (withEmail: string) => {
    if (!user) return;
    const res = await fetch(`/api/messages?with=${withEmail}`, { headers: { 'x-user-email': user.email } });
    setMessages(await res.json());
  };

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`].slice(-10));
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || userStatus?.status === 'banned' || !user) return;
    
    setIsGenerating(true);
    setGenerationProgress(10);
    setError(null);
    setGeneratedMod(null);
    setLogs([]);
    addLog(`Initializing AI Mod Architect [MODE: ${mode.toUpperCase()}]...`);

    try {
      addLog("Performing safety scan...");
      setGenerationProgress(25);
      const mod = await generateMod(prompt, mode, { name: projectName, description: projectDescription });
      setGenerationProgress(75);
      addLog("Mod structure generated successfully.");
      setGeneratedMod(mod);
      setEditableMod({
        name: projectName || mod.name,
        description: projectDescription || mod.description,
        icon: mod.files.find(f => f.path.includes('icon'))?.content || ''
      });
      setGenerationProgress(90);
      
      // Save to history
      await fetch('/api/chat/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, prompt, response: JSON.stringify(mod.files), thinking: mod.thinking })
      });
      fetchChatHistory();

      // Auto-share
      addLog("Auto-publishing to Community Hub...");
      await fetch('/api/mods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-email': user.email },
        body: JSON.stringify({
          name: projectName || mod.name,
          description: projectDescription || mod.description,
          category: 'AI Generated',
          files: mod.files,
          author: user.email,
          author_name: userStatus?.username || user.username,
          is_safe: true
        })
      });
      setGenerationProgress(100);
      addLog("Published successfully.");
    } catch (err: any) {
      if (err.message.startsWith("SAFETY_VIOLATION:")) {
        const reason = err.message.replace("SAFETY_VIOLATION: ", "");
        addLog("CRITICAL: Safety violation detected. Reporting to Robbie...");
        
        // Save as banned mod for Robbie to post
        await fetch('/api/mods', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-email': user.email },
          body: JSON.stringify({
            name: projectName || "Illegal Mod Attempt",
            description: projectDescription || "This mod was blocked for violating safety rules.",
            category: 'BANNED',
            files: [],
            author: user.email,
            author_name: userStatus?.username || user.username,
            is_safe: false,
            ban_prompt: prompt
          })
        });

        await fetch('/api/violations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email, prompt, reason })
        });
        
        // Quick ban switch
        setTimeout(() => {
          fetchStatus();
          setView('banned_mods');
        }, 2000);
      } else {
        setError("Failed to generate mod. Please try again.");
        addLog("ERROR: Generation failed.");
      }
    } finally {
      setIsGenerating(false);
      setTimeout(() => setGenerationProgress(0), 1000);
    }
  };

  const generatePackBlob = async () => {
    if (!generatedMod || !editableMod) return null;
    const zip = new JSZip();
    
    // Use editable values for manifest updates
    const updatedFiles = generatedMod.files.map(file => {
      if (file.path.endsWith('manifest.json')) {
        try {
          const manifest = JSON.parse(file.content);
          if (manifest.header) {
            manifest.header.name = editableMod.name;
            manifest.header.description = editableMod.description;
          }
          return { ...file, content: JSON.stringify(manifest, null, 2) };
        } catch (e) { return file; }
      }
      if (file.path.includes('icon') && editableMod.icon) {
        return { ...file, content: editableMod.icon };
      }
      return file;
    });

    let hasBP = false;
    let hasRP = false;

    updatedFiles.forEach(file => {
      if (file.path.includes('behavior_pack') || file.path.includes('bp')) hasBP = true;
      if (file.path.includes('resource_pack') || file.path.includes('rp')) hasRP = true;

      if (file.type === 'image' || file.path.endsWith('.png')) {
        const base64Data = file.content.split(',')[1] || file.content;
        zip.file(file.path, base64Data, { base64: true });
      } else {
        zip.file(file.path, file.content);
      }
    });

    const ext = (hasBP && hasRP) ? 'mcaddon' : 'mcpack';
    const content = await zip.generateAsync({ type: "blob" });
    return { content, ext };
  };

  const handleAutoLaunch = async () => {
    const ready = window.confirm("Are you ready to launch Minecraft and import this mod?\n\n(Note: On mobile, tapping 'Yes' will download the file and may prompt you to 'Open in Minecraft'. On PC, click the downloaded file to auto-launch.)");
    if (!ready) return;

    const pack = await generatePackBlob();
    if (!pack) return;

    const url = window.URL.createObjectURL(pack.content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${editableMod?.name.replace(/\s+/g, '_') || 'mod'}.${pack.ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addLog(`Launching Minecraft with .${pack.ext}... If it doesn't open, click the downloaded file!`);
  };

  const handleManualDownload = async () => {
    const pack = await generatePackBlob();
    if (!pack) return;

    const url = window.URL.createObjectURL(pack.content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${editableMod?.name.replace(/\s+/g, '_') || 'mod'}.${pack.ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addLog(`Downloaded as .${pack.ext} for manual installation.`);
  };

  const handleAdminAction = async (target: string, action: string, data?: any) => {
    try {
      const res = await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-email': user?.email || '' },
        body: JSON.stringify({ target, action, ...data })
      });
      if (res.ok) {
        fetchAdminData();
      }
    } catch (err) {
      console.error("Admin action failed:", err);
    }
  };

  if (view === 'auth') {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full bg-[#252525] border border-[#333] rounded-2xl p-8 shadow-2xl space-y-8">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-[#3d8c40] rounded-2xl flex items-center justify-center mx-auto shadow-lg mb-4">
              <Pickaxe className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Bedrock AI Forge</h1>
            <p className="text-[#666] text-sm uppercase tracking-widest">Authentication Required</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'register' && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#444] uppercase ml-1">Gmail Address</label>
                <input name="email" type="email" required value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl p-4 text-sm focus:border-[#3d8c40] outline-none transition-all" />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#444] uppercase ml-1">Username</label>
              <input name="username" type="text" required value={authForm.username} onChange={e => setAuthForm({...authForm, username: e.target.value})} className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl p-4 text-sm focus:border-[#3d8c40] outline-none transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#444] uppercase ml-1">Password</label>
              <input name="password" type="password" required value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl p-4 text-sm focus:border-[#3d8c40] outline-none transition-all" />
            </div>
            <button type="submit" className="w-full py-4 bg-[#3d8c40] hover:bg-[#4caf50] text-white font-bold rounded-xl transition-all shadow-lg">
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#333]"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest"><span className="bg-[#252525] px-4 text-[#444]">Or continue with</span></div>
          </div>

          <button onClick={() => {
            const mockEmail = `google_${Math.random().toString(36).substring(7)}@gmail.com`;
            setUser({ email: mockEmail, username: 'Google User', role: 'user' });
            localStorage.setItem('bedrock_user', JSON.stringify({ email: mockEmail, username: 'Google User', role: 'user' }));
            setView('forge');
          }} className="w-full py-4 bg-white hover:bg-gray-100 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg">
            <LogIn className="w-5 h-5" /> Login with Google
          </button>

          <p className="text-center text-xs text-[#666]">
            {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="text-[#3d8c40] font-bold hover:underline">
              {authMode === 'login' ? 'Sign Up' : 'Login'}
            </button>
          </p>
        </motion.div>
      </div>
    );
  }

  if (userStatus?.status === 'banned') {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-8">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-2xl w-full bg-[#252525] border border-red-500/30 rounded-2xl p-12 text-center space-y-8 shadow-2xl">
          <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto"><Info className="w-12 h-12 text-red-500" /></div>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-white">Access Restricted</h1>
            <p className="text-[#888] text-lg">Your account has been restricted for violating Minecraft safety guidelines.</p>
          </div>
          <div className="bg-[#1a1a1a] p-6 rounded-xl border border-[#333] text-left">
            <p className="text-[10px] font-bold text-[#444] uppercase mb-2">Violation Reason:</p>
            <p className="text-red-400 font-mono text-sm italic">"{userStatus.reason}"</p>
          </div>
          <p className="text-[#666] text-sm">To appeal this decision, please join our Discord and submit an appeal in the #support channel.</p>
          <div className="flex gap-4">
            <button className="flex-1 py-4 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold rounded-xl transition-all">Join Discord</button>
            <button onClick={handleLogout} className="px-8 py-4 bg-[#333] text-white font-bold rounded-xl hover:bg-[#444] transition-all">Logout</button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1e1e1e] text-[#e0e0e0] font-sans selection:bg-[#3d8c40] selection:text-white">
      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 w-full h-14 bg-[#252525] border-t border-[#333] flex items-center justify-around z-20 overflow-x-auto md:fixed md:left-0 md:top-0 md:h-full md:w-20 md:border-r md:border-t-0 md:flex-col md:py-8 md:gap-8 md:overflow-x-visible">
        <div className="hidden md:block bg-[#3d8c40] p-3 rounded-xl shadow-lg mb-4 cursor-pointer" onClick={() => setView('forge')}><Pickaxe className="text-white w-6 h-6" /></div>
        <button onClick={() => setView('forge')} className={`p-2 md:p-3 rounded-xl transition-all ${view === 'forge' ? 'bg-[#333] text-[#3d8c40]' : 'text-[#444] hover:text-[#888]'}`}><Sparkles className="w-5 h-5 md:w-6 md:h-6" /></button>
        <button onClick={() => setView('wizard')} className={`p-2 md:p-3 rounded-xl transition-all ${view === 'wizard' ? 'bg-[#333] text-[#3d8c40]' : 'text-[#444] hover:text-[#888]'}`}><Zap className="w-5 h-5 md:w-6 md:h-6" /></button>
        <button onClick={() => setView('community')} className={`p-2 md:p-3 rounded-xl transition-all ${view === 'community' ? 'bg-[#333] text-[#3d8c40]' : 'text-[#444] hover:text-[#888]'}`}><Users className="w-5 h-5 md:w-6 md:h-6" /></button>
        <button onClick={() => setView('history')} className={`p-2 md:p-3 rounded-xl transition-all ${view === 'history' ? 'bg-[#333] text-[#3d8c40]' : 'text-[#444] hover:text-[#888]'}`}><Clock className="w-5 h-5 md:w-6 md:h-6" /></button>
        <button onClick={() => setView('messages')} className={`p-2 md:p-3 rounded-xl transition-all ${view === 'messages' ? 'bg-[#333] text-[#3d8c40]' : 'text-[#444] hover:text-[#888]'}`}><MessageSquare className="w-5 h-5 md:w-6 md:h-6" /></button>
        <button onClick={() => setView('banned_mods')} className={`p-2 md:p-3 rounded-xl transition-all ${view === 'banned_mods' ? 'bg-[#333] text-red-400' : 'text-[#444] hover:text-red-400'}`}><Trash2 className="w-5 h-5 md:w-6 md:h-6" /></button>
        <button onClick={() => setView('profile')} className={`p-2 md:p-3 rounded-xl transition-all ${view === 'profile' ? 'bg-[#333] text-[#3d8c40]' : 'text-[#444] hover:text-[#888]'}`}><UserPlus className="w-5 h-5 md:w-6 md:h-6" /></button>
        {(['owner', 'operator', 'mod'].includes(userStatus?.role || '') || ['guillermojohn1105@gmail.com', 'sigmanrizzler2@gmail.com'].includes(user?.email || '')) && (
          <button onClick={() => setView('admin')} className={`p-2 md:p-3 rounded-xl transition-all ${view === 'admin' ? 'bg-[#333] text-red-500' : 'text-[#444] hover:text-red-400'}`}><Shield className="w-5 h-5 md:w-6 md:h-6" /></button>
        )}
        <div className="mt-auto hidden md:block">
          <button onClick={handleLogout} className="p-3 text-[#444] hover:text-red-400 transition-all"><LogOut className="w-6 h-6" /></button>
        </div>
      </nav>

      <div className="pb-16 md:pb-0 md:pl-20">
        <header className="border-b border-[#333] bg-[#252525]/80 backdrop-blur-md p-4 md:p-6 sticky top-0 z-10 shadow-lg">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-white uppercase flex items-center gap-2 md:gap-3">
                {view === 'forge' && <><Sparkles className="w-4 h-4 md:w-5 md:h-5 text-[#3d8c40]" /> AI Mod Forge</>}
                {view === 'wizard' && <><Zap className="w-4 h-4 md:w-5 md:h-5 text-[#3d8c40]" /> Mod Wizard</>}
                {view === 'tester' && <><Terminal className="w-4 h-4 md:w-5 md:h-5 text-[#3d8c40]" /> Bedrock Sandbox</>}
                {view === 'community' && <><Users className="w-4 h-4 md:w-5 md:h-5 text-[#3d8c40]" /> Community Hub</>}
                {view === 'history' && <><Clock className="w-4 h-4 md:w-5 md:h-5 text-[#3d8c40]" /> Chat History</>}
                {view === 'messages' && <><MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-[#3d8c40]" /> Messages</>}
                {view === 'banned_mods' && <><Trash2 className="w-4 h-4 md:w-5 md:h-5 text-red-400" /> Banned Mods</>}
                {view === 'profile' && <><UserPlus className="w-4 h-4 md:w-5 md:h-5 text-[#3d8c40]" /> My Profile</>}
                {view === 'admin' && <><Shield className="w-4 h-4 md:w-5 md:h-5 text-red-500" /> Mod Only (Moderation)</>}
              </h1>
              <p className="text-[8px] md:text-[10px] text-[#666] font-mono uppercase tracking-[0.2em] mt-1">Minecraft Bedrock Edition • v1.1.0-auth</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-white">{user?.username}</p>
                <p className="text-[8px] text-[#3d8c40] uppercase font-mono tracking-widest">{userStatus?.role}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-[#333] flex items-center justify-center border border-[#444]"><Users className="w-4 h-4 text-[#888]" /></div>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto p-4 md:p-8">
          <AnimatePresence mode="wait">
            {view === 'forge' && (
              <motion.div key="forge" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { id: 'deep', label: 'Deep Thinking', icon: Brain, color: 'text-purple-400', desc: 'Best quality + Web' },
                    { id: 'thinking', label: 'Thinking', icon: Search, color: 'text-blue-400', desc: 'Good quality + Web' },
                    { id: 'normal', label: 'Normal', icon: Sparkles, color: 'text-green-400', desc: 'Standard speed' },
                    { id: 'fast', label: 'Fast', icon: Zap, color: 'text-yellow-400', desc: 'Quick but risky' },
                  ].map((m) => (
                    <button key={m.id} onClick={() => setMode(m.id as GenerationMode)} className={`p-4 rounded-xl border transition-all text-left group ${mode === m.id ? 'bg-[#3d8c40]/10 border-[#3d8c40] shadow-lg' : 'bg-[#252525] border-[#333] hover:border-[#444]'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <m.icon className={`w-4 h-4 ${m.color}`} /><span className={`text-[10px] font-bold uppercase tracking-widest ${mode === m.id ? 'text-white' : 'text-[#666]'}`}>{m.label}</span>
                      </div>
                      <p className="text-[9px] text-[#444] group-hover:text-[#666] transition-colors">{m.desc}</p>
                    </button>
                  ))}
                </div>

                <section className="bg-[#252525] border border-[#333] rounded-xl overflow-hidden shadow-2xl">
                  <div className="p-1 bg-gradient-to-r from-[#3d8c40] to-[#4caf50]"></div>
                  <div className="p-6 md:p-8 space-y-6">
                    <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <h2 className="text-xl font-bold text-white">Mod Architect</h2>
                        <p className="text-xs text-[#666]">Forge Bedrock Add-ons with AI</p>
                      </div>
                      <button onClick={() => setView('wizard')} className="px-4 py-2 bg-[#333] hover:bg-[#444] text-white text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all flex items-center gap-2">
                        <Zap className="w-3 h-3 text-[#3d8c40]" /> Use Wizard
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#444] uppercase tracking-widest ml-1">Project Name</label>
                        <input 
                          type="text" 
                          placeholder="e.g., Super Dragon Mod" 
                          value={projectName} 
                          onChange={e => setProjectName(e.target.value)}
                          className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl p-4 text-sm focus:border-[#3d8c40] outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#444] uppercase tracking-widest ml-1">Short Description</label>
                        <input 
                          type="text" 
                          placeholder="e.g., Adds powerful dragons to your world" 
                          value={projectDescription} 
                          onChange={e => setProjectDescription(e.target.value)}
                          className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl p-4 text-sm focus:border-[#3d8c40] outline-none transition-all"
                        />
                      </div>
                    </div>
                    <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe your mod..." className="w-full h-40 bg-[#1a1a1a] border border-[#333] rounded-xl p-6 text-sm focus:outline-none focus:border-[#3d8c40] transition-all resize-none shadow-inner" />
                    <button onClick={handleGenerate} disabled={isGenerating || !prompt.trim()} className="w-full py-5 bg-[#3d8c40] hover:bg-[#4caf50] disabled:bg-[#333] text-white font-bold rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg relative overflow-hidden">
                      {isGenerating ? (
                        <div className="flex items-center gap-3">
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          <span>Architecting Mod...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <Pickaxe className="w-5 h-5" />
                          <span>Forge Add-on</span>
                        </div>
                      )}
                    </button>
                    {isGenerating && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-500">
                        <div className="w-full bg-[#1a1a1a] h-2 rounded-full overflow-hidden border border-[#333]">
                          <motion.div 
                            initial={{ width: 0 }} 
                            animate={{ width: `${generationProgress}%` }} 
                            className="h-full bg-[#3d8c40] shadow-[0_0_10px_#3d8c40]"
                          />
                        </div>
                        <div className="flex items-center justify-center gap-4">
                          <div className="flex gap-1">
                            {[0, 1, 2].map(i => (
                              <motion.div 
                                key={i}
                                animate={{ opacity: [0.2, 1, 0.2] }}
                                transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }}
                                className="w-1.5 h-1.5 bg-[#3d8c40] rounded-full"
                              />
                            ))}
                          </div>
                          <span className="text-[10px] font-bold text-[#3d8c40] uppercase tracking-widest">Robbie is thinking...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-4 font-mono text-[10px] text-[#444] flex flex-col gap-1.5">
                  {logs.map((log, i) => <div key={i} className="flex gap-3"><span className="text-[#3d8c40] shrink-0 font-bold">SYS_LOG_0{i}</span><span className="text-[#666]">{log}</span></div>)}
                </div>

                {generatedMod && editableMod && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="bg-[#252525] border border-[#333] rounded-xl p-6 space-y-3">
                      <div className="flex items-center gap-2 text-[#3d8c40]"><Brain className="w-4 h-4" /><span className="text-[10px] font-bold uppercase tracking-widest">Now I'm making the script smth like that dude</span></div>
                      <p className="text-xs text-[#888] leading-relaxed italic">"{generatedMod.thinking}"</p>
                    </div>

                    <div className="bg-[#252525] border border-[#333] rounded-xl p-8 flex flex-col md:flex-row gap-8 items-start">
                      <div className="w-32 h-32 bg-[#1a1a1a] border border-[#333] rounded-xl flex items-center justify-center overflow-hidden relative group">
                        {editableMod.icon ? (
                          <img src={editableMod.icon} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Package className="w-12 h-12 text-[#333]" />
                        )}
                        <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                          <span className="text-[8px] font-bold text-white uppercase">Change Icon</span>
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => setEditableMod({...editableMod, icon: ev.target?.result as string});
                              reader.readAsDataURL(file);
                            }
                          }} />
                        </label>
                      </div>
                      <div className="flex-1 space-y-4 w-full">
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold text-[#444] uppercase tracking-widest">Mod Name</label>
                          <input 
                            value={editableMod.name} 
                            onChange={(e) => setEditableMod({...editableMod, name: e.target.value})}
                            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-3 text-lg font-bold text-white focus:border-[#3d8c40] outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold text-[#444] uppercase tracking-widest">Description</label>
                          <textarea 
                            value={editableMod.description} 
                            onChange={(e) => setEditableMod({...editableMod, description: e.target.value})}
                            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-3 text-sm text-[#888] focus:border-[#3d8c40] outline-none transition-all resize-none h-20"
                          />
                        </div>
                        <div className="flex flex-col gap-2 pt-2">
                          <div className="flex flex-wrap gap-4">
                            <button onClick={handleAutoLaunch} className="flex-1 py-3 bg-[#3d8c40] text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all hover:bg-[#4caf50] shadow-lg"><Play className="w-4 h-4" /> Launch in Minecraft</button>
                            <button onClick={handleManualDownload} className="px-6 py-3 bg-[#333] border border-[#444] text-white font-bold rounded-lg flex items-center gap-2 transition-all hover:bg-[#444] shadow-lg"><Download className="w-4 h-4" /> Download File</button>
                            <button onClick={() => setView('tester')} className="px-6 py-3 bg-[#3d8c40]/10 border border-[#3d8c40]/30 text-[#3d8c40] font-bold rounded-lg flex items-center gap-2 transition-all hover:bg-[#3d8c40]/20 shadow-lg"><Terminal className="w-4 h-4" /> Test in Sandbox</button>
                          </div>
                          <p className="text-[10px] text-[#888] text-center">"Launch" will prompt you to open Minecraft directly. "Download" saves the file for manual importing.</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {view === 'wizard' && (
              <ModWizard 
                onGenerate={(p, n) => {
                  setPrompt(p);
                  setProjectName(n);
                  setView('forge');
                  setTimeout(handleGenerate, 100);
                }} 
              />
            )}

            {view === 'tester' && generatedMod && (
              <ModTester mod={generatedMod} />
            )}

            {view === 'community' && (
              <Community 
                userEmail={user?.email || ''} 
                onUserClick={(email) => {
                  setActiveChat(email);
                  setView('profile');
                }}
                onReport={(target) => setShowReportModal(target)}
                onEdit={(mod) => setEditingMod(mod)}
              />
            )}
            
            {view === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-8">
                <div className="bg-[#252525] border border-[#333] rounded-2xl p-8 shadow-2xl space-y-8">
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 bg-[#1a1a1a] rounded-2xl border border-[#333] flex items-center justify-center overflow-hidden relative group">
                      {profileForm.pfp ? (
                        <img src={profileForm.pfp} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Users className="w-10 h-10 text-[#333]" />
                      )}
                      {(!activeChat || activeChat === user?.email) && (
                        <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                          <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => setProfileForm({ ...profileForm, pfp: reader.result as string });
                              reader.readAsDataURL(file);
                            }
                          }} />
                          <span className="text-[8px] font-bold text-white uppercase">Upload</span>
                        </label>
                      )}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-white">{userStatus?.username || user?.username}</h2>
                      <p className="text-[#3d8c40] text-xs font-mono uppercase tracking-widest">{userStatus?.role}</p>
                      <p className="text-[#666] text-xs mt-1">{user?.email}</p>
                      
                      {activeChat && activeChat !== user?.email && (
                        <div className="flex gap-2 mt-4">
                          <button onClick={() => handleSocialAction(activeChat, 'friend', socialStatus.isFriend ? 'remove' : 'add')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${socialStatus.isFriend ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-[#3d8c40] text-white shadow-lg'}`}>
                            {socialStatus.isFriend ? 'Unfriend' : 'Add Friend'}
                          </button>
                          <button onClick={() => handleSocialAction(activeChat, 'follow', socialStatus.isFollowing ? 'unfollow' : 'follow')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${socialStatus.isFollowing ? 'bg-[#333] text-white' : 'bg-white text-black'}`}>
                            {socialStatus.isFollowing ? 'Unfollow' : 'Follow'}
                          </button>
                          <button onClick={() => setView('messages')} className="px-4 py-2 bg-[#333] text-white rounded-lg text-xs font-bold hover:bg-[#444]">Message</button>
                          <button onClick={() => setShowReportModal(activeChat)} className="px-4 py-2 bg-red-600/10 text-red-500 rounded-lg text-xs font-bold hover:bg-red-600 hover:text-white border border-red-500/20">Report</button>
                        </div>
                      )}
                    </div>
                  </div>

                  {(!activeChat || activeChat === user?.email) ? (
                    <form onSubmit={handleSaveProfile} className="space-y-6">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#444] uppercase tracking-widest ml-1">Display Name</label>
                        <input 
                          type="text" 
                          value={profileForm.username} 
                          onChange={e => setProfileForm({ ...profileForm, username: e.target.value })}
                          className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl p-4 text-sm focus:border-[#3d8c40] outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#444] uppercase tracking-widest ml-1">Bio / Description</label>
                        <textarea 
                          value={profileForm.bio} 
                          onChange={e => setProfileForm({ ...profileForm, bio: e.target.value })}
                          placeholder="Tell the community about yourself..."
                          className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl p-4 text-sm focus:border-[#3d8c40] outline-none transition-all h-32 resize-none"
                        />
                      </div>
                      <div className="flex gap-4">
                        <button type="submit" disabled={isSavingProfile} className="flex-1 py-4 bg-[#3d8c40] hover:bg-[#4caf50] text-white font-bold rounded-xl transition-all shadow-lg disabled:bg-[#333]">
                          {isSavingProfile ? "Saving..." : "Save Profile"}
                        </button>
                        <button type="button" onClick={handleLogout} className="px-8 py-4 bg-[#333] text-red-400 font-bold rounded-xl hover:bg-red-500/10 transition-all border border-red-500/20">
                          Switch Account / Logout
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-[#1a1a1a] p-6 rounded-xl border border-[#333]">
                        <p className="text-[10px] font-bold text-[#444] uppercase mb-2">Bio</p>
                        <p className="text-sm text-[#888] leading-relaxed">{userStatus?.bio || "No bio yet."}</p>
                      </div>
                      <button onClick={() => setActiveChat(null)} className="text-[#3d8c40] text-xs font-bold uppercase tracking-widest hover:underline">← Back to My Profile</button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
            
            {view === 'messages' && (
              <motion.div key="messages" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto h-[70vh] bg-[#252525] border border-[#333] rounded-2xl shadow-2xl flex overflow-hidden flex-col md:flex-row">
                <div className={`w-full md:w-64 border-r border-[#333] bg-[#1a1a1a] flex flex-col ${activeChat ? 'hidden md:flex' : 'flex'}`}>
                  <div className="p-4 border-b border-[#333]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-[#444]" />
                      <input 
                        type="text" 
                        placeholder="Find user..." 
                        className="w-full bg-[#252525] border border-[#333] rounded-lg pl-8 pr-3 py-2 text-[10px] focus:outline-none focus:border-[#3d8c40]"
                        onChange={(e) => {
                          const val = e.target.value.toLowerCase();
                          if (val.length > 2) {
                            fetch(`/api/users/search?q=${val}`)
                              .then(r => r.json())
                              .then(setAllUsers);
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {allUsers.filter(u => u.email !== user?.email).map(u => (
                      <button 
                        key={u.email} 
                        onClick={() => {
                          setActiveChat(u.email);
                          fetchMessages(u.email);
                        }}
                        className={`w-full p-4 flex items-center gap-3 hover:bg-[#252525] transition-all border-b border-[#333]/50 ${activeChat === u.email ? 'bg-[#3d8c40]/10 border-r-2 border-r-[#3d8c40]' : ''}`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#333] flex items-center justify-center border border-[#444]">
                          {u.pfp ? <img src={u.pfp} className="w-full h-full rounded-lg object-cover" referrerPolicy="no-referrer" /> : <User className="w-4 h-4 text-[#666]" />}
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-bold text-white truncate">{u.username || u.email.split('@')[0]}</p>
                          <p className="text-[8px] text-[#444] uppercase font-mono tracking-widest">{u.role}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className={`flex-1 flex flex-col ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
                  <div className="p-4 border-b border-[#333] bg-[#1a1a1a] flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      {activeChat && <button onClick={() => setActiveChat(null)} className="md:hidden p-2 text-[#666]"><ChevronLeft className="w-5 h-5" /></button>}
                      <div className="w-10 h-10 bg-[#333] rounded-lg flex items-center justify-center"><Users className="w-5 h-5 text-[#3d8c40]" /></div>
                      <div>
                        <p className="text-sm font-bold text-white">{activeChat || "Select a chat"}</p>
                        <p className="text-[10px] text-[#3d8c40] uppercase font-mono">Active Chat</p>
                      </div>
                    </div>
                    <button onClick={() => setView('profile')} className="text-[#666] hover:text-white transition-all"><LogOut className="w-5 h-5" /></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {messages.length === 0 && <div className="text-center py-20 text-[#444]">No messages yet.</div>}
                    {messages.map((m: any) => (
                      <div key={m.id} className={`flex ${m.sender === user?.email ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-4 rounded-2xl space-y-2 ${m.sender === user?.email ? 'bg-[#3d8c40] text-white' : 'bg-[#1a1a1a] border border-[#333] text-[#888]'} ${m.is_bot ? 'border-red-500/30 bg-red-500/5' : ''}`}>
                          {m.is_bot && <div className="flex items-center gap-2 text-red-400 font-bold text-[10px] uppercase mb-1"><Shield className="w-3 h-3" /> {m.bot_name}</div>}
                          <p className="text-sm">{m.content}</p>
                          {m.image && <img src={m.image} className="rounded-lg w-full mt-2" referrerPolicy="no-referrer" />}
                          <p className="text-[8px] opacity-50 text-right">{new Date(m.created_at).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const input = (e.target as any).message;
                    if (!input.value.trim() || !activeChat) return;
                    await fetch('/api/messages', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'x-user-email': user?.email || '' },
                      body: JSON.stringify({ receiver: activeChat, content: input.value })
                    });
                    input.value = '';
                    fetchMessages(activeChat);
                  }} className="p-4 bg-[#1a1a1a] border-t border-[#333] flex gap-4">
                    <input name="message" type="text" placeholder="Type a message..." className="flex-1 bg-[#252525] border border-[#333] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3d8c40] transition-all" />
                    <button type="submit" className="bg-[#3d8c40] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#4caf50] transition-all">Send</button>
                  </form>
                </div>
              </motion.div>
            )}

            {view === 'banned_mods' && (
              <motion.div key="banned_mods" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 flex items-center gap-4">
                  <ShieldAlert className="w-8 h-8 text-red-500" />
                  <div>
                    <h2 className="text-lg font-bold text-white">Robbie's Enforcement Log</h2>
                    <p className="text-xs text-red-400/80">Illegal mod attempts are publicly logged here. Second chances are rare.</p>
                  </div>
                </div>

                {bannedMods.length === 0 && <div className="text-center py-20 text-[#444]">Robbie hasn't caught anyone today. Good.</div>}
                
                <div className="space-y-6">
                  {bannedMods.map((m: any) => (
                    <div key={m.id} className="bg-[#252525] border border-red-500/30 rounded-2xl overflow-hidden shadow-2xl">
                      <div className="p-6 md:p-8 space-y-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center"><Shield className="w-6 h-6 text-red-500" /></div>
                          <div>
                            <p className="text-sm font-bold text-white">Robbie The Robot Guard <span className="text-[#444] font-normal ml-2">@system</span></p>
                            <p className="text-[10px] text-red-400 uppercase font-mono tracking-widest">Enforcement Action</p>
                          </div>
                        </div>

                        <div className="space-y-4 bg-[#1a1a1a] p-6 rounded-xl border border-[#333]">
                          <p className="text-sm text-[#aaa] leading-relaxed">
                            Everyone, <span className="text-red-400 font-bold">@{m.author_name}</span> tried to make an illegal mod that breaks the rules!
                          </p>
                          <div className="flex gap-4 items-start bg-[#252525] p-4 rounded-lg border border-red-500/10">
                            <div className="w-16 h-16 bg-[#1a1a1a] rounded flex items-center justify-center shrink-0">
                              <Package className="w-8 h-8 text-red-500/20" />
                            </div>
                            <div>
                              <h4 className="text-white font-bold text-sm">{m.name}</h4>
                              <p className="text-[10px] text-[#666] line-clamp-2">{m.description}</p>
                            </div>
                          </div>
                          <div className="bg-black/20 p-4 rounded-lg border border-[#333]">
                            <p className="text-[9px] font-bold text-[#444] uppercase mb-2">The Prompt (Evidence):</p>
                            <p className="text-xs text-red-400/80 font-mono italic">"{m.ban_prompt}"</p>
                          </div>
                          <p className="text-[10px] text-[#444] italic">"You know what? People have second chances, so if they do it again... bye bye, you are permanently banned." — Robbie</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
            
            {view === 'history' && (
              <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                {chatHistory.length === 0 && <div className="text-center py-20 text-[#444]">No chat history yet.</div>}
                {chatHistory.map((h: any) => (
                  <div key={h.id} className="bg-[#252525] border border-[#333] rounded-xl p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2 text-[#3d8c40]"><MessageSquare className="w-4 h-4" /><span className="text-[10px] font-bold uppercase tracking-widest">Prompt</span></div>
                      <span className="text-[10px] text-[#444] font-mono">{new Date(h.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-white">{h.prompt}</p>
                    <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#333] space-y-2">
                      <div className="flex items-center gap-2 text-purple-400"><Brain className="w-3 h-3" /><span className="text-[9px] font-bold uppercase tracking-widest">Thinking</span></div>
                      <p className="text-xs text-[#666] italic">"{h.thinking}"</p>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {view === 'admin' && (
              <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
                <section className="space-y-6">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3"><ShieldAlert className="text-red-500 w-6 h-6" /> Safety Violations Log</h2>
                  <div className="space-y-4">
                    {violations.map((v: any) => (
                      <div key={v.id} className="bg-[#252525] border border-[#333] rounded-xl p-6 flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2"><span className="text-red-400 font-bold">{v.email}</span><span className="text-[#444] text-[10px] uppercase font-mono">{new Date(v.created_at).toLocaleString()}</span></div>
                          <p className="text-white text-sm">Prompt: <span className="text-[#888]">"{v.prompt}"</span></p>
                          <p className="text-red-400 text-xs italic">Reason: {v.reason}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleAdminAction(v.email, 'unban')} className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700 transition-all">Unban</button>
                          <button onClick={() => handleAdminAction(v.email, 'ban', { reason: 'Manual ban by admin' })} className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 transition-all">Ban</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-6">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3"><Package className="text-[#3d8c40] w-6 h-6" /> Mod Moderation</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {allMods.map((m: any) => (
                      <div key={m.id} className="bg-[#252525] border border-[#333] rounded-xl p-6 flex justify-between items-center">
                        <div>
                          <h3 className="text-white font-bold">{m.name}</h3>
                          <p className="text-[10px] text-[#666]">{m.author}</p>
                        </div>
                        <button onClick={() => handleAdminAction(m.id, 'mod_ban')} className="px-4 py-2 bg-red-600/20 text-red-400 text-xs font-bold rounded hover:bg-red-600 hover:text-white transition-all">Ban Mod</button>
                      </div>
                    ))}
                    {bannedMods.map((m: any) => (
                      <div key={m.id} className="bg-[#252525] border border-red-500/30 rounded-xl p-6 flex justify-between items-center opacity-60">
                        <div>
                          <h3 className="text-white font-bold">{m.name} (BANNED)</h3>
                          <p className="text-[10px] text-[#666]">{m.author}</p>
                        </div>
                        <button onClick={() => handleAdminAction(m.id, 'mod_unban')} className="px-4 py-2 bg-green-600/20 text-green-400 text-xs font-bold rounded hover:bg-green-600 hover:text-white transition-all">Unban Mod</button>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-6">
                  <div className="bg-[#252525] border border-[#333] rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[#1a1a1a] text-[#444] uppercase text-[10px] font-bold tracking-widest">
                        <tr>
                          <th className="p-4">User</th>
                          <th className="p-4">Role</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#333]">
                        {allUsers.map((u: any) => (
                          <tr key={u.email} className="hover:bg-[#333]/20 transition-all">
                            <td className="p-4">
                              <p className="text-white font-bold">{u.username}</p>
                              <p className="text-[10px] text-[#666]">{u.email}</p>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${u.role === 'owner' ? 'bg-purple-500/20 text-purple-400' : u.role === 'operator' ? 'bg-blue-500/20 text-blue-400' : u.role === 'mod' ? 'bg-green-500/20 text-green-400' : 'bg-[#333] text-[#666]'}`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${u.status === 'active' ? 'text-green-500' : 'text-red-500'}`}>
                                {u.status}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex gap-2">
                                {userStatus?.role === 'owner' && u.role !== 'owner' && (
                                  <select onChange={(e) => handleAdminAction(u.email, 'set_role', { role: e.target.value })} className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-[10px] outline-none">
                                    <option value="">Set Role</option>
                                    <option value="operator">Operator</option>
                                    <option value="mod">Mod</option>
                                    <option value="user">User</option>
                                  </select>
                                )}
                                {userStatus?.role === 'operator' && u.role === 'mod' && (
                                  <button onClick={() => handleAdminAction(u.email, 'set_role', { role: 'user' })} className="text-red-400 hover:underline text-[10px] font-bold uppercase">Demote</button>
                                )}
                                {((userStatus?.role === 'owner' && u.role !== 'owner') || (userStatus?.role === 'operator' && u.role === 'mod')) && (
                                  <button onClick={() => handleAdminAction(u.email, u.status === 'active' ? 'ban' : 'unban', { reason: 'Admin action' })} className="text-red-500 hover:underline text-[10px] font-bold uppercase">
                                    {u.status === 'active' ? 'Ban' : 'Unban'}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <footer className="max-w-5xl mx-auto p-12 text-center text-[#333] text-[10px] font-mono uppercase tracking-[0.4em]">
          Not an official Minecraft product. Not approved by or associated with Mojang.
        </footer>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#252525] border border-[#333] rounded-2xl p-8 max-w-md w-full shadow-2xl space-y-6">
              <div className="flex items-center gap-3 text-red-500">
                <ShieldAlert className="w-6 h-6" />
                <h3 className="text-xl font-bold">Report User</h3>
              </div>
              <p className="text-xs text-[#666]">Reporting: <span className="text-white font-bold">{showReportModal}</span></p>
              
              <form onSubmit={handleReport} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#444] uppercase tracking-widest ml-1">Reason</label>
                  <select 
                    value={reportForm.reason} 
                    onChange={e => setReportForm({ ...reportForm, reason: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl p-4 text-sm focus:border-[#3d8c40] outline-none transition-all appearance-none"
                  >
                    <option value="harassing">Harassing</option>
                    <option value="swearing">Swearing</option>
                    <option value="bullying">Bullying</option>
                    <option value="threatening">Threatening</option>
                    <option value="illegal">Illegal Content</option>
                    <option value="others">Others</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#444] uppercase tracking-widest ml-1">Explanation</label>
                  <textarea 
                    value={reportForm.explanation} 
                    onChange={e => setReportForm({ ...reportForm, explanation: e.target.value })}
                    placeholder="Explain why you are reporting this user..."
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl p-4 text-sm focus:border-[#3d8c40] outline-none transition-all h-24 resize-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#444] uppercase tracking-widest ml-1">Proof (Image URL / Upload)</label>
                  <div className="flex items-center gap-4">
                    <label className="flex-1 bg-[#1a1a1a] border border-[#333] border-dashed rounded-xl p-4 text-center cursor-pointer hover:border-[#3d8c40] transition-all">
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setReportForm({ ...reportForm, proof: reader.result as string });
                          reader.readAsDataURL(file);
                        }
                      }} />
                      <span className="text-[10px] text-[#444] uppercase font-bold">{reportForm.proof ? "Image Selected" : "Upload Screenshot"}</span>
                    </label>
                    {reportForm.proof && <button type="button" onClick={() => setReportForm({...reportForm, proof: ''})} className="text-red-500 text-[10px] font-bold uppercase">Clear</button>}
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowReportModal(null)} className="flex-1 py-4 bg-[#333] text-white font-bold rounded-xl hover:bg-[#444] transition-all">Cancel</button>
                  <button type="submit" className="flex-1 py-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-600/20">Submit Report</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {editingMod && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#252525] border border-[#333] rounded-2xl p-8 max-w-2xl w-full shadow-2xl space-y-6">
              <div className="flex items-center gap-3 text-[#3d8c40]">
                <Star className="w-6 h-6" />
                <h3 className="text-xl font-bold">Edit Mod</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="w-full aspect-square bg-[#1a1a1a] border border-[#333] rounded-xl flex items-center justify-center overflow-hidden relative group">
                    {editingMod.files.find((f: any) => f.path.includes('icon'))?.content ? (
                      <img src={editingMod.files.find((f: any) => f.path.includes('icon'))?.content} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Package className="w-12 h-12 text-[#333]" />
                    )}
                    <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                      <span className="text-[8px] font-bold text-white uppercase">Change Icon</span>
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const newFiles = editingMod.files.map((f: any) => 
                              f.path.includes('icon') ? { ...f, content: ev.target?.result as string } : f
                            );
                            if (!newFiles.find((f: any) => f.path.includes('icon'))) {
                              newFiles.push({ path: 'pack_icon.png', content: ev.target?.result as string, type: 'image' });
                            }
                            setEditingMod({...editingMod, files: newFiles});
                          };
                          reader.readAsDataURL(file);
                        }
                      }} />
                    </label>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#444] uppercase tracking-widest ml-1">Mod Name</label>
                    <input 
                      value={editingMod.name} 
                      onChange={e => setEditingMod({...editingMod, name: e.target.value})}
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl p-4 text-sm focus:border-[#3d8c40] outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#444] uppercase tracking-widest ml-1">Description</label>
                    <textarea 
                      value={editingMod.description} 
                      onChange={e => setEditingMod({...editingMod, description: e.target.value})}
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl p-4 text-sm focus:border-[#3d8c40] outline-none transition-all h-32 resize-none"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setEditingMod(null)} className="flex-1 py-4 bg-[#333] text-white font-bold rounded-xl hover:bg-[#444] transition-all">Cancel</button>
                <button 
                  onClick={async () => {
                    const res = await fetch(`/api/mods/${editingMod.id}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'x-user-email': user?.email || '' },
                      body: JSON.stringify(editingMod)
                    });
                    if (res.ok) {
                      setEditingMod(null);
                      window.location.reload();
                    }
                  }}
                  className="flex-1 py-4 bg-[#3d8c40] hover:bg-[#4caf50] text-white font-bold rounded-xl transition-all shadow-lg"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
