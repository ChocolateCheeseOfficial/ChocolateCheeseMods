import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Pickaxe, Package, Zap, ChevronRight, ChevronLeft, Check, Sparkles, Brain } from 'lucide-react';

interface WizardStep {
  title: string;
  description: string;
}

const STEPS: WizardStep[] = [
  { title: "Mod Type", description: "What kind of mod are we building?" },
  { title: "Details", description: "Tell us more about the item or block." },
  { title: "Abilities", description: "What special powers should it have?" },
  { title: "Review", description: "Confirm your choices before forging." }
];

export const ModWizard = ({ onGenerate }: { onGenerate: (prompt: string, name: string) => void }) => {
  const [step, setStep] = useState(0);
  const [modType, setModType] = useState<'item' | 'block' | 'entity'>('item');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ability, setAbility] = useState('');

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSubmit = () => {
    const prompt = `Create a Minecraft Bedrock ${modType} mod named "${name}". 
    Description: ${description}. 
    Special Abilities: ${ability}. 
    Ensure it includes all necessary manifest and code files.`;
    onGenerate(prompt, name);
  };

  return (
    <div className="max-w-2xl mx-auto bg-[#252525] border border-[#333] rounded-3xl overflow-hidden shadow-2xl">
      {/* Progress Header */}
      <div className="bg-[#1a1a1a] p-6 border-b border-[#333]">
        <div className="flex justify-between items-center mb-4">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= i ? 'bg-[#3d8c40] text-white' : 'bg-[#333] text-[#666]'}`}>
                {step > i ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`hidden md:block text-[10px] font-bold uppercase tracking-widest ${step >= i ? 'text-white' : 'text-[#444]'}`}>{s.title}</span>
              {i < STEPS.length - 1 && <div className={`w-4 h-[1px] ${step > i ? 'bg-[#3d8c40]' : 'bg-[#333]'}`} />}
            </div>
          ))}
        </div>
        <h2 className="text-xl font-bold text-white">{STEPS[step].title}</h2>
        <p className="text-xs text-[#666]">{STEPS[step].description}</p>
      </div>

      <div className="p-8 min-h-[300px]">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { id: 'item', icon: Zap, label: 'New Item', desc: 'Tools, weapons, or consumables' },
                { id: 'block', icon: Package, label: 'New Block', desc: 'Building materials or machines' },
                { id: 'entity', icon: Brain, label: 'New Entity', desc: 'Mobs, NPCs, or pets' }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setModType(t.id as any)}
                  className={`p-6 rounded-2xl border-2 text-left transition-all space-y-3 ${modType === t.id ? 'border-[#3d8c40] bg-[#3d8c40]/10' : 'border-[#333] bg-[#1a1a1a] hover:border-[#444]'}`}
                >
                  <t.icon className={`w-8 h-8 ${modType === t.id ? 'text-[#3d8c40]' : 'text-[#444]'}`} />
                  <div>
                    <p className="font-bold text-white">{t.label}</p>
                    <p className="text-[10px] text-[#666]">{t.desc}</p>
                  </div>
                </button>
              ))}
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#444] uppercase tracking-widest">Mod Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Emerald Sword"
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl p-4 text-sm text-white focus:border-[#3d8c40] outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#444] uppercase tracking-widest">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this mod do?"
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl p-4 text-sm text-white focus:border-[#3d8c40] outline-none transition-all h-32 resize-none"
                />
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#444] uppercase tracking-widest">Special Abilities</label>
                <textarea
                  value={ability}
                  onChange={(e) => setAbility(e.target.value)}
                  placeholder="e.g., Shoots lightning when used, glows in the dark..."
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl p-4 text-sm text-white focus:border-[#3d8c40] outline-none transition-all h-48 resize-none"
                />
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-[#333] space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#444] uppercase tracking-widest">Type</span>
                  <span className="text-[#3d8c40] font-bold uppercase text-xs">{modType}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#444] uppercase tracking-widest">Name</span>
                  <span className="text-white font-bold text-xs">{name}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#444] uppercase tracking-widest">Description</span>
                  <p className="text-xs text-[#888]">{description}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#444] uppercase tracking-widest">Abilities</span>
                  <p className="text-xs text-[#888] italic">"{ability}"</p>
                </div>
              </div>
              <div className="bg-[#3d8c40]/10 p-4 rounded-xl border border-[#3d8c40]/20 flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-[#3d8c40]" />
                <p className="text-[10px] text-[#3d8c40] font-bold uppercase tracking-widest">Ready to forge with AI Architect</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Actions */}
      <div className="bg-[#1a1a1a] p-6 border-t border-[#333] flex justify-between gap-4">
        <button
          onClick={handleBack}
          disabled={step === 0}
          className="px-6 py-3 bg-[#333] text-white font-bold rounded-xl hover:bg-[#444] disabled:opacity-50 transition-all flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        {step === STEPS.length - 1 ? (
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 bg-[#3d8c40] text-white font-bold rounded-xl hover:bg-[#4caf50] transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            Forge Mod <Sparkles className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={step === 1 && !name.trim()}
            className="px-8 py-3 bg-[#3d8c40] text-white font-bold rounded-xl hover:bg-[#4caf50] disabled:opacity-50 transition-all flex items-center gap-2"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
