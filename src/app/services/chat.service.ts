import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, tap, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private apiUrl = 'http://localhost:5000/api';
  private pendingData = signal<any[]>([]);
  private pendingQuery = signal<string>('');
  private currentSessionId = signal<string | null>(null); // Track current session

  constructor(private http: HttpClient) {}

  // Set the current session ID (called from parent component or service)
  setSessionId(sessionId: string | null): void {
    this.currentSessionId.set(sessionId);
  }

  // Send message with session context
  sendMessage(message: string): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const body = { message, session_id: this.currentSessionId() }; // Include session ID if available

    return this.http
      .post(`${this.apiUrl}/chat`, body, { headers })
      .pipe(
        tap((response: any) => {
          if (response.success && response.type === 'sql_result') {
            this.pendingData.set(response.data || []);
            this.pendingQuery.set(response.query || '');
          } else if (!response.success) {
            console.warn('Non-success response:', response.message);
          }
        }),
        catchError((error) => {
          console.error('Chat API error:', error);
          return throwError(() => new Error('Failed to connect to backend'));
        }),
      );
  }

  // Create chart with session context
  createChart(chartType: string): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const body = {
      data: this.pendingData(),
      chartType,
      query: this.pendingQuery(),
      session_id: this.currentSessionId(), // Include session ID if available
    };

    return this.http
      .post(`${this.apiUrl}/create-chart`, body, { headers })
      .pipe(
        tap((response: any) => {
          if (response.success) {
            this.pendingData.set([]);
            this.pendingQuery.set('');
          }
        }),
        catchError((error) => {
          console.error('Chart API error:', error);
          return throwError(() => new Error('Failed to create chart'));
        }),
      );
  }

  // Check API health
  checkHealth(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`).pipe(
      catchError((error) => {
        console.error('Health check error:', error);
        return throwError(() => new Error('Failed to check backend health'));
      }),
    );
  }

  // Clear pending data and query
  clearPending(): void {
    this.pendingData.set([]);
    this.pendingQuery.set('');
  }
}