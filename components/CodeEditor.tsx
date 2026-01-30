import React, { useEffect, useRef, useState } from 'react';
import { ExecutionResult, Topic } from '../types';

interface TableSchema {
    name: string;
    columns: { name: string; type: string }[];
}

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  onRun: () => void;
  onResetDB?: () => void;
  isLoading: boolean;
  topic: Topic;
  executionResult: ExecutionResult | null;
  schemaInfo?: TableSchema[];
  isPythonReady?: boolean;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange, onRun, onResetDB, isLoading, topic, executionResult, schemaInfo, isPythonReady = true }) => {
  const resultRef = useRef<HTMLDivElement>(null);
  const [showSchema, setShowSchema] = useState(false);

  // Auto-scroll to result when it updates
  useEffect(() => {
    if (executionResult && resultRef.current) {
        resultRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [executionResult]);

  const placeholder = topic === Topic.SQL 
    ? '-- Você pode usar INSERT, UPDATE, DELETE aqui.\n-- Exemplo: Obter todos os produtos\nSELECT * FROM produtos;' 
    : '# Escreva seu código Python/Pandas aqui\n# A última linha será exibida automaticamente se for um DataFrame\nimport pandas as pd\n\ndf = pd.DataFrame({"A": [1, 2], "B": [3, 4]})\ndf';

  return (
    <div className="flex flex-col h-full bg-gray-900 border-l border-gray-800 relative">
      {/* Toolbar */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900 z-20">
        <div className="flex items-center gap-2">
           <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
           <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
           <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
           <span className="ml-2 text-xs font-mono text-gray-400 uppercase">Editor - {topic}</span>
        </div>
        
        <div className="flex items-center gap-2">
            {topic === Topic.PANDAS && !isPythonReady && (
                <div className="flex items-center gap-2 mr-2">
                    <div className="w-3 h-3 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                    <span className="text-[10px] text-gray-400">Carregando Python...</span>
                </div>
            )}

            {topic === Topic.SQL && (
                <>
                <button 
                    onClick={() => setShowSchema(!showSchema)}
                    className={`text-xs px-2 py-1 rounded border transition-colors ${showSchema ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}
                >
                    {showSchema ? 'Ocultar Tabelas' : 'Ver Tabelas'}
                </button>
                <button 
                    onClick={onResetDB}
                    className="text-xs px-2 py-1 rounded border border-gray-700 bg-gray-800 text-gray-400 hover:text-red-400 hover:border-red-900 transition-colors"
                    title="Resetar banco de dados para o estado inicial"
                >
                    Resetar DB
                </button>
                </>
            )}
        </div>
      </div>
      
      <div className="flex flex-1 min-h-0 relative">
          {/* Schema Sidebar (Overlay on mobile, push on desktop or just overlay) */}
          {topic === Topic.SQL && showSchema && schemaInfo && (
              <div className="absolute right-0 top-0 bottom-0 w-64 bg-gray-850 border-l border-gray-700 z-10 overflow-y-auto p-4 shadow-xl animate-fade-in-right">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-500">
                        <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z" clipRule="evenodd" />
                      </svg>
                      Estrutura do Banco
                  </h3>
                  <div className="space-y-6">
                      {schemaInfo.map((table) => (
                          <div key={table.name}>
                              <div className="text-xs font-mono font-bold text-indigo-400 mb-2 border-b border-gray-700 pb-1 flex justify-between items-center">
                                  {table.name}
                                  <span className="text-[10px] text-gray-600">TABLE</span>
                              </div>
                              <ul className="space-y-1">
                                  {table.columns.map(col => (
                                      <li key={col.name} className="flex justify-between text-xs font-mono group">
                                          <span className="text-gray-300 group-hover:text-white transition-colors">{col.name}</span>
                                          <span className="text-gray-600 italic">{col.type}</span>
                                      </li>
                                  ))}
                              </ul>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* Editor Area */}
          <div className="flex-1 h-full">
            <textarea
            value={code}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-full bg-[#0B0F19] p-4 font-mono text-sm text-gray-300 resize-none focus:outline-none leading-6 custom-scrollbar"
            spellCheck={false}
            />
          </div>
      </div>

      {/* Output Console (Collapsible/Fixed height area) */}
      <div className={`flex-shrink-0 border-t border-gray-800 bg-[#0d1117] transition-all duration-300 flex flex-col ${executionResult ? 'h-[40%]' : 'h-14'} z-20`}>
        
        {/* Run Button Bar */}
        <div className="flex items-center justify-between p-2 px-4 bg-gray-900 border-b border-gray-800">
           <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Console</span>
           <button
            onClick={onRun}
            disabled={isLoading || !code.trim() || (topic === Topic.PANDAS && !isPythonReady)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              isLoading || !code.trim() || (topic === Topic.PANDAS && !isPythonReady)
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-500 text-white shadow-lg hover:shadow-green-500/20'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Rodando...</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                </svg>
                <span>Executar</span>
              </>
            )}
          </button>
        </div>

        {/* Console Content */}
        <div className="flex-1 overflow-auto p-4 font-mono text-sm custom-scrollbar" ref={resultRef}>
            {!executionResult && (
                 <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-2 opacity-50">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    <span>O resultado aparecerá aqui</span>
                 </div>
            )}

            {executionResult && !executionResult.success && (
                <div className="text-red-400 bg-red-900/20 p-3 rounded border border-red-900/50">
                    <strong>Erro:</strong> {executionResult.error}
                </div>
            )}

            {executionResult && executionResult.success && executionResult.type === 'table' && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr>
                                {executionResult.columns?.map((col, i) => (
                                    <th key={i} className="border-b border-gray-700 bg-gray-800/50 p-2 text-xs font-semibold text-gray-300 whitespace-nowrap">
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {executionResult.output?.map((row, i) => (
                                <tr key={i} className="hover:bg-gray-800/30 transition-colors">
                                    {/* Handle both array of values (SQL) and objects (potentially) */}
                                    {Array.isArray(row) ? row.map((cell, j) => (
                                        <td key={j} className="border-b border-gray-800 p-2 text-gray-400 whitespace-nowrap">
                                            {cell}
                                        </td>
                                    )) : null}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="mt-2 text-xs text-green-500">
                        {topic === Topic.SQL ? 'Query executada com sucesso.' : 'DataFrame carregado.'} 
                        {executionResult.output?.length} linhas retornadas.
                    </div>
                </div>
            )}

            {executionResult && executionResult.success && executionResult.type === 'text' && (
               <div className="text-gray-300 whitespace-pre-wrap">
                  {/* Handle array of strings or simple string */}
                  {Array.isArray(executionResult.output) 
                    ? executionResult.output.join('\n') 
                    : typeof executionResult.output === 'object' 
                        ? JSON.stringify(executionResult.output, null, 2) 
                        : executionResult.output}
               </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;