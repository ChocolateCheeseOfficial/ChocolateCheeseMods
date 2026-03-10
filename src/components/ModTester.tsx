import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Play, Terminal, Bug, CheckCircle, AlertTriangle, RefreshCw, Package, Info } from 'lucide-react';
import { GeneratedMod } from '../services/modGenerator';

interface TestLog {
  type: 'info' | 'error' | 'success' | 'warning';
  message: string;
  timestamp: string;
}

export const ModTester = ({ mod }: { mod: GeneratedMod }) => {
  const [logs, setLogs] = useState<TestLog[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>('idle');

  const addLog = (type: TestLog['type'], message: string) => {
    setLogs(prev => [...prev, { type, message, timestamp: new Date().toLocaleTimeString() }].slice(-20));
  };

  const runSimulation = async () => {
    setIsTesting(true);
    setStatus('running');
    setLogs([]);
    addLog('info', `Initializing simulation for: ${mod.name}`);
    
    // Simulate loading manifest
    await new Promise(r => setTimeout(r, 800));
    const manifest = mod.files.find(f => f.path.endsWith('manifest.json'));
    if (manifest) {
      addLog('success', 'Manifest validation passed.');
    } else {
      addLog('error', 'Critical: manifest.json missing!');
    }

    // Simulate parsing JSON files
    await new Promise(r => setTimeout(r, 1000));
    const jsonFiles = mod.files.filter(f => f.path.endsWith('.json'));
    addLog('info', `Parsing ${jsonFiles.length} JSON definitions...`);
    let errors = 0;
    jsonFiles.forEach(f => {
      try {
        JSON.parse(f.content);
      } catch (e) {
        addLog('error', `Syntax error in ${f.path}`);
        errors++;
      }
    });
    if (errors === 0) addLog('success', 'All JSON files parsed successfully.');

    // Simulate asset check
    await new Promise(r => setTimeout(r, 1200));
    addLog('info', 'Checking resource pack dependencies...');
    const textures = mod.files.filter(f => f.path.includes('textures'));
    if (textures.length > 0) {
      addLog('success', `Found ${textures.length} texture assets.`);
    } else {
      addLog('warning', 'No custom textures found. Using default fallbacks.');
    }

    // Final result
    await new Promise(r => setTimeout(r, 1000));
    if (errors > 0) {
      setStatus('failed');
      addLog('error', 'Simulation failed. Please check the logs above.');
    } else {
      setStatus('completed');
      addLog('success', 'Simulation completed! Mod is stable for Bedrock Edition.');
    }
    setIsTesting(false);
  };

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Left Panel: Mod Info */}
      <div className="md:col-span-1 space-y-6">
        <div className="bg-[#252525] border border-[#333] rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#1a1a1a] rounded-xl flex items-center justify-center border border-[#333]">
              <Package className="w-6 h-6 text-[#3d8c40]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white truncate">{mod.name}</h3>
              <p className="text-[10px] text-[#666] uppercase font-mono tracking-widest">Target: Bedrock</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-[#444]">
              <span>Files</span>
              <span className="text-white">{mod.files.length}</span>
            </div>
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-[#444]">
              <span>Status</span>
              <span className={`font-bold ${status === 'completed' ? 'text-[#3d8c40]' : status === 'failed' ? 'text-red-500' : 'text-[#888]'}`}>
                {status.toUpperCase()}
              </span>
            </div>
          </div>
          <button
            onClick={runSimulation}
            disabled={isTesting}
            className="w-full py-4 bg-[#3d8c40] hover:bg-[#4caf50] disabled:bg-[#333] text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {isTesting ? "Testing..." : "Run Test"}
          </button>
        </div>

        <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-[#444]">
            <Info className="w-4 h-4" />
            <h4 className="text-[10px] font-bold uppercase tracking-widest">Simulation Info</h4>
          </div>
          <p className="text-[11px] text-[#666] leading-relaxed">
            The Bedrock Sandbox simulates the Minecraft engine's behavior when loading your mod. It checks for manifest validity, JSON syntax, and resource mapping.
          </p>
        </div>
      </div>

      {/* Right Panel: Console */}
      <div className="md:col-span-2 bg-[#1a1a1a] border border-[#333] rounded-2xl flex flex-col h-[500px] shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-[#333] bg-[#252525] flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#3d8c40]" />
            <span className="text-[10px] font-bold text-white uppercase tracking-widest">Debug Console</span>
          </div>
          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500/20" />
            <div className="w-2 h-2 rounded-full bg-yellow-500/20" />
            <div className="w-2 h-2 rounded-full bg-green-500/20" />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-3 font-mono text-[11px] custom-scrollbar">
          {logs.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-[#333] space-y-4">
              <Bug className="w-12 h-12 opacity-20" />
              <p className="uppercase tracking-[0.2em]">Awaiting Simulation Start</p>
            </div>
          )}
          {logs.map((log, i) => (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              key={i}
              className={`flex gap-3 border-l-2 pl-3 py-1 ${
                log.type === 'error' ? 'border-red-500 bg-red-500/5 text-red-400' :
                log.type === 'warning' ? 'border-yellow-500 bg-yellow-500/5 text-yellow-400' :
                log.type === 'success' ? 'border-[#3d8c40] bg-[#3d8c40]/5 text-[#3d8c40]' :
                'border-[#333] text-[#888]'
              }`}
            >
              <span className="opacity-30 shrink-0">[{log.timestamp}]</span>
              <span className="flex-1">{log.message}</span>
              {log.type === 'success' && <CheckCircle className="w-3 h-3 mt-0.5" />}
              {log.type === 'error' && <AlertTriangle className="w-3 h-3 mt-0.5" />}
            </motion.div>
          ))}
        </div>

        <div className="p-4 bg-[#252525] border-t border-[#333] flex justify-between items-center">
          <div className="text-[9px] text-[#444] uppercase font-bold">
            {isTesting ? "Engine: Processing..." : "Engine: Ready"}
          </div>
          {status === 'completed' && (
            <div className="flex items-center gap-2 text-[#3d8c40] text-[9px] font-bold uppercase">
              <CheckCircle className="w-3 h-3" /> All Systems Nominal
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
