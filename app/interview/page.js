'use client';

import { useEffect, useState } from 'react';

export default function InterviewRoom() {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    // Grab the setup configuration values stored from the previous screen
    const savedConfig = window.sessionStorage.getItem('polaris_config');
    if (savedConfig) {
      setConfig(JSON.deserialize ? JSON.deserialize(savedConfig) : JSON.parse(savedConfig));
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4">
      <div className="text-center max-w-xl space-y-4">
        <h2 className="text-3xl font-bold tracking-tight text-indigo-400">
          Polaris Workspace
        </h2>
        <p className="text-sm text-slate-400">
          This workspace is successfully configured. Ready to initialize MediaPipe landmarks and custom Web Audio streams.
        </p>
        
        {config && (
          <div className="mt-6 p-4 bg-slate-900 border border-slate-800 rounded-xl text-left text-xs font-mono text-slate-300 space-y-1">
            <p className="text-indigo-400 font-semibold mb-2">// Initialized Parameters:</p>
            <p><span className="text-cyan-400">role:</span> "{config.role}"</p>
            <p><span className="text-cyan-400">level:</span> "{config.experienceLevel}"</p>
            <p><span className="text-cyan-400">industry:</span> "{config.industry}"</p>
            <p><span className="text-cyan-400">language:</span> "{config.language}"</p>
          </div>
        )}
      </div>
    </div>
  );
}
