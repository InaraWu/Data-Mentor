import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // Simple regex-based splitter for code blocks and text
  // This avoids heavyweight dependencies like react-markdown for this demo
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 text-sm md:text-base leading-relaxed">
      {parts.map((part, index) => {
        if (part.startsWith('```')) {
          // Extract language and code
          const lines = part.split('\n');
          const language = lines[0].replace('```', '').trim();
          const code = lines.slice(1, -1).join('\n');

          return (
            <div key={index} className="rounded-md overflow-hidden my-4 border border-gray-700 bg-gray-900 shadow-sm">
              <div className="flex items-center justify-between px-4 py-1.5 bg-gray-800 border-b border-gray-700">
                <span className="text-xs font-mono text-gray-400 uppercase">{language || 'Code'}</span>
                <div className="flex space-x-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/20"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/20"></div>
                </div>
              </div>
              <div className="p-4 overflow-x-auto">
                <pre className="font-mono text-blue-300 text-sm whitespace-pre">{code}</pre>
              </div>
            </div>
          );
        }

        // Handle bold text and basic paragraphs
        return (
          <div key={index} className="whitespace-pre-wrap">
            {part.split('\n').map((line, i) => {
               // Basic bold parser: **text**
               const lineParts = line.split(/(\*\*.*?\*\*)/g);
               return (
                   <React.Fragment key={i}>
                       {lineParts.map((subPart, j) => {
                           if (subPart.startsWith('**') && subPart.endsWith('**')) {
                               return <strong key={j} className="font-bold text-white">{subPart.slice(2, -2)}</strong>
                           }
                           return <span key={j} className="text-gray-300">{subPart}</span>
                       })}
                       {i < part.split('\n').length - 1 && <br />}
                   </React.Fragment>
               )
            })}
          </div>
        );
      })}
    </div>
  );
};

export default MarkdownRenderer;
