import React from 'react';
import { BookOpen, Lightbulb, Code, Package, Play } from 'lucide-react';

export const Tutorial = () => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="bg-[#252525] border border-[#333] rounded-xl p-6 md:p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <BookOpen className="text-[#3d8c40] w-6 h-6 md:w-8 md:h-8" />
          <h2 className="text-xl md:text-3xl font-bold text-white tracking-tight">Beginner's Guide: Custom Items</h2>
        </div>
        
        <p className="text-[#aaa] mb-8 leading-relaxed text-sm md:text-base">
          Creating a custom item in Minecraft Bedrock Edition involves two main parts: a <strong>Behavior Pack</strong> (defines what the item does) and a <strong>Resource Pack</strong> (defines how it looks).
        </p>

        <div className="space-y-8 md:space-y-12">
          <div className="relative pl-6 md:pl-8 border-l-2 border-[#3d8c40]/30">
            <div className="absolute -left-3 top-0 w-6 h-6 bg-[#3d8c40] rounded-full flex items-center justify-center text-white text-[10px] md:text-xs font-bold">1</div>
            <h3 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-4">The Manifest</h3>
            <p className="text-[#888] text-xs md:text-sm mb-4">Every pack needs a <code>manifest.json</code>. It tells Minecraft the name, description, and unique ID (UUID) of your mod.</p>
            <div className="bg-[#1a1a1a] p-3 md:p-4 rounded-lg font-mono text-[10px] md:text-xs text-[#3d8c40] overflow-x-auto">
              "header": {"{"} "name": "My Cool Item", "uuid": "..." {"}"}
            </div>
          </div>

          <div className="relative pl-6 md:pl-8 border-l-2 border-[#3d8c40]/30">
            <div className="absolute -left-3 top-0 w-6 h-6 bg-[#3d8c40] rounded-full flex items-center justify-center text-white text-[10px] md:text-xs font-bold">2</div>
            <h3 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-4">Behavior Definition</h3>
            <p className="text-[#888] text-xs md:text-sm mb-4">Create a file in <code>items/my_item.json</code>. This defines components like <code>minecraft:icon</code> and <code>minecraft:display_name</code>.</p>
            <div className="bg-[#1a1a1a] p-3 md:p-4 rounded-lg font-mono text-[10px] md:text-xs text-[#3d8c40] overflow-x-auto">
              "minecraft:item": {"{"} "description": {"{"} "identifier": "custom:ruby" {"}"} {"}"}
            </div>
          </div>

          <div className="relative pl-8 border-l-2 border-[#3d8c40]/30">
            <div className="absolute -left-3 top-0 w-6 h-6 bg-[#3d8c40] rounded-full flex items-center justify-center text-white text-xs font-bold">3</div>
            <h3 className="text-xl font-bold text-white mb-4">Packaging</h3>
            <p className="text-[#888] text-sm mb-4">Zip your files and change the extension to <code>.mcaddon</code>. Minecraft will handle the rest!</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#252525] border border-[#333] p-6 rounded-xl">
          <Lightbulb className="text-yellow-500 w-6 h-6 mb-4" />
          <h4 className="text-white font-bold mb-2">Pro Tip</h4>
          <p className="text-[#666] text-xs">Always use unique identifiers (e.g., <code>yourname:item</code>) to avoid conflicts with other mods.</p>
        </div>
        <div className="bg-[#252525] border border-[#333] p-6 rounded-xl">
          <Code className="text-blue-500 w-6 h-6 mb-4" />
          <h4 className="text-white font-bold mb-2">JSON Validation</h4>
          <p className="text-[#666] text-xs">Minecraft is strict about commas and brackets. Use a validator if your mod doesn't load.</p>
        </div>
        <div className="bg-[#252525] border border-[#333] p-6 rounded-xl">
          <Play className="text-green-500 w-6 h-6 mb-4" />
          <h4 className="text-white font-bold mb-2">Testing</h4>
          <p className="text-[#666] text-xs">Enable "Holiday Creator Features" in your world settings to ensure custom items work.</p>
        </div>
      </div>
    </div>
  );
};
