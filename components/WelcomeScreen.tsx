import React, { useState } from 'react';
import { Topic } from '../types';

interface WelcomeScreenProps {
  onSelectTopic: (topic: Topic, customRequest?: string) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSelectTopic }) => {
  const [customRequest, setCustomRequest] = useState('');

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center animate-fade-in overflow-y-auto">
      <div className="mb-6 relative">
        <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20 rounded-full"></div>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-20 h-20 text-indigo-400 relative z-10">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.499 5.24 50.552 50.552 0 00-2.658.813m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
        </svg>
      </div>
      
      <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 mb-4">
        Data Mentor
      </h1>
      <p className="text-gray-400 max-w-lg text-lg mb-8 leading-relaxed">
        Sua plataforma "learn-by-doing".
      </p>

      {/* Specific Topic Input */}
      <div className="w-full max-w-md mb-8">
        <label className="block text-left text-sm font-medium text-gray-400 mb-2 pl-1">
          O que você quer aprender hoje? (Opcional)
        </label>
        <input
          type="text"
          value={customRequest}
          onChange={(e) => setCustomRequest(e.target.value)}
          placeholder="Ex: Como fazer um Left Join? ou Como filtrar datas?"
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        <button
          onClick={() => onSelectTopic(Topic.PANDAS, customRequest)}
          className="group relative p-6 bg-gray-800 border border-gray-700 rounded-2xl hover:border-blue-500/50 hover:bg-gray-800/80 transition-all duration-300 flex flex-col items-center gap-3"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
            <span className="text-2xl">🐼</span>
          </div>
          <h3 className="text-xl font-semibold text-white">Pandas (Python)</h3>
          <p className="text-sm text-gray-500">Manipulação e análise de DataFrames.</p>
        </button>

        <button
          onClick={() => onSelectTopic(Topic.SQL, customRequest)}
          className="group relative p-6 bg-gray-800 border border-gray-700 rounded-2xl hover:border-emerald-500/50 hover:bg-gray-800/80 transition-all duration-300 flex flex-col items-center gap-3"
        >
           <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
            <span className="text-2xl">🗄️</span>
          </div>
          <h3 className="text-xl font-semibold text-white">SQL</h3>
          <p className="text-sm text-gray-500">Queries, filtros e agregação de dados.</p>
        </button>
      </div>
    </div>
  );
};

export default WelcomeScreen;
