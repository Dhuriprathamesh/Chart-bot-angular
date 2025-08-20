import { Component, signal, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { ChatComponent } from './components/chat/chat.component';
import { LoadingOverlayComponent } from './components/loading-overlay/loading-overlay.component';
import { ToastComponent } from './components/toast/toast.component';
import { ExportModalComponent } from './components/export-modal/export-modal.component';
import { ThemeService } from './services/theme.service';
import { ChatService } from './services/chat.service'; // Import ChatService
import { HistoryService } from './services/history.service'; // Import HistoryService
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    SidebarComponent,
    ChatComponent,
    LoadingOverlayComponent,
    ToastComponent,
    ExportModalComponent,
    FormsModule
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  @ViewChild('chatComponent') chatComponent!: ChatComponent;
  @ViewChild('sidebarComponent') sidebarComponent!: SidebarComponent;

  sidebarHidden = signal(false);
  currentSessionId = signal<string | null>(null);

  constructor(
    private themeService: ThemeService,
    private chatService: ChatService, // Inject ChatService
    private historyService: HistoryService // Inject HistoryService
  ) {
    document.body.classList.toggle('light-theme', this.themeService.theme() === 'light');
    const savedSidebarState = localStorage.getItem('sidebarHidden');
    this.sidebarHidden.set(savedSidebarState ? JSON.parse(savedSidebarState) : false);
  }

  ngOnInit() {
    this.initializeSession();
  }

  // Initialize or load the first session
  async initializeSession(): Promise<void> {
    const sessions = await this.historyService.loadChatSessions();
    if (sessions.length > 0) {
      this.currentSessionId.set(sessions[0].id);
      this.chatService.setSessionId(sessions[0].id);
      await this.chatComponent.loadChatHistory(sessions[0].id);
    } else {
      await this.createNewChat('initial'); // Create a default session
    }
  }

  // Toggle sidebar visibility
  toggleSidebar(): void {
    this.sidebarHidden.update((hidden) => {
      const newState = !hidden;
      localStorage.setItem('sidebarHidden', JSON.stringify(newState));
      return newState;
    });
  }

  // Handle export chart request
  onExportChart(): void {
    if (this.chatComponent) {
      this.chatComponent.openExportModal();
    }
  }

  // Handle new chat creation from sidebar
  async onNewChatCreated(eventData: string): Promise<void> {
    if (this.chatComponent && eventData === 'save_current') {
      await this.chatComponent.saveChatSession(); // Save current chat
      await this.chatComponent.clearChat(); // Clear and start fresh
      const newSessionId = await this.createNewChat(); // Create new session
      this.chatService.setSessionId(newSessionId);
      this.currentSessionId.set(newSessionId);
      this.sidebarComponent.switchToSession(newSessionId); // Update sidebar
    }
  }

  // Handle session switching from sidebar
  async onSessionSwitched(sessionId: string): Promise<void> {
    if (this.chatComponent) {
      this.currentSessionId.set(sessionId);
      this.chatService.setSessionId(sessionId);
      await this.chatComponent.loadChatHistory(sessionId); // Load history for the session
      this.sidebarComponent.switchToSession(sessionId); // Ensure sidebar reflects the change
    }
  }

  // Create a new chat session
  async createNewChat(trigger: string = 'user'): Promise<string> {
    const sessionId = `session_${Date.now()}`;
    const newSession = {
      id: sessionId,
      title: trigger === 'initial' ? 'Default Chat' : 'New Chat',
      message_count: 0,
      updated_at: new Date().toISOString(),
    };
    await this.historyService.createChatSession(newSession);
    await this.historyService.loadChatSessions();
    return sessionId;
  }
}