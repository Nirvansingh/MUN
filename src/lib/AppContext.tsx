'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { MunFile, MyCountry } from './types';

interface AppState {
  files: MunFile[];
  fileMap: Map<string, MunFile>;
  currentFile: MunFile | null;
  selectedCommittee: string;
  searchQuery: string;
  revisionMode: boolean;
  sidebarVisible: boolean;
  rightPanelVisible: boolean;
  myCountry: MyCountry | null;
  pinnedFiles: string[];
  recentFiles: string[];
  folderStates: Record<string, boolean>;
  historyStack: string[];
  historyIndex: number;
  theme: 'dark' | 'light';
  scratchpadContent: string;
}

interface AppContextType extends AppState {
  setCurrentFile: (file: MunFile | null) => void;
  setSelectedCommittee: (committee: string) => void;
  setSearchQuery: (query: string) => void;
  setRevisionMode: (mode: boolean) => void;
  toggleSidebar: () => void;
  toggleRightPanel: () => void;
  setMyCountry: (country: MyCountry | null) => void;
  togglePin: (path: string) => void;
  isPinned: (path: string) => boolean;
  navigateTo: (path: string) => void;
  navigateBack: () => void;
  navigateForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  toggleTheme: () => void;
  setScratchpadContent: (content: string) => void;
  toggleFolderState: (path: string) => void;
  getFolderState: (path: string) => boolean;
  addToRecent: (path: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  THEME: 'mun_theme',
  MY_COUNTRY: 'mun_my_country',
  PINNED: 'mun_pinned_files',
  RECENT: 'mun_recent_files',
  FOLDER: 'mun_folder_states',
  STATE: 'mun_hub_state',
  SCRATCHPAD: 'mun_scratchpad',
};

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}

export function AppProvider({ children, initialFiles }: { children: ReactNode; initialFiles: MunFile[] }) {
  const [files] = useState<MunFile[]>(initialFiles);
  const [fileMap] = useState(() => {
    const map = new Map<string, MunFile>();
    initialFiles.forEach(f => map.set(f.path, f));
    return map;
  });

  const [currentFile, setCurrentFile] = useState<MunFile | null>(null);
  const [selectedCommittee, setSelectedCommittee] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [revisionMode, setRevisionMode] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [rightPanelVisible, setRightPanelVisible] = useState(true);
  const [myCountry, setMyCountryState] = useState<MyCountry | null>(null);
  const [pinnedFiles, setPinnedFiles] = useState<string[]>([]);
  const [recentFiles, setRecentFiles] = useState<string[]>([]);
  const [folderStates, setFolderStates] = useState<Record<string, boolean>>({});
  const [historyStack, setHistoryStack] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [scratchpadContent, setScratchpadContent] = useState('');

  // Load from localStorage on mount
  useEffect(() => {
    const savedTheme = loadFromStorage<'dark' | 'light'>('mun_theme', 'dark');
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    setMyCountryState(loadFromStorage<MyCountry | null>('mun_my_country', null));
    setPinnedFiles(loadFromStorage<string[]>('mun_pinned_files', []));
    setRecentFiles(loadFromStorage<string[]>('mun_recent_files', []));
    setFolderStates(loadFromStorage<Record<string, boolean>>('mun_folder_states', {}));
    setScratchpadContent(loadFromStorage<string>('mun_scratchpad', ''));

    const saved = loadFromStorage<{ sidebarVisible?: boolean; rightPanelVisible?: boolean }>('mun_hub_state', {});
    if (saved.sidebarVisible !== undefined) setSidebarVisible(saved.sidebarVisible);
    if (saved.rightPanelVisible !== undefined) setRightPanelVisible(saved.rightPanelVisible);
  }, []);

  // Persist theme
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mun_theme', theme);
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  // Persist myCountry
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mun_my_country', JSON.stringify(myCountry));
    }
  }, [myCountry]);

  // Persist pinned
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mun_pinned_files', JSON.stringify(pinnedFiles));
    }
  }, [pinnedFiles]);

  // Persist folder states
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mun_folder_states', JSON.stringify(folderStates));
    }
  }, [folderStates]);

  // Persist scratchpad
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mun_scratchpad', scratchpadContent);
    }
  }, [scratchpadContent]);

  const addToRecent = useCallback((path: string) => {
    setRecentFiles(prev => {
      const updated = [path, ...prev.filter(p => p !== path)].slice(0, 20);
      if (typeof window !== 'undefined') {
        localStorage.setItem('mun_recent_files', JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  const setMyCountry = useCallback((country: MyCountry | null) => {
    setMyCountryState(country);
    localStorage.setItem('mun_my_country', JSON.stringify(country));
  }, []);

  const togglePin = useCallback((path: string) => {
    setPinnedFiles(prev => {
      const isPinned = prev.includes(path);
      const updated = isPinned
        ? prev.filter(p => p !== path)
        : [path, ...prev];
      localStorage.setItem('mun_pinned_files', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isPinned = useCallback((path: string) => {
    return pinnedFiles.includes(path);
  }, [pinnedFiles]);

  const navigateTo = useCallback((path: string) => {
    const file = fileMap.get(path);
    if (!file) return;
    setCurrentFile(file);
    addToRecent(path);
    setHistoryStack(prev => {
      const newStack = prev.slice(0, historyIndex + 1);
      newStack.push(path);
      return newStack;
    });
    setHistoryIndex(prev => prev + 1);
  }, [fileMap, historyIndex, addToRecent]);

  const navigateBack = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const path = historyStack[newIndex];
      const file = fileMap.get(path);
      if (file) setCurrentFile(file);
    }
  }, [historyIndex, historyStack, fileMap]);

  const navigateForward = useCallback(() => {
    if (historyIndex < historyStack.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const path = historyStack[newIndex];
      const file = fileMap.get(path);
      if (file) setCurrentFile(file);
    }
  }, [historyIndex, historyStack, fileMap]);

  const toggleSidebar = useCallback(() => {
    setSidebarVisible(prev => {
      const next = !prev;
      localStorage.setItem('mun_hub_state', JSON.stringify({ sidebarVisible: next, rightPanelVisible }));
      return next;
    });
  }, [rightPanelVisible]);

  const toggleRightPanel = useCallback(() => {
    setRightPanelVisible(prev => {
      const next = !prev;
      localStorage.setItem('mun_hub_state', JSON.stringify({ sidebarVisible, rightPanelVisible: next }));
      return next;
    });
  }, [sidebarVisible]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  const toggleFolderState = useCallback((path: string) => {
    setFolderStates(prev => ({
      ...prev,
      [path]: !(prev[path] ?? true),
    }));
  }, []);

  const getFolderState = useCallback((path: string) => {
    return folderStates[path] ?? true;
  }, [folderStates]);

  return (
    <AppContext.Provider value={{
      files, fileMap, currentFile, selectedCommittee, searchQuery,
      revisionMode, sidebarVisible, rightPanelVisible, myCountry,
      pinnedFiles, recentFiles, folderStates, historyStack, historyIndex,
      theme, scratchpadContent,
      setCurrentFile, setSelectedCommittee, setSearchQuery, setRevisionMode,
      toggleSidebar, toggleRightPanel, setMyCountry, togglePin, isPinned,
      navigateTo, navigateBack, navigateForward,
      canGoBack: historyIndex > 0,
      canGoForward: historyIndex < historyStack.length - 1,
      toggleTheme, setScratchpadContent,
      toggleFolderState, getFolderState, addToRecent,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
