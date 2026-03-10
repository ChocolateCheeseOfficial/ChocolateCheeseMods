import React, { useState, useEffect } from 'react';
import { Search, Download, MessageSquare, Star, User, Calendar, Heart, Package, Shield } from 'lucide-react';
import { GeneratedMod } from '../services/modGenerator';
import JSZip from 'jszip';

interface CommunityMod extends GeneratedMod {
  id: number;
  author: string;
  category: string;
  created_at: string;
  likes: number;
}

export const Community = ({ userEmail, onUserClick, onReport, onEdit }: { 
  userEmail: string, 
  onUserClick?: (email: string) => void,
  onReport?: (target: string) => void,
  onEdit?: (mod: CommunityMod) => void
}) => {
  const [mods, setMods] = useState<CommunityMod[]>([]);
  const [search, setSearch] = useState('');
  const [selectedMod, setSelectedMod] = useState<CommunityMod | null>(null);
  const [ratings, setRatings] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMods();
  }, []);

  const fetchMods = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/mods');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setMods(data.map((m: any) => ({ ...m, files: JSON.parse(m.files) })));
    } catch (err) {
      console.error("Failed to fetch mods", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRatings = async (modId: number) => {
    try {
      const res = await fetch(`/api/mods/${modId}/ratings`);
      const data = await res.json();
      setRatings(data);
    } catch (err) {
      console.error("Failed to fetch ratings", err);
    }
  };

  const handleLike = async (modId: number) => {
    try {
      const res = await fetch(`/api/mods/${modId}/like`, {
        method: 'POST',
        headers: { 'x-user-email': userEmail }
      });
      if (res.ok) {
        fetchMods();
        if (selectedMod?.id === modId) {
          setSelectedMod(prev => prev ? { ...prev, likes: prev.likes + 1 } : null);
        }
      }
    } catch (err) {
      console.error("Failed to like mod", err);
    }
  };

  const handleAddRating = async () => {
    if (!selectedMod || !newComment.trim()) return;
    
    try {
      await fetch(`/api/mods/${selectedMod.id}/ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-email': userEmail },
        body: JSON.stringify({
          rating: 5,
          comment: newComment,
          user: userEmail
        })
      });
      setNewComment('');
      fetchRatings(selectedMod.id);
    } catch (err) {
      console.error("Failed to add comment", err);
    }
  };

  const handleDownload = async (mod: CommunityMod) => {
    const zip = new JSZip();
    mod.files.forEach(file => {
      if (file.type === 'image' || file.path.endsWith('.png')) {
        const base64Data = file.content.split(',')[1] || file.content;
        zip.file(file.path, base64Data, { base64: true });
      } else {
        zip.file(file.path, file.content);
      }
    });
    const content = await zip.generateAsync({ type: "blob" });
    const url = window.URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${mod.name.replace(/\s+/g, '_')}.mcaddon`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredMods = mods.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.description.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedMod) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="bg-[#252525] border border-[#333] rounded-xl overflow-hidden shadow-2xl">
          <div className="p-8 space-y-6">
            <button onClick={() => setSelectedMod(null)} className="text-[#3d8c40] text-sm font-bold uppercase tracking-widest hover:underline">← Back to Gallery</button>
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
              <div>
                <h2 className="text-2xl md:text-4xl font-bold text-white mb-2">{selectedMod.name}</h2>
                <div className="flex flex-wrap items-center gap-3 md:gap-4 text-[#666] text-[10px] md:text-xs font-mono">
                  <span className="flex items-center gap-1"><User className="w-3 h-3" /> {selectedMod.author}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(selectedMod.created_at).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-red-500" /> {selectedMod.likes}</span>
                </div>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                {(selectedMod.author === userEmail || userEmail === 'guillermojohn1105@gmail.com') && (
                  <button 
                    onClick={() => onEdit?.(selectedMod)}
                    className="flex-1 md:flex-none bg-[#333] text-white px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-[#444] transition-all"
                  >
                    <Star className="w-5 h-5 text-[#3d8c40]" /> Edit
                  </button>
                )}
                <button 
                  onClick={() => onReport?.(selectedMod.author)}
                  className="flex-1 md:flex-none bg-[#333] text-white px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-[#444] transition-all"
                >
                  <Shield className="w-5 h-5 text-red-400" /> Report
                </button>
                <button 
                  onClick={() => handleLike(selectedMod.id)}
                  className="flex-1 md:flex-none bg-[#333] text-white px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-[#444] transition-all"
                >
                  <Heart className="w-5 h-5 text-red-500" /> Like
                </button>
                <button 
                  onClick={() => handleDownload(selectedMod)}
                  className="flex-1 md:flex-none bg-[#3d8c40] text-white px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 shadow-[0_4px_0_0_#2d662f] active:translate-y-1 active:shadow-none transition-all"
                >
                  <Download className="w-5 h-5" /> Download
                </button>
              </div>
            </div>
            
            <p className="text-[#aaa] leading-relaxed text-sm md:text-lg">{selectedMod.description}</p>

            <div className="border-t border-[#333] pt-8 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[#3d8c40]" /> Comments
                </h3>
                
                <div className="space-y-4">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-4 text-sm focus:outline-none focus:border-[#3d8c40] transition-all h-24 resize-none"
                  />
                  <button 
                    onClick={handleAddRating}
                    className="bg-[#3d8c40] text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-[#4caf50] transition-all"
                  >
                    Post Comment
                  </button>
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {ratings.length === 0 && <p className="text-[#444] italic">No comments yet.</p>}
                  {ratings.map((r, i) => (
                    <div key={i} className="bg-[#1a1a1a] p-4 rounded-lg border border-[#333]">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[#3d8c40] text-xs font-bold">{r.user}</span>
                        <span className="text-[#444] text-[10px]">{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[#888] text-sm">{r.comment}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Star className="w-5 h-5 text-[#3d8c40]" /> Mod Details
                </h3>
                <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#333] space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#444]">Files</span>
                    <span className="text-white font-mono">{selectedMod.files.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#444]">Category</span>
                    <span className="text-[#3d8c40] uppercase tracking-tighter font-bold">{selectedMod.category}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#444] w-5 h-5" />
          <input
            type="text"
            placeholder="Search community mods..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#252525] border border-[#333] rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-[#3d8c40] transition-all"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => (
            <div key={i} className="h-64 bg-[#252525] rounded-xl animate-pulse border border-[#333]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMods.map((mod) => (
            <div 
              key={mod.id}
              onClick={() => {
                setSelectedMod(mod);
                fetchRatings(mod.id);
              }}
              className="bg-[#252525] border border-[#333] rounded-xl overflow-hidden hover:border-[#3d8c40]/50 transition-all group cursor-pointer shadow-xl"
            >
              <div className="h-40 bg-[#1a1a1a] flex items-center justify-center relative overflow-hidden">
                {mod.files.find(f => f.path.includes('icon')) ? (
                  <img src={mod.files.find(f => f.path.includes('icon'))?.content} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                ) : (
                  <Package className="w-12 h-12 text-[#333] group-hover:text-[#3d8c40] transition-colors" />
                )}
                <div className="absolute top-3 right-3 bg-[#3d8c40] text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest shadow-lg">
                  {mod.category}
                </div>
              </div>
              <div className="p-6 space-y-3">
                <h3 className="text-xl font-bold text-white group-hover:text-[#3d8c40] transition-colors truncate">{mod.name}</h3>
                <p className="text-[#666] text-xs line-clamp-2 leading-relaxed">{mod.description}</p>
                <div className="flex items-center justify-between pt-4 border-t border-[#333]">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onUserClick?.(mod.author);
                    }}
                    className="flex items-center gap-2 text-[#3d8c40] hover:underline text-[10px] font-mono"
                  >
                    <User className="w-3 h-3" /> {mod.author.split('@')[0]}
                  </button>
                  <div className="flex items-center gap-3">
                    {(mod.author === userEmail || userEmail === 'guillermojohn1105@gmail.com') && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onEdit?.(mod); }}
                        className="p-1 hover:bg-[#333] rounded text-[#666] hover:text-[#3d8c40] transition-all"
                      >
                        <Star className="w-3 h-3" />
                      </button>
                    )}
                    <button 
                      onClick={(e) => { e.stopPropagation(); onReport?.(mod.author); }}
                      className="p-1 hover:bg-[#333] rounded text-[#666] hover:text-red-400 transition-all"
                    >
                      <Shield className="w-3 h-3" />
                    </button>
                    <span className="flex items-center gap-1 text-[#444] text-[10px] font-mono">
                      <Heart className="w-3 h-3 text-red-500" /> {mod.likes}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
