import { Component, EventEmitter, Output, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HistoryService } from '../../services/history.service';
import { ChatSession } from '../../services/supabase.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent implements OnInit {
  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() exportChart = new EventEmitter<void>();
  @Output() newChatCreated = new EventEmitter<string>();
  @Output() sessionSwitched = new EventEmitter<string>();
  
  history = this.historyService.getHistory();
  chatSessions = signal<ChatSession[]>([]);
  currentSessionId = signal<string | null>(null);
  isLoadingSessions = signal<boolean>(false);
  
  exampleQueries = [
    { query: 'SELECT id, first_name, last_name, email FROM users LIMIT 10', label: 'View Users' },
    { query: 'SELECT * FROM students;', label: 'View Students' },
    { query: 'SELECT grade, COUNT(*) AS total FROM students GROUP BY grade;', label: 'Students by Grade' },
  ];
  selectedQuery = signal<string>('');

  constructor(
    private historyService: HistoryService
  ) {}

  async ngOnInit() {
    await this.loadChatSessions();
    if (this.chatSessions().length > 0 && !this.currentSessionId()) {
      this.currentSessionId.set(this.chatSessions()[0].id);
    }
  }

  async loadChatSessions(): Promise<void> {
    this.isLoadingSessions.set(true);
    try {
      const sessions = await this.historyService.loadChatSessions();
      this.chatSessions.set(sessions);
      if (sessions.length > 0 && !this.currentSessionId()) {
        this.currentSessionId.set(sessions[0].id);
        this.sessionSwitched.emit(sessions[0].id);
      }
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
    } finally {
      this.isLoadingSessions.set(false);
    }
  }

  async createNewChat(): Promise<void> {
    try {
      this.newChatCreated.emit('save_current');

      const sessionId = `session_${Date.now()}`;
      const newSession: ChatSession = {
        id: sessionId,
        title: 'New Chat',
        message_count: 0,
        updated_at: new Date().toISOString(), // Set a default value for new sessions
      };
      
      const currentSessions = this.chatSessions();
      this.chatSessions.update(sessions => [newSession, ...sessions]);
      
      this.currentSessionId.set(sessionId);
      this.newChatCreated.emit(sessionId);
    } catch (error) {
      console.error('Failed to create new chat:', error);
    }
  }

  async switchToSession(sessionId: string): Promise<void> {
    try {
      this.currentSessionId.set(sessionId);
      this.sessionSwitched.emit(sessionId);
    } catch (error) {
      console.error('Failed to switch to session:', error);
    }
  }

  async deleteSession(sessionId: string, event: Event): Promise<void> {
    event.stopPropagation();
    
    if (confirm('Are you sure you want to delete this chat session?')) {
      try {
        await this.historyService.deleteChatSession(sessionId);
        const sessions = this.chatSessions();
        const updatedSessions = sessions.filter(session => session.id !== sessionId);
        this.chatSessions.set(updatedSessions);
        
        if (this.currentSessionId() === sessionId) {
          if (updatedSessions.length > 0) {
            await this.switchToSession(updatedSessions[0].id);
          } else {
            this.currentSessionId.set(null);
            await this.createNewChat();
          }
        }
      } catch (error) {
        console.error('Failed to delete session:', error);
      }
    }
  }

  formatSessionTime(dateString: string | undefined): string {
    if (!dateString) return 'N/A'; // Handle undefined case
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  }

  clearHistory(): void {
    if (confirm('Are you sure you want to clear your query history?')) {
      this.historyService.clearHistory();
    }
  }

  selectExampleQuery(query: string): void {
    this.selectedQuery.set(query);
  }

  onExportClick(): void {
    this.exportChart.emit();
  }
}