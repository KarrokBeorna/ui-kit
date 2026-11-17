import type { Theme } from '../../themes/theme';

export interface DirectoryItem {
  id: number;
  name: string;
  type: string;
  parent_id: number | null;
  sort_order?: number;
}

export interface DirectoryApi {
  getRoots(): Promise<DirectoryItem[]>;
  getChildren(parentId: number): Promise<DirectoryItem[]>;
  createItem(data: {
    parent_id: number | null;
    name: string;
    type: string;
  }): Promise<DirectoryItem>;
  updateItem(id: number, data: { name?: string; type?: string }): Promise<void>;
  deleteItem(id: number): Promise<void>;
  moveItem(id: number, direction: 'up' | 'down'): Promise<void>;
}

/** Общие пропсы для desktop/mobile версий. */
export interface DirectoryBaseProps {
  theme: Theme;
  isAuthenticated: boolean;
  api: DirectoryApi;
  directoryTypes: { value: string; label: string }[];
  typeLabels: Record<string, string>;
  storageKey?: string;
  isWebAdmin?: boolean;
  allowedDirectoryRoots?: number[] | null;
  creatable?: boolean;
  editable?: boolean;
  deletable?: boolean;
  /** Колбэк для показа ошибок (toast и т.п.). По умолчанию — console.error. */
  onError?: (message: string) => void;
}