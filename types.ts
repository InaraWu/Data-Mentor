export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export enum Topic {
  PANDAS = 'Pandas',
  SQL = 'SQL'
}

export enum ActiveTab {
  CHAT = 'chat',
  CODE = 'code'
}

export interface ExecutionResult {
  success: boolean;
  output?: any[]; // Array of objects for table rows or string for simple output
  columns?: string[];
  error?: string;
  type: 'table' | 'text';
}

export interface ChatState {
  topic: Topic | null;
  messages: Message[];
  isLoading: boolean;
  code: string;
  activeTab: ActiveTab;
  executionResult: ExecutionResult | null;
}
