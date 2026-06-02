import React from 'react';
import { ComicScript } from '../types.ts';
import { Plus, Trash2, FileText, Clock } from 'lucide-react';

interface DashboardProps {
  scripts: ComicScript[];
  onSelectScript: (id: string) => void;
  onCreateNewScript: () => void;
  onDeleteScript: (id: string, event: React.MouseEvent) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  scripts,
  onSelectScript,
  onCreateNewScript,
  onDeleteScript,
}) => {
  // Helper to format date into DD/MM/YY, HH:MM
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = String(d.getFullYear()).slice(-2);
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year}, ${hours}:${minutes}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col justify-start items-center px-6 py-16 font-sans">
      
      {/* Welcome Top Badging */}
      <div className="flex flex-col items-center mb-16 text-center">
        <span className="bg-[#131E35] border border-[#1E3A6F] text-[#38BDF8] text-[10px] font-bold tracking-[0.25em] uppercase px-4 py-1.5 rounded-full mb-4 shadow-sm select-none">
          SEJA BEM-VINDO DE VOLTA
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2 relative">
          Seus Roteiros
        </h1>
        <div className="w-16 h-1 bg-[#38BDF8] rounded-full"></div>
      </div>

      {/* Grid of Scripts */}
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* Create New Script Card */}
        <button
          onClick={onCreateNewScript}
          className="border-2 border-dashed border-[#1E293B] hover:border-[#38BDF8] bg-[#0F172A]/40 hover:bg-[#0F172A]/80 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[180px] group transition-all duration-350 cursor-pointer shadow-md hover:shadow-lg focus:outline-none hover:scale-[1.01]"
        >
          <div className="w-12 h-12 rounded-full bg-[#1E293B] group-hover:bg-[#38BDF8]/10 flex items-center justify-center mb-4 transition-colors duration-300">
            <Plus className="w-6 h-6 text-[#64748B] group-hover:text-[#38BDF8] transition-transform duration-300 group-hover:rotate-90" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#64748B] group-hover:text-[#38BDF8] transition-colors duration-300">
            NOVO ROTEIRO
          </span>
        </button>

        {/* List of Existing Scripts */}
        {scripts.map((script) => {
          const totalPages = script.pages.length;
          
          return (
            <div
              key={script.id}
              onClick={() => onSelectScript(script.id)}
              className="bg-[#0F172A]/80 border border-[#1E293B] hover:border-[#1E3A6F] rounded-2xl p-6 flex flex-col justify-between min-h-[180px] hover:scale-[1.02] hover:shadow-xl transition-all duration-300 cursor-pointer group relative"
            >
              {/* Top Row: File Icon, Pages Badge & Delete Action */}
              <div className="flex justify-between items-start w-full">
                <div className="w-10 h-10 rounded-xl bg-[#1E293B] flex items-center justify-center text-slate-300 group-hover:text-[#38BDF8] transition-colors">
                  <FileText className="w-5 h-5" />
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Page Count Badge */}
                  <span className="border border-[#1E293B] bg-[#131E35] text-slate-350 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full select-none">
                    {totalPages} {totalPages === 1 ? 'PÁG' : 'PÁGS'}
                  </span>
                  
                  {/* Delete Button */}
                  <button
                    onClick={(e) => onDeleteScript(script.id, e)}
                    className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                    title="Excluir Roteiro"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Title Section */}
              <div className="my-5 flex-1 flex flex-col justify-end">
                <h3 className="text-base font-bold text-white group-hover:text-[#38BDF8] transition-colors leading-tight truncate">
                  {script.title || 'Roteiro Sem Título'}
                </h3>
                {script.treatment && (
                  <span className="text-[10px] font-semibold text-[#64748B] mt-1 uppercase tracking-wide">
                    {script.treatment}
                  </span>
                )}
              </div>

              {/* Bottom Row: Separator & Timestamp */}
              <div className="pt-4 border-t border-[#1E293B] flex items-center gap-2 text-slate-550 text-[10.5px]">
                <Clock className="w-3.5 h-3.5 text-[#475569]" />
                <span className="font-mono text-slate-400">
                  {formatDate(script.updatedAt || script.createdAt)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
