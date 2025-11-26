import React from 'react';
import { Shield } from 'lucide-react';

export const Header: React.FC = () => {
  const today = new Date().toLocaleDateString('pt-BR', { 
    day: '2-digit', month: '2-digit', year: 'numeric' 
  });

  return (
    <header className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-20 border-b-4 border-amber-500">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 p-2 rounded text-slate-900 shadow-md">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white leading-none">OBSERVATÓRIO <span className="text-amber-500">GINT</span></h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mt-1">Inteligência em Segurança Pública</p>
          </div>
        </div>
        <div className="text-right hidden sm:block bg-slate-800 px-3 py-1 rounded border border-slate-700">
          <p className="font-semibold text-xs text-slate-300">Data de Referência</p>
          <p className="font-bold text-sm text-white">{today}</p>
        </div>
      </div>
    </header>
  );
};
