import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Globe, Crosshair, Radar, Shield } from "lucide-react";

export const SatelliteFeed: React.FC = () => {
  const [activeNodes, setActiveNodes] = useState<number>(12);
  const [signalStrength, setSignalStrength] = useState<number>(98.4);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
    const interval = setInterval(() => {
      setActiveNodes(prev => Math.max(8, Math.min(16, prev + (Math.random() > 0.5 ? 1 : -1))));
      setSignalStrength(prev => Math.max(92, Math.min(100, prev + (Math.random() - 0.5) * 0.2)));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!isReady) return <div className="w-full h-full bg-black/20 animate-pulse" />;

  return (
    <div className="w-full h-full relative flex flex-col p-4 bg-black/20 overflow-hidden">
      {/* Background Grid */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#1e3a5f 1px, transparent 1px), linear-gradient(90deg, #1e3a5f 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }}
      />

      {/* Header Info */}
      <div className="relative z-10 flex items-center justify-between mb-4">
        <div className="flex flex-col">
          <span className="text-[8px] font-mono text-blue-400/60 uppercase tracking-widest">Orbital Status</span>
          <span className="text-[10px] font-mono text-white/90 uppercase font-black uppercase tracking-widest">Active Links: {activeNodes}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[8px] font-mono text-blue-400/60 uppercase tracking-widest">Signal integrity</span>
          <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">{signalStrength.toFixed(1)}%</span>
        </div>
      </div>

      {/* Main Visualization: 3D Globe Concept (SVG/CSS) */}
      <div className="flex-1 relative flex items-center justify-center">
        <div className="relative w-40 h-40">
          {/* Globe Outline */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border-2 border-dashed border-blue-500/20 rounded-full"
          />
          <div className="absolute inset-2 border border-blue-500/10 rounded-full" />
          
          {/* Central Icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Globe className="w-12 h-12 text-blue-500/40 animate-pulse" />
          </div>

          {/* Scanning Lines */}
          <motion.div 
            animate={{ top: ["0%", "100%", "0%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 right-0 h-[1px] bg-blue-400/30 blur-[1px] z-20"
          />

          {/* Data Points */}
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-red-400 rounded-full shadow-[0_0_8px_rgba(248,113,113,0.8)]"
              animate={{ 
                opacity: [0.2, 1, 0.2],
                scale: [1, 1.5, 1]
              }}
              transition={{ 
                duration: 2 + i, 
                repeat: Infinity, 
                delay: i * 0.5 
              }}
              style={{
                top: `${20 + Math.random() * 60}%`,
                left: `${20 + Math.random() * 60}%`
              }}
            />
          ))}
        </div>

        {/* Diagnostic Text */}
        <div className="absolute bottom-2 left-2 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Radar className="w-3 h-3 text-blue-400/40" />
            <span className="text-[7px] font-mono text-blue-400/40">LAT: 28.6139</span>
          </div>
          <div className="flex items-center gap-2">
            <Crosshair className="w-3 h-3 text-blue-400/40" />
            <span className="text-[7px] font-mono text-blue-400/40">LON: 77.2090</span>
          </div>
        </div>
      </div>

      {/* Footer Metrics */}
      <div className="mt-4 pt-2 border-t border-white/5 flex gap-4">
        <div className="flex-1 flex flex-col gap-1">
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-blue-500"
              animate={{ width: ["40%", "70%", "60%"] }}
              transition={{ duration: 5, repeat: Infinity }}
            />
          </div>
          <span className="text-[7px] font-mono text-white/40 uppercase">Uplink Load</span>
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-emerald-500"
              animate={{ width: ["80%", "75%", "90%"] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
          </div>
          <span className="text-[7px] font-mono text-white/40 uppercase">Encryption Strength</span>
        </div>
      </div>
    </div>
  );
};
