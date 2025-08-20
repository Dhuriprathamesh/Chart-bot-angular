import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface ChatMessage {
  id?: number;
  type: 'user' | 'bot';
  content: string;
  chart?: any;
  time: string;
  session_id?: string; // Changed to optional to match schema assumption
  created_at?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  created_at?: string;
  updated_at?: string;
  message_count: number;
}

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = 'https://efbiydumwyuvespvkmhb.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmYml5ZHVtd3l1dmVzcHZrbWhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTQ1NjMsImV4cCI6MjA3MDQ3MDU2M30.X49_TbFR8PSMY7UBcLcHecJTgYO7AeUNW8oWNeLMhpw';
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ===== CHAT MESSAGES METHODS =====

  async saveChatMessage(message: Omit<ChatMessage, 'id' | 'created_at'>): Promise<void> {
    const insertData = {
      type: message.type,
      content: message.content,
      chart: message.chart,
      time: message.time,
      session_id: message.session_id, // Now always a string
    };
    const { error } = await this.supabase
      .from('chat_messages')
      .insert(insertData);
    if (error) throw new Error(`Failed to save message: ${error.message}`);
  }

  async getChatMessages(sessionId?: string): Promise<ChatMessage[]> {
    let query = this.supabase.from('chat_messages').select('*').order('created_at', { ascending: true });
    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }
    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch messages: ${error.message}`);
    return data || [];
  }

  async deleteChatMessage(id: number): Promise<void> {
    const { error } = await this.supabase
      .from('chat_messages')
      .delete()
      .eq('id', id);
    if (error) throw new Error(`Failed to delete message: ${error.message}`);
  }

  async clearChatHistory(): Promise<void> {
    const { error } = await this.supabase
      .from('chat_messages')
      .delete()
      .neq('id', 0); // Delete all messages
    if (error) throw new Error(`Failed to clear chat history: ${error.message}`);
  }

  // ===== CHAT SESSIONS METHODS =====

  async createChatSession(session: ChatSession): Promise<void> {
    const { error } = await this.supabase
      .from('chat_sessions')
      .insert({
        id: session.id,
        title: session.title,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        message_count: session.message_count,
      });
    if (error) throw new Error(`Failed to create session: ${error.message}`);
  }

  async getChatSessions(): Promise<ChatSession[]> {
    const { data, error } = await this.supabase
      .from('chat_sessions')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw new Error(`Failed to fetch sessions: ${error.message}`);
    return data || [];
  }

  async updateChatSession(id: string, updates: Partial<ChatSession>): Promise<void> {
    const { error } = await this.supabase
      .from('chat_sessions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(`Failed to update session: ${error.message}`);
  }

  async deleteChatSession(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('chat_sessions')
      .delete()
      .eq('id', id);
    if (error) throw new Error(`Failed to delete session: ${error.message}`);
  }

  // ===== LEGACY METHODS (to be deprecated) =====

  async addMessage(text: string): Promise<void> {
    console.warn('Legacy method `addMessage` is deprecated. Use `saveChatMessage` instead.');
    const { error } = await this.supabase
      .from('message')
      .insert([{ text }]);
    if (error) throw new Error(`Failed to add message: ${error.message}`);
  }

  async getMessages(): Promise<any[]> {
    console.warn('Legacy method `getMessages` is deprecated. Use `getChatMessages` instead.');
    const { data, error } = await this.supabase
      .from('message')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Failed to fetch messages: ${error.message}`);
    return data || [];
  }

  async deleteMessage(id: number): Promise<void> {
    console.warn('Legacy method `deleteMessage` is deprecated. Use `deleteChatMessage` instead.');
    const { error } = await this.supabase
      .from('message')
      .delete()
      .eq('id', id);
    if (error) throw new Error(`Failed to delete message: ${error.message}`);
  }
}