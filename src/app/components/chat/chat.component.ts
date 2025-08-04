import { Component, ElementRef, EventEmitter, Output, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';
import { HistoryService } from '../../services/history.service';
import { ChartSelectionComponent } from '../chart-selection/chart-selection.component';
import { LoadingOverlayComponent } from '../loading-overlay/loading-overlay.component';
// import { PlotlyModule } from 'angular-plotly.js';
import { animate, style, transition, trigger } from '@angular/animations';

interface Message {
  type: 'user' | 'bot';
  content: string;
  chart?: any;
  time: string;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, ChartSelectionComponent, LoadingOverlayComponent],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css'],
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class ChatComponent {
  @Output() toggleSidebar = new EventEmitter<void>();
  messages = signal<Message[]>([
    {
      type: 'bot',
      content: `Hello! I'm <strong>ChartBot SQL AI</strong>. Enter any SQL query to fetch data from your PostgreSQL database, and I'll help you create <strong>beautiful visualizations</strong>!`,
      time: this.getCurrentTime(),
    },
  ]);
  inputMessage = signal<string>('');
  isListening = signal<boolean>(false);
  showChartSelection = signal<boolean>(false);
  currentChart = signal<any>(null);
  chartSuggestions = signal<any[]>([]);
  isLoading = signal<boolean>(false);
  loadingMessage = signal<string>('Processing SQL Query...');
  loadingProgress = signal<number>(0);
  chatMessages = viewChild<ElementRef>('chatMessages');

  private recognition: any = null;

  constructor(private chatService: ChatService, private historyService: HistoryService) {
    // PlotlyJS is now configured globally in main.ts
  }

  sendMessage(): void {
    const message = this.inputMessage().trim();
    if (!message) return;

    this.addMessage('user', message);
    this.inputMessage.set('');
    this.showChartSelection.set(false);
    
    // Show loading overlay
    this.isLoading.set(true);
    this.loadingMessage.set('Executing SQL query and fetching data...');
    this.animateLoadingProgress();

    // Store response to handle after animation completes
    let responseData: any = null;
    let responseError: any = null;

    this.chatService.sendMessage(message).subscribe({
      next: (response) => {
        responseData = response;
      },
      error: (error) => {
        responseError = error;
      },
    });

    // Let the full animation complete (8 steps * 600ms = 4.8s + 1s final delay = 5.8s)
    setTimeout(() => {
      this.isLoading.set(false);
      
      // Handle the response after animation completes
      if (responseError) {
        this.addMessage('bot', `❌ **Connection Error:** ${responseError.message}`);
      } else if (responseData) {
        if (responseData.success) {
          if (responseData.type === 'sql_result') {
            this.addMessage('bot', responseData.message);
            this.chartSuggestions.set(responseData.chart_suggestions || []);
            this.showChartSelection.set(true);
            this.historyService.addToHistory(message, 'sql');
          } else {
            this.addMessage('bot', responseData.message);
          }
        } else {
          this.addMessage('bot', `❌ **Error:** ${responseData.error}`);
        }
      }
    }, 5800); // Total animation time: 8 steps * 600ms + 1000ms final delay
  }

    createChart(chartType: string): void {
      // Show loading overlay for chart creation
      this.isLoading.set(true);
      this.loadingMessage.set('Creating beautiful visualization...');
      this.animateChartLoadingProgress();
      
      // Store response to handle after animation completes
      let responseData: any = null;
      let responseError: any = null;

      this.chatService.createChart(chartType).subscribe({
        next: (response) => {
          responseData = response;
        },
        error: (error) => {
          responseError = error;
        },
      });

      // Let the full animation complete (7 steps * 500ms = 3.5s + 1s final delay = 4.5s)
      setTimeout(() => {
        this.isLoading.set(false);
        
        // Handle the response after animation completes
        if (responseError) {
          this.addMessage('bot', `❌ **Error:** ${responseError.message}`);
          this.showChartSelection.set(false);
        } else if (responseData) {
          if (responseData.success) {
            this.addMessage('bot', responseData.message, responseData.chart);
            this.currentChart.set(responseData.chart);
            this.historyService.addToHistory(`${chartType} chart`, 'chart');
          } else {
            this.addMessage('bot', `❌ **Chart Creation Failed:** ${responseData.error}`);
          }
          this.showChartSelection.set(false);
        }
      }, 4500); // Total animation time: 7 steps * 500ms + 1000ms final delay
    }

    toggleVoiceInput(): void {
      if (!('webkitSpeechRecognition' in window)) {
        // Handle unsupported browser
        return;
      }

      if (this.isListening()) {
        this.stopVoiceRecognition();
      } else {
        this.startVoiceRecognition();
      }
    }

    clearChat(): void {
      if (confirm('Are you sure you want to clear the conversation?')) {
        this.messages.set([
          {
            type: 'bot',
            content: `🚀 **Welcome back to ChartBot SQL AI!**\n\nI'm ready to help you execute SQL queries and create beautiful visualizations. What would you like to explore today?`,
            time: this.getCurrentTime(),
          },
        ]);
        this.showChartSelection.set(false);
      }
    }

    toggleFullscreen(): void {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }

    private addMessage(type: 'user' | 'bot', content: string, chart?: any): void {
      this.messages.update((msgs) => [
        ...msgs,
        { type, content: this.formatContent(content), chart, time: this.getCurrentTime() },
      ]);
      setTimeout(() => this.scrollToBottom(), 0);
    }

    private formatContent(text: string): string {
      return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>')
        .replace(/•/g, '&bull;');
    }

    private getCurrentTime(): string {
      return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    private scrollToBottom(): void {
      const chatMessagesElement = this.chatMessages();
      if (chatMessagesElement && chatMessagesElement.nativeElement) {
        chatMessagesElement.nativeElement.scrollTop = chatMessagesElement.nativeElement.scrollHeight;
      }
    }

    private startVoiceRecognition(): void {
      this.recognition = new (window as any).webkitSpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.isListening.set(true);
      };

      this.recognition.onresult = (event: any) => {
        this.inputMessage.set(event.results[0][0].transcript);
        this.isListening.set(false);
      };

      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        this.isListening.set(false);
      };

      this.recognition.onend = () => {
        this.isListening.set(false);
      };

      this.recognition.start();
    }

    private stopVoiceRecognition(): void {
      if (this.recognition) {
        this.recognition.stop();
      }
      this.isListening.set(false);
    }

    private animateLoadingProgress(): void {
      this.loadingProgress.set(0);
      
      const progressSteps = [10, 20, 35, 50, 70, 85, 95, 100];
      const messages = [
        'Connecting to database...',
        'Validating SQL query...',
        'Executing query...',
        'Fetching data...',
        'Processing results...',
        'Preparing response...',
        'Almost done...',
        'Complete!'
      ];
      
      progressSteps.forEach((progress, index) => {
        setTimeout(() => {
          this.loadingProgress.set(progress);
          this.loadingMessage.set(messages[index]);
        }, index * 600); // 600ms delay between each step (increased from 300ms)
      });
    }

    private animateChartLoadingProgress(): void {
      this.loadingProgress.set(0);
      
      const progressSteps = [15, 30, 45, 60, 75, 90, 100];
      const messages = [
        'Analyzing data structure...',
        'Selecting optimal chart type...',
        'Processing data points...',
        'Generating visualization...',
        'Applying styling...',
        'Finalizing chart...',
        'Chart ready!'
      ];
      
      progressSteps.forEach((progress, index) => {
        setTimeout(() => {
          this.loadingProgress.set(progress);
          this.loadingMessage.set(messages[index]);
        }, index * 500); // 500ms delay between each step (increased from 250ms)
      });
    }
}