import React, { useEffect, useRef } from "react";
import { motion } from "motion/react";

interface WaveformProps {
  isSpeaking: boolean;
  isListening: boolean;
}

export const Waveform: React.FC<WaveformProps> = ({ isSpeaking, isListening }) => {
  const bars = [0, 1, 2, 3, 4, 5];

  return (
    <div className="flex items-center justify-center gap-3 h-40 w-full">
      {bars.map((i) => (
        <motion.div
          key={i}
          className="w-10 bg-blue-600 rounded-full shadow-[0_0_25px_rgba(37,99,235,0.4)]"
          initial={{ height: 40 }}
          animate={{
            height: isSpeaking 
              ? [40, 120, 60, 100, 40] 
              : isListening 
              ? [40, 55, 40] 
              : 40,
            opacity: isSpeaking || isListening ? 1 : 0.3
          }}
          transition={{
            duration: isSpeaking ? 0.6 : 1.2,
            repeat: Infinity,
            delay: i * 0.1,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};
