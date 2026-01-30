import React, { useState, useEffect, useRef } from 'react';
import { Topic, Message, ChatState, ActiveTab, ExecutionResult } from './types';
import { initializeChat, sendMessage } from './services/geminiService';
import { initDB, executeSQL, getTableSchema, resetDB, getSchemaInfo } from './services/sqlRunner';
import { initPythonWorker, runPythonCode, isPythonReady } from './services/pythonRunner';
import WelcomeScreen from './components/WelcomeScreen';
import ChatMessage from './components/ChatMessage';
import CodeEditor from './components/CodeEditor';

const App: React.FC = () => {
  const [state, setState] = useState<ChatState & { schemaInfo?: any[], pythonReady: boolean }>({
    topic: null,
    messages: [],
    isLoading: false,
    code: '',
    activeTab: ActiveTab.CHAT,
    executionResult: null,
    schemaInfo: [],
    pythonReady: false
  });
  
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.messages, state.activeTab]);

  const handleStartSession = async (topic: Topic, customRequest?: string) => {
    let schemaInfo: any[] = [];
    
    if (topic === Topic.SQL) {
        await initDB().catch(console.error);
        schemaInfo = getSchemaInfo();
    } else if (topic === Topic.PANDAS) {
        // Start loading Python in background
        initPythonWorker(() => {
            setState(prev => ({ ...prev, pythonReady: true }));
        });
        if (isPythonReady()) {
             setState(prev => ({ ...prev, pythonReady: true }));
        }
    }

    setState(prev => ({ 
        ...prev, 
        topic, 
        isLoading: true,
        schemaInfo,
        // Reset code when starting fresh.
        code: topic === Topic.SQL 
            ? 'SELECT * FROM produtos LIMIT 10;' 
            : 'import pandas as pd\n\ndata = {\n  "nome": ["Ana", "João", "Maria"],\n  "vendas": [100, 200, 350],\n  "meta": [120, 180, 300]\n}\n\ndf = pd.DataFrame(data)\n\n# A última linha é retornada automaticamente\ndf',
        executionResult: null
    }));
    
    initializeChat(topic);
    
    let initialPrompt = '';
    if (topic === Topic.SQL) {
        // Generates schema string dynamically from the actual DB execution
        const tableDesc = schemaInfo.length > 0 
            ? schemaInfo.map((t: any) => `${t.name} (${t.columns.map((c: any) => c.name).join(', ')})`).join(' e ')
            : "tabelas do sistema";

        const schema = `As tabelas disponíveis no banco de dados real são: ${tableDesc}.`;
        
        if (customRequest) {
            initialPrompt = `O usuário quer aprender SQL e pediu: "${customRequest}". ${schema} Comece a lição usando essas tabelas reais.`;
        } else {
            initialPrompt = `O usuário iniciou SQL. ${schema} Apresente-se e proponha um exercício simples usando SELECT nessas tabelas.`;
        }
    } else {
         initialPrompt = customRequest 
            ? `O usuário quer aprender Pandas e pediu: "${customRequest}". Comece a lição.` 
            : `O usuário iniciou Pandas. Apresente-se e comece do básico sobre DataFrames.`;
    }
    
    try {
      const response = await sendMessage(initialPrompt);
      setState(prev => ({
        ...prev,
        isLoading: false,
        messages: [
          {
            id: Date.now().toString(),
            role: 'model',
            content: response,
            timestamp: Date.now(),
          }
        ]
      }));
    } catch (error) {
      console.error(error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || state.isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
    }));
    setInput('');

    try {
      const response = await sendMessage(userMessage.content);
      setState(prev => ({
        ...prev,
        isLoading: false,
        messages: [...prev.messages, {
          id: (Date.now() + 1).toString(),
          role: 'model',
          content: response,
          timestamp: Date.now(),
        }],
      }));
    } catch (error) {
       console.error(error);
       setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleResetDB = () => {
    if (confirm('Tem certeza que deseja resetar o banco de dados para o estado inicial? Todas as suas alterações (INSERT/UPDATE/DELETE) serão perdidas.')) {
        resetDB();
        setState(prev => ({ ...prev, executionResult: { success: true, output: ["Banco de dados resetado com sucesso."], type: 'text' }, schemaInfo: getSchemaInfo() }));
    }
  };

  const handleRunCode = async () => {
      if (!state.code.trim() || state.isLoading) return;

      const isMobile = window.innerWidth < 768;
      let execResult: ExecutionResult;
      let promptToMentor = "";

      setState(prev => ({ ...prev, isLoading: true }));

      // EXECUTION LOGIC
      if (state.topic === Topic.SQL) {
          try {
              const sqlData = executeSQL(state.code);
              execResult = {
                  success: true,
                  columns: sqlData.columns,
                  output: sqlData.values, // Rows
                  type: 'table'
              };
              
              const updatedSchema = getSchemaInfo();
              promptToMentor = `O aluno executou o seguinte SQL:\n\`\`\`sql\n${state.code}\n\`\`\`\n\nO resultado REAL do banco de dados foi:\n${JSON.stringify(sqlData, null, 2)}\n\nAnalise se está correto para o desafio atual.`;

              setState(prev => ({ ...prev, schemaInfo: updatedSchema }));

          } catch (e: any) {
              execResult = {
                  success: false,
                  error: e.message,
                  type: 'text'
              };
              promptToMentor = `O aluno tentou executar o SQL:\n\`\`\`sql\n${state.code}\n\`\`\`\n\nMas ocorreu o erro: ${e.message}. Explique o erro de forma didática.`;
          }
      } else {
          // REAL PYTHON EXECUTION VIA WORKER
          try {
              const pyData = await runPythonCode(state.code);
              
              if (pyData.success) {
                  // Determine if we show a table (DataFrame) or text (print output)
                  if (pyData.table) {
                      execResult = {
                          success: true,
                          columns: pyData.table.columns,
                          output: pyData.table.data,
                          type: 'table'
                      };
                  } else {
                      execResult = {
                          success: true,
                          output: [pyData.output || "(Sem saída visual. Use print() ou retorne a variável na última linha)"],
                          type: 'text'
                      };
                  }

                  // Context to Mentor includes both print output and data structure
                  promptToMentor = `O aluno executou este código Pandas:\n\`\`\`python\n${state.code}\n\`\`\`\n\nSaída (stdout): ${pyData.output}\n\n`;
                  if (pyData.table) {
                      promptToMentor += `O código retornou um DataFrame com colunas: ${pyData.table.columns.join(', ')} e ${pyData.table.data.length} linhas.`;
                  }
                  promptToMentor += "\n\nAnalise o código e o resultado. Dê feedback.";

              } else {
                  throw new Error(pyData.error);
              }

          } catch (e: any) {
              execResult = {
                  success: false,
                  error: e.message || String(e),
                  type: 'text'
              };
              promptToMentor = `O aluno tentou executar Python e deu erro:\n${e.message || e}\n\nExplique o erro.`;
          }
      }

      setState(prev => ({
          ...prev,
          executionResult: execResult,
          activeTab: isMobile ? ActiveTab.CHAT : prev.activeTab 
      }));

      // Send execution context to Gemini
      try {
        const response = await sendMessage(promptToMentor);
        setState(prev => ({
            ...prev,
            isLoading: false,
            messages: [...prev.messages, {
                id: (Date.now() + 1).toString(),
                role: 'model',
                content: response,
                timestamp: Date.now(),
            }]
        }));
      } catch (error) {
        console.error(error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950 font-sans text-gray-100 overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 h-16 border-b border-gray-800 bg-gray-900/50 backdrop-blur-md flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setState({ topic: null, messages: [], isLoading: false, code: '', activeTab: ActiveTab.CHAT, executionResult: null, pythonReady: false })}>
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.499 5.24 50.552 50.552 0 00-2.658.813m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
            </svg>
          </div>
          <span className="font-bold text-lg tracking-tight">Data Mentor</span>
        </div>
        
        {state.topic && (
          <div className="flex items-center gap-4">
             {/* Mobile Tabs */}
             <div className="flex md:hidden bg-gray-800 rounded-lg p-1">
                <button 
                  onClick={() => setState(p => ({...p, activeTab: ActiveTab.CHAT}))}
                  className={`px-3 py-1 rounded-md text-sm transition-all ${state.activeTab === ActiveTab.CHAT ? 'bg-gray-700 text-white shadow' : 'text-gray-400'}`}
                >
                    Chat
                </button>
                <button 
                  onClick={() => setState(p => ({...p, activeTab: ActiveTab.CODE}))}
                  className={`px-3 py-1 rounded-md text-sm transition-all ${state.activeTab === ActiveTab.CODE ? 'bg-gray-700 text-white shadow' : 'text-gray-400'}`}
                >
                    Código
                </button>
             </div>

             <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-gray-800 border border-gray-700 text-sm">
                <span className={state.topic === Topic.SQL ? 'text-emerald-400' : 'text-blue-400'}>●</span>
                <span className="font-medium text-gray-300">{state.topic} Mode</span>
             </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      {!state.topic ? (
        <WelcomeScreen onSelectTopic={handleStartSession} />
      ) : (
        <div className="flex flex-1 overflow-hidden relative">
          
          {/* Left Panel: Chat (Visible on Mobile if activeTab is Chat) */}
          <div className={`
             flex flex-col w-full md:w-1/2 lg:w-[55%] border-r border-gray-800 bg-gray-950
             ${state.activeTab === ActiveTab.CHAT ? 'flex' : 'hidden md:flex'}
          `}>
             {/* Messages */}
             <main className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
                <div className="max-w-2xl mx-auto flex flex-col min-h-full justify-end">
                  {state.messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
                  ))}
                  
                  {state.isLoading && (
                     <div className="flex items-center gap-2 text-gray-500 text-sm italic ml-14 mb-4">
                        <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                        <span>Data Mentor analisando...</span>
                     </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </main>

              {/* Chat Input */}
              <footer className="flex-shrink-0 p-4 bg-gray-900 border-t border-gray-800">
                <div className="max-w-2xl mx-auto relative">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={state.isLoading ? "Aguarde..." : "Tire dúvidas ou peça dicas..."}
                    disabled={state.isLoading}
                    className="w-full bg-gray-800 text-gray-200 rounded-xl pl-4 pr-12 py-3 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 resize-none min-h-[50px] max-h-[150px] shadow-inner font-mono text-sm leading-relaxed"
                    rows={1}
                    style={{ height: 'auto', minHeight: '50px' }} 
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!input.trim() || state.isLoading}
                    className={`absolute right-3 bottom-3 p-1.5 rounded-lg transition-all ${
                      !input.trim() || state.isLoading 
                        ? 'text-gray-600 bg-transparent' 
                        : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                    </svg>
                  </button>
                </div>
                <div className="text-center mt-2 md:hidden">
                   <span className="text-[10px] text-gray-500">Toque em 'Código' acima para abrir o editor.</span>
                </div>
              </footer>
          </div>

          {/* Right Panel: Code Editor (Visible on Mobile if activeTab is Code) */}
          <div className={`
             flex-col w-full md:w-1/2 lg:w-[45%] h-full bg-gray-900
             ${state.activeTab === ActiveTab.CODE ? 'flex' : 'hidden md:flex'}
          `}>
             <CodeEditor 
                code={state.code} 
                onChange={(newCode) => setState(prev => ({...prev, code: newCode}))}
                onRun={handleRunCode}
                onResetDB={handleResetDB}
                isLoading={state.isLoading}
                topic={state.topic}
                executionResult={state.executionResult}
                schemaInfo={state.schemaInfo}
                isPythonReady={state.pythonReady}
             />
          </div>

        </div>
      )}
    </div>
  );
};

export default App;
