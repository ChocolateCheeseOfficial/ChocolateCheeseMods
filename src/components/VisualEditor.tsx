import React, { useState, useRef } from 'react';
import { Box, MousePointer2, Settings, Layers, Save, Plus, Trash2, Palette, Zap, Upload, FileJson } from 'lucide-react';
import JSZip from 'jszip';

export const VisualEditor = () => {
  const [activeTab, setActiveTab] = useState<'properties' | 'components' | 'texture'>('properties');
  const [modData, setModData] = useState({
    identifier: 'custom:my_block',
    displayName: 'My Custom Block',
    hardness: 3.0,
    explosionResistance: 6.0,
    mapColor: '#3D8C40',
    components: ['minecraft:destructible_by_mining', 'minecraft:friction', 'minecraft:light_emission']
  });
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);
      
      // Look for item or block definitions
      for (const [path, zipFile] of Object.entries(contents.files)) {
        if (path.endsWith('.json') && !path.includes('manifest.json')) {
          const text = await zipFile.async('text');
          const json = JSON.parse(text);
          
          // Basic heuristic to extract some data
          const block = json['minecraft:block'];
          const item = json['minecraft:item'];
          const data = block || item;

          if (data) {
            const desc = data.description;
            const comps = data.components || {};
            
            setModData({
              identifier: desc?.identifier || modData.identifier,
              displayName: desc?.identifier?.split(':')?.[1]?.replace(/_/g, ' ') || modData.displayName,
              hardness: comps['minecraft:destructible_by_mining']?.seconds_to_destroy || 3.0,
              explosionResistance: comps['minecraft:explosion_resistance']?.resistance || 6.0,
              mapColor: comps['minecraft:map_color'] || '#3D8C40',
              components: Object.keys(comps)
            });
            break; // Just take the first one for now
          }
        }
      }
      alert("Imported successfully! Note: Only basic properties were mapped.");
    } catch (err) {
      console.error(err);
      alert("Failed to import .mcaddon. Make sure it's a valid Bedrock package.");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-[600px] md:h-[700px] bg-[#252525] border border-[#333] rounded-xl overflow-hidden shadow-2xl flex flex-col md:flex-row animate-in zoom-in-95 duration-500">
      {/* Sidebar - Tools (Hidden on mobile, or could be a top bar) */}
      <div className="hidden md:flex w-16 border-r border-[#333] bg-[#1a1a1a] flex-col items-center py-6 gap-6">
        <button className="p-3 bg-[#3d8c40] text-white rounded-lg shadow-lg"><MousePointer2 className="w-5 h-5" /></button>
        <button className="p-3 text-[#444] hover:text-[#3d8c40] transition-colors"><Box className="w-5 h-5" /></button>
        <button className="p-3 text-[#444] hover:text-[#3d8c40] transition-colors"><Palette className="w-5 h-5" /></button>
        <button className="p-3 text-[#444] hover:text-[#3d8c40] transition-colors"><Zap className="w-5 h-5" /></button>
        <div className="mt-auto flex flex-col gap-4 pb-4">
          <button className="p-3 text-[#444] hover:text-white transition-colors"><Settings className="w-5 h-5" /></button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative bg-[#151515] flex flex-col min-h-[300px]">
        <div className="h-12 border-b border-[#333] bg-[#1a1a1a] flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2 md:gap-4">
            <span className="text-[8px] md:text-[10px] font-bold text-[#444] uppercase tracking-widest truncate max-w-[100px] md:max-w-none">Project: {modData.identifier}</span>
            <div className="h-4 w-px bg-[#333]"></div>
            <div className="flex gap-1 md:gap-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImport} 
                accept=".mcaddon,.zip" 
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="px-2 md:px-3 py-1 bg-[#252525] border border-[#333] rounded text-[8px] md:text-[9px] text-[#888] hover:text-white flex items-center gap-1"
              >
                <Upload className="w-3 h-3" /> {isImporting ? '...' : 'Import'}
              </button>
            </div>
          </div>
          <button className="flex items-center gap-2 bg-[#3d8c40] text-white px-3 md:px-4 py-1.5 rounded text-[8px] md:text-[10px] font-bold uppercase tracking-widest shadow-[0_2px_0_0_#2d662f] active:translate-y-0.5 active:shadow-none transition-all">
            <Save className="w-3 h-3" /> Save
          </button>
        </div>

        {/* 3D Viewport Placeholder */}
        <div className="flex-1 flex items-center justify-center overflow-hidden p-8">
          <div className="relative">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#3d8c40 1px, transparent 0)', backgroundSize: '20px 20px' }}></div>
            
            <div className="w-32 h-32 md:w-48 md:h-48 relative transform rotate-x-12 rotate-y-45 perspective-1000">
              <div 
                className="absolute inset-0 border-2 shadow-2xl rounded-sm transition-colors duration-500"
                style={{ backgroundColor: modData.mapColor, borderColor: modData.mapColor }}
              >
                <div className="absolute inset-0 bg-black/20"></div>
              </div>
              <div className="absolute -top-4 -right-4 bg-white text-black text-[8px] font-bold px-2 py-1 rounded shadow-lg">PREVIEW</div>
            </div>
          </div>
          
          <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 flex flex-col gap-2">
            <div className="bg-[#1a1a1a]/80 backdrop-blur p-2 md:p-3 rounded-lg border border-[#333] text-[8px] md:text-[9px] font-mono text-[#666]">
              X: 0.00 | Y: 1.00 | Z: 0.00
            </div>
          </div>
        </div>
      </div>

      {/* Properties Panel */}
      <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-[#333] bg-[#1a1a1a] flex flex-col h-[400px] md:h-auto">
        <div className="flex border-b border-[#333]">
          <button 
            onClick={() => setActiveTab('properties')}
            className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors ${activeTab === 'properties' ? 'text-[#3d8c40] border-b-2 border-[#3d8c40]' : 'text-[#444] hover:text-[#888]'}`}
          >
            Properties
          </button>
          <button 
            onClick={() => setActiveTab('components')}
            className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors ${activeTab === 'components' ? 'text-[#3d8c40] border-b-2 border-[#3d8c40]' : 'text-[#444] hover:text-[#888]'}`}
          >
            Components
          </button>
        </div>

        <div className="flex-1 p-4 md:p-6 overflow-y-auto custom-scrollbar">
          {activeTab === 'properties' ? (
            <div className="space-y-4 md:space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#444] uppercase tracking-widest">Identifier</label>
                <input 
                  type="text" 
                  value={modData.identifier} 
                  onChange={(e) => setModData({...modData, identifier: e.target.value})}
                  className="w-full bg-[#252525] border border-[#333] rounded p-2 text-xs text-white focus:outline-none focus:border-[#3d8c40]" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#444] uppercase tracking-widest">Display Name</label>
                <input 
                  type="text" 
                  value={modData.displayName} 
                  onChange={(e) => setModData({...modData, displayName: e.target.value})}
                  className="w-full bg-[#252525] border border-[#333] rounded p-2 text-xs text-white focus:outline-none focus:border-[#3d8c40]" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#444] uppercase tracking-widest">Hardness</label>
                  <input 
                    type="number" 
                    value={modData.hardness} 
                    onChange={(e) => setModData({...modData, hardness: parseFloat(e.target.value)})}
                    className="w-full bg-[#252525] border border-[#333] rounded p-2 text-xs text-white focus:outline-none focus:border-[#3d8c40]" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#444] uppercase tracking-widest">Explosion Res.</label>
                  <input 
                    type="number" 
                    value={modData.explosionResistance} 
                    onChange={(e) => setModData({...modData, explosionResistance: parseFloat(e.target.value)})}
                    className="w-full bg-[#252525] border border-[#333] rounded p-2 text-xs text-white focus:outline-none focus:border-[#3d8c40]" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#444] uppercase tracking-widest">Map Color</label>
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded border border-[#333]" style={{ backgroundColor: modData.mapColor }}></div>
                  <input 
                    type="text" 
                    value={modData.mapColor} 
                    onChange={(e) => setModData({...modData, mapColor: e.target.value})}
                    className="flex-1 bg-[#252525] border border-[#333] rounded p-2 text-xs text-white focus:outline-none focus:border-[#3d8c40]" 
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-[#444] uppercase tracking-widest">Active Components</span>
                <button className="text-[#3d8c40] hover:text-[#4caf50]"><Plus className="w-4 h-4" /></button>
              </div>
              <div className="space-y-2">
                {modData.components.map(comp => (
                  <div key={comp} className="bg-[#252525] border border-[#333] p-3 rounded flex items-center justify-between group">
                    <span className="text-[10px] font-mono text-[#888] truncate mr-2">{comp}</span>
                    <button 
                      onClick={() => setModData({...modData, components: modData.components.filter(c => c !== comp)})}
                      className="text-[#444] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[#333] bg-[#151515] hidden md:block">
          <div className="flex items-center gap-2 text-[10px] font-bold text-[#444] uppercase tracking-widest mb-3">
            <Layers className="w-3 h-3" /> Scene Hierarchy
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-2 py-1 bg-[#3d8c40]/10 text-[#3d8c40] rounded text-[10px]">
              <Box className="w-3 h-3" /> root_geometry
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
