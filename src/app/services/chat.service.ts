import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, tap, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private apiUrl = 'http://localhost:5000/api';
  private pendingData = signal<any[]>([]);
  private pendingQuery = signal<string>('');

  constructor(private http: HttpClient) {}

  sendMessage(message: string): Observable<any> {
    return this.http
      .post(`${this.apiUrl}/chat`, { message }, { headers: { 'Content-Type': 'application/json' } })
      .pipe(
        tap((response: any) => {
          if (response.success && response.type === 'sql_result') {
            this.pendingData.set(response.data);
            this.pendingQuery.set(response.query);
          }
        }),
        catchError((error) => {
          console.error('Chat API error:', error);
          return throwError(() => new Error('Failed to connect to backend'));
        }),
      );
  }

  createChart(chartType: string): Observable<any> {
    return this.http
      .post(
        `${this.apiUrl}/create-chart`,
        {
          data: this.pendingData(),
          chartType,
          query: this.pendingQuery(),
        },
        { headers: { 'Content-Type': 'application/json' } },
      )
      .pipe(
        tap(() => {
          this.pendingData.set([]);
          this.pendingQuery.set('');
        }),
        catchError((error) => {
          console.error('Chart API error:', error);
          return throwError(() => new Error('Failed to create chart'));
        }),
      );
  }

  checkHealth(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`);
  }
}