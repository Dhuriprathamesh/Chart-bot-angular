import { Injectable, signal } from '@angular/core';
import { SupabaseService, ChatMessage, ChatSession } from './supabase.service';
import { ToastService } from './toast.service';

// Define a type for the message input that allows optional session_id
interface SaveChatMessageInput {
  type: 'user' | 'bot';
  content: string;
  chart?: any;
  time: string;
  session_id?: string; // Optional at input
}

@Injectable({
  providedIn: 'root',
})
export class ChatHistoryService {
  private chatHistory = signal<ChatMessage[]>([]);
  private chatSessions = signal<ChatSession[]>([]);
  private isLoading = signal<boolean>(false);

  constructor(
    private supabaseService: SupabaseService,
    private toastService: ToastService
  ) {}

  // Expose chat history and sessions as readonly signals
  getChatHistory() {
    return this.chatHistory.asReadonly();
  }

  getChatSessions() {
    return this.chatSessions.asReadonly();
  }

  getLoadingState() {
    return this.isLoading.asReadonly();
  }

  // Load chat history for a specific session
  async loadChatHistory(sessionId?: string): Promise<ChatMessage[]> {
    this.isLoading.set(true);
    try {
      const messages = await this.supabaseService.getChatMessages(sessionId);
      this.chatHistory.set(messages);
      return messages;
    } catch (error) {
      console.error('Error loading chat history:', error);
      this.toastService.show('Failed to load chat history', 'error');
      return [];
    } finally {
      this.isLoading.set(false);
    }
  }

  // Load all chat sessions
  async loadChatSessions(): Promise<ChatSession[]> {
    this.isLoading.set(true);
    try {
      const sessions = await this.supabaseService.getChatSessions();
      this.chatSessions.set(sessions);
      return sessions;
    } catch (error) {
      console.error('Error loading chat sessions:', error);
      this.toastService.show('Failed to load chat sessions', 'error');
      return [];
    } finally {
      this.isLoading.set(false);
    }
  }

  // Save a message with session ID
  async saveChatMessage(message: SaveChatMessageInput): Promise<void> {
    try {
      let sessionId: string;
      if (!message.session_id) {
        // Create a new session if session_id is missing
        const newSessionId = `session_${Date.now()}`;
        const newSession: ChatSession = {
          id: newSessionId,
          title: 'New Session',
          message_count: 0,
          updated_at: new Date().toISOString(),
        };
        await this.supabaseService.createChatSession(newSession);
        sessionId = newSessionId;
      } else {
        sessionId = message.session_id; // Safe because of the check
      }
      // Create a new message object with guaranteed session_id
      const safeMessage: Omit<ChatMessage, 'id' | 'created_at'> = {
        type: message.type,
        content: message.content,
        chart: message.chart,
        time: message.time,
        session_id: sessionId, // sessionId is now always a string
      };
      await this.supabaseService.saveChatMessage(safeMessage); // Line 153
      await this.loadChatHistory(sessionId); // Reload history for the specific session
    } catch (error) {
      console.error('Error saving message:', error);
      this.toastService.show('Failed to save message', 'error');
      throw error;
    }
  }

  // Create a new chat session
  async createChatSession(session: ChatSession): Promise<void> {
    try {
      await this.supabaseService.createChatSession(session);
      await this.loadChatSessions(); // Refresh sessions list
    } catch (error) {
      console.error('Error creating chat session:', error);
      this.toastService.show('Failed to create chat session', 'error');
      throw error;
    }
  }

  // Update an existing chat session
  async updateChatSession(sessionId: string, updates: Partial<ChatSession>): Promise<void> {
    try {
      await this.supabaseService.updateChatSession(sessionId, updates);
      await this.loadChatSessions(); // Refresh sessions list
    } catch (error) {
      console.error('Error updating chat session:', error);
      this.toastService.show('Failed to update chat session', 'error');
      throw error;
    }
  }

  // Delete a chat session
  async deleteChatSession(sessionId: string): Promise<void> {
    try {
      await this.supabaseService.deleteChatSession(sessionId);
      await this.loadChatSessions(); // Refresh sessions list
      this.chatHistory.set([]); // Clear history if current session is deleted
    } catch (error) {
      console.error('Error deleting chat session:', error);
      this.toastService.show('Failed to delete chat session', 'error');
      throw error;
    }
  }

  // Delete a specific message
  async deleteMessage(id: number): Promise<void> {
    try {
      await this.supabaseService.deleteChatMessage(id);
      const currentHistory = this.chatHistory();
      this.chatHistory.set(currentHistory.filter(msg => msg.id !== id));
      this.toastService.show('Message deleted', 'success');
    } catch (error) {
      console.error('Error deleting message:', error);
      this.toastService.show('Failed to delete message', 'error');
      throw error;
    }
  }

  // Clear all chat history and sessions
  async clearAllHistory(): Promise<void> {
    try {
      await this.supabaseService.clearChatHistory();
      await this.supabaseService.clearChatSessions(); // Assuming this method exists
      this.chatHistory.set([]);
      this.chatSessions.set([]);
      this.toastService.show('Chat history and sessions cleared', 'success');
    } catch (error) {
      console.error('Error clearing chat history:', error);
      this.toastService.show('Failed to clear chat history', 'error');
      throw error;
    }
  }

  // Add message to local state (for immediate UI updates)
  addMessageToLocal(message: ChatMessage): void {
    const currentHistory = this.chatHistory();
    this.chatHistory.set([...currentHistory, message]);
  }

  // Update local message
  updateLocalMessage(index: number, updatedMessage: Partial<ChatMessage>): void {
    const currentHistory = this.chatHistory();
    if (index >= 0 && index < currentHistory.length) {
      const updated = [...currentHistory];
      updated[index] = { ...updated[index], ...updatedMessage };
      this.chatHistory.set(updated);
    }
  }
}