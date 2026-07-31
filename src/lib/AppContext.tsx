'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { MunFile, MyCountry } from './types';
import { usePersistentState } from './use-persistent-state';

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

/** Shared layout-state (sidebar + right panel) persisted under one key. */
interface HubState {
  sidebarVisible?: boolean;
  rightPanelVisible?: boolean;
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
  const [historyStack, setHistoryStack] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // ── Persisted state (localStorage via usePersistentState) ──
  const [theme, setTheme] = usePersistentState<'dark' | 'light'>(STORAGE_KEYS.THEME, 'dark');
  const [myCountry, setMyCountryState] = usePersistentState<MyCountry | null>(STORAGE_KEYS.MY_COUNTRY, null);
  const [pinnedFiles, setPinnedFiles] = usePersistentState<string[]>(STORAGE_KEYS.PINNED, []);
  const [recentFiles, setRecentFiles] = usePersistentState<string[]>(STORAGE_KEYS.RECENT, []);
  const [folderStates, setFolderStates] = usePersistentState<Record<string, boolean>>(STORAGE_KEYS.FOLDER, {});
  const [scratchpadContent, setScratchpadContent] = usePersistentState<string>(STORAGE_KEYS.SCRATCHPAD, '');
  const [hubState, setHubState] = usePersistentState<HubState>(STORAGE_KEYS.STATE, {});

  const sidebarVisible = hubState.sidebarVisible ?? true;
  const rightPanelVisible = hubState.rightPanelVisible ?? true;

  // Keep the theme attribute on <html> in sync (external-system sync — allowed in effects).
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const addToRecent = useCallback((path: string) => {
    setRecentFiles(prev => [path, ...prev.filter(p => p !== path)].slice(0, 20));
  }, [setRecentFiles]);

  const setMyCountry = useCallback((country: MyCountry | null) => {
    setMyCountryState(country);
  }, [setMyCountryState]);

  const togglePin = useCallback((path: string) => {
    setPinnedFiles(prev => {
      const isPinned = prev.includes(path);
      return isPinned ? prev.filter(p => p !== path) : [path, ...prev];
    });
  }, [setPinnedFiles]);

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
    setHubState(prev => ({ ...prev, sidebarVisible: !(prev.sidebarVisible ?? true) }));
  }, [setHubState]);

  const toggleRightPanel = useCallback(() => {
    setHubState(prev => ({ ...prev, rightPanelVisible: !(prev.rightPanelVisible ?? true) }));
  }, [setHubState]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, [setTheme]);

  const toggleFolderState = useCallback((path: string) => {
    setFolderStates(prev => ({ ...prev, [path]: !(prev[path] ?? true) }));
  }, [setFolderStates]);

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
