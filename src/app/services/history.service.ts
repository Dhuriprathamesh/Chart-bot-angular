import { Injectable, signal } from '@angular/core';

interface HistoryItem {
  id: number;
  query: string;
  fullQuery: string;
  type: 'sql' | 'chart';
  timestamp: string;
}

@Injectable({
  providedIn: 'root',
})
export class HistoryService {
  private history = signal<HistoryItem[]>(JSON.parse(localStorage.getItem('queryHistory') || '[]'));

  getHistory(): HistoryItem[] {
    return this.history();
  }

  addToHistory(query: string, type: 'sql' | 'chart'): void {
    const newItem: HistoryItem = {
      id: Date.now(),
      query: query.length > 40 ? query.substring(0, 40) + '...' : query,
      fullQuery: query,
      type,
      timestamp: new Date().toISOString(),
    };
    this.history.update((items) => {
      const updated = [newItem, ...items].slice(0, 10);
      localStorage.setItem('queryHistory', JSON.stringify(updated));
      return updated;
    });
  }

  clearHistory(): void {
    this.history.set([]);
    localStorage.removeItem('queryHistory');
  }
}