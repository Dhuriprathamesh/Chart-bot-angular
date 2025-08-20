import { Component, ElementRef, EventEmitter, Output, ViewChild, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';
import { HistoryService } from '../../services/history.service';
import { ChatMessage } from '../../services/supabase.service';
import { ChartSelectionComponent } from '../chart-selection/chart-selection.component';
import { LoadingOverlayComponent } from '../loading-overlay/loading-overlay.component';
import { ExportModalComponent } from '../export-modal/export-modal.component';
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
  imports: [
    CommonModule,
    FormsModule,
    ChartSelectionComponent,
    LoadingOverlayComponent,
    ExportModalComponent
  ],
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
export class ChatComponent implements OnInit {
  @Output() toggleSidebar = new EventEmitter<void>();
  @ViewChild('chatMessages') chatMessages!: ElementRef;
  @ViewChild('exportModal') exportModal!: ExportModalComponent;

  messages = signal<Message[]>([]);
  inputMessage = signal<string>('');
  isListening = signal<boolean>(false);
  showChartSelection = signal<boolean>(false);
  currentChart = signal<any>(null);
  chartSuggestions = signal<any[]>([]);
  isLoading = signal<boolean>(false);
  loadingMessage = signal<string>('Processing SQL Query...');
  loadingProgress = signal<number>(0);
  currentSessionId = signal<string | null>(null);

  private recognition: any = null;

  constructor(
    private chatService: ChatService, 
    private historyService: HistoryService
  ) {}

  async ngOnInit() {
    // Load initial session or create new if none
    const sessions = (await this.historyService.loadChatSessions()); // Use .() to get value
    if (sessions.length > 0) {
      this.currentSessionId.set(sessions[0].id);
      await this.loadChatHistory(sessions[0].id);
    } else {
      await this.initializeNewChat();
    }
  }

  async initializeNewChat(): Promise<void> {
    this.messages.set([
      {
        type: 'bot',
        content: `🚀 **Welcome back to ChartBot SQL AI!**\n\nI'm ready to help you execute SQL queries and create beautiful visualizations. What would you like to explore today?`,
        time: this.getCurrentTime(),
      },
    ]);
    this.currentSessionId.set(null);
    await this.saveChatSession();
  }

  async loadChatHistory(sessionId: string): Promise<void> {
    try {
      const savedMessages = await this.historyService.loadChatHistory(sessionId);
      if (savedMessages.length > 0) {
        const convertedMessages: Message[] = savedMessages.map(msg => ({
          type: msg.type,
          content: msg.content,
          chart: msg.chart,
          time: msg.time
        }));
        this.messages.set(convertedMessages);
      } else {
        await this.initializeNewChat();
      }
      this.currentSessionId.set(sessionId);
      this.scrollToBottom();
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  }

  async saveChatSession(): Promise<void> {
    if (this.currentSessionId()) {
      // Update existing session with current messages
      const messages = this.messages();
      await Promise.all(messages.map(msg => this.historyService.saveChatMessage({
        type: msg.type,
        content: msg.content,
        chart: msg.chart,
        time: msg.time,
        session_id: this.currentSessionId() || undefined, // Handle null with undefined
      })));
      await this.historyService.updateChatSession(this.currentSessionId()!, {
        message_count: messages.length,
        updated_at: new Date().toISOString()
      });
    } else {
      // Create new session
      const sessionId = `session_${Date.now()}`;
      const newSession = {
        id: sessionId,
        title: 'New Chat',
        message_count: this.messages().length,
        updated_at: new Date().toISOString()
      };
      await this.historyService.createChatSession(newSession);
      this.currentSessionId.set(sessionId);
      await this.saveMessagesToSupabase();
    }
  }

  async saveMessagesToSupabase(): Promise<void> {
    const messages = this.messages();
    await Promise.all(messages.map(msg => this.historyService.saveChatMessage({
      type: msg.type,
      content: msg.content,
      chart: msg.chart,
      time: msg.time,
      session_id: this.currentSessionId() || undefined, // Handle null with undefined
    })));
  }

  async sendMessage(): Promise<void> {
    const message = this.inputMessage().trim();
    if (!message) return;

    await this.addMessage('user', message);
    this.inputMessage.set('');
    this.showChartSelection.set(false);
    this.isLoading.set(true);
    this.loadingMessage.set('Executing SQL query and fetching data...');
    this.animateLoadingProgress();

    let responseData: any = null;
    let responseError: any = null;

    this.chatService.sendMessage(message).subscribe({
      next: (response) => (responseData = response),
      error: (error) => (responseError = error),
    });

    setTimeout(async () => {
      this.isLoading.set(false);

      if (responseError) {
        await this.addMessage('bot', `❌ **Connection Error:** ${responseError.message}`);
      } else if (responseData) {
        if (responseData.success) {
          if (responseData.type === 'sql_result') {
            await this.addMessage('bot', responseData.message);
            this.chartSuggestions.set(responseData.chart_suggestions || []);
            this.showChartSelection.set(true);
            this.historyService.addToHistory(message, 'sql');
          } else {
            await this.addMessage('bot', responseData.message);
          }
        } else {
          await this.addMessage('bot', `❌ **Error:** ${responseData.error}`);
        }
      }
      await this.saveChatSession();
    }, 5800);
  }

  async createChart(chartType: string): Promise<void> {
    this.isLoading.set(true);
    this.loadingMessage.set('Creating beautiful visualization...');
    this.animateChartLoadingProgress();

    let responseData: any = null;
    let responseError: any = null;

    this.chatService.createChart(chartType).subscribe({
      next: (response) => {
        responseData = response;
        console.log("📊 responseData.chart:", response.chart);
      },
      error: (error) => (responseError = error),
    });

    setTimeout(async () => {
      this.isLoading.set(false);

      if (responseError) {
        await this.addMessage('bot', `❌ **Error:** ${responseError.message}`);
        this.showChartSelection.set(false);
      } else if (responseData) {
        if (responseData.success) {
          const formattedChart = this.formatChartForPlotly(responseData.chart);
          await this.addMessage('bot', responseData.message, formattedChart);
          this.currentChart.set(formattedChart);
          this.historyService.addToHistory(`${chartType} chart`, 'chart');
        } else {
          await this.addMessage('bot', `❌ **Chart Creation Failed:** ${responseData.error}`);
        }
        this.showChartSelection.set(false);
      }
      await this.saveChatSession();
    }, 4500);
  }

  private formatChartForPlotly(chartData: any): any {
    let trace: any;

    if (chartData.type === 'pie') {
      trace = {
        type: 'pie',
        labels: chartData.labels,
        values: chartData.values,
        marker: {
          colors: chartData.colors || undefined
        },
        textinfo: 'label+percent',
        hoverinfo: 'label+value+percent',
        hole: chartData.hole || 0
      };
    } else {
      trace = {
        x: chartData.labels,
        y: chartData.values,
        type: chartData.type || 'bar',
        name: chartData.title || 'Chart',
        marker: {
          color: chartData.colors || undefined
        }
      };

      if (chartData.type === 'scatter') {
        trace.mode = 'markers';
        trace.marker = trace.marker || { color: 'rgb(99, 102, 241)', size: 8 };
      }

      if (chartData.type === 'line') {
        trace.line = { color: 'rgb(99, 102, 241)', width: 3 };
      }
    }

    const plotlyData = [trace];

    const layout =
      chartData.type === 'pie'
        ? {
            title: chartData.title || 'Pie Chart',
            showlegend: true,
            height: 400,
            width: 500,
            margin: { t: 50, b: 50, l: 50, r: 50 },
            font: { color: '#e2e8f0' },
            plot_bgcolor: 'rgba(0,0,0,0)',
            paper_bgcolor: 'rgba(0,0,0,0)',
            legend: {
              orientation: 'h',
              xanchor: 'center',
              x: 0.5,
              y: -0.2
            }
          }
        : {
            title: chartData.title || 'Chart',
            showlegend: true,
            xaxis: {
              title: 'Labels',
              showgrid: true,
              gridcolor: 'rgba(99, 102, 241, 0.1)'
            },
            yaxis: {
              title: 'Values',
              showgrid: true,
              gridcolor: 'rgba(99, 102, 241, 0.1)'
            },
            plot_bgcolor: 'rgba(0,0,0,0)',
            paper_bgcolor: 'rgba(0,0,0,0)',
            font: { color: '#e2e8f0' },
            margin: { l: 50, r: 50, t: 50, b: 50 }
          };

    const config = {
      displayModeBar: true,
      displaylogo: false,
      responsive: true,
      modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d']
    };

    return { ...chartData, data: plotlyData, layout, config };
  }

  renderPlotlyChart(chartData: any, elementId: string): void {
    if ((window as any).Plotly && chartData) {
      const plotlyData = this.formatChartForPlotly(chartData);
      (window as any).Plotly.newPlot(elementId, plotlyData.data, plotlyData.layout, plotlyData.config);
    }
  }

  async clearChat(): Promise<void> {
    if (confirm('Are you sure you want to clear the conversation? This will also clear your chat history from the database.')) {
      await this.historyService.clearAllChatHistory();
      await this.initializeNewChat();
    }
  }

  clearInput(): void {
    this.inputMessage.set('');
  }

  toggleVoiceInput(): void {
    if (!('webkitSpeechRecognition' in window)) return;

    if (this.isListening()) {
      this.stopVoiceRecognition();
    } else {
      this.startVoiceRecognition();
    }
  }

  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  openExportModal(): void {
    if (!this.currentChart()) {
      this.addMessage('bot', '❌ **No chart available for export.** Please create a chart first.');
      return;
    }
    this.exportModal?.open();
  }

  onExportComplete(): void {
    this.addMessage('bot', '✅ **Chart exported successfully!** Your file has been downloaded.');
  }

  onExportError(error: string): void {
    this.addMessage('bot', `❌ **Export failed:** ${error}`);
  }

  private async addMessage(type: 'user' | 'bot', content: string, chart?: any): Promise<void> {
    const message: Message = { 
      type, 
      content: this.formatContent(content), 
      chart, 
      time: this.getCurrentTime() 
    };
    
    this.messages.update((msgs) => [...msgs, message]);
    await this.saveMessageToSupabase(type, content, chart);
    
    setTimeout(() => {
      this.scrollToBottom();
      if (chart) {
        const messageIndex = this.messages().length - 1;
        const elementId = `chart-${messageIndex}`;
        setTimeout(() => {
          this.renderPlotlyChart(chart, elementId);
        }, 100);
      }
    }, 0);
  }

  private async saveMessageToSupabase(type: 'user' | 'bot', content: string, chart?: any): Promise<void> {
    try {
      const chatMessage: Omit<ChatMessage, 'id' | 'created_at'> = {
        type,
        content,
        chart,
        time: this.getCurrentTime(),
        session_id: this.currentSessionId() || undefined, // Handle null with undefined
      };
      await this.historyService.saveChatMessage(chatMessage);
    } catch (error) {
      console.error('Failed to save message to Supabase:', error);
    }
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
    if (this.chatMessages?.nativeElement) {
      this.chatMessages.nativeElement.scrollTop = this.chatMessages.nativeElement.scrollHeight;
    }
  }

  private startVoiceRecognition(): void {
    this.recognition = new (window as any).webkitSpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => this.isListening.set(true);
    this.recognition.onresult = (event: any) => {
      this.inputMessage.set(event.results[0][0].transcript);
      this.isListening.set(false);
    };
    this.recognition.onerror = () => this.isListening.set(false);
    this.recognition.onend = () => this.isListening.set(false);

    this.recognition.start();
  }

  private stopVoiceRecognition(): void {
    if (this.recognition) this.recognition.stop();
    this.isListening.set(false);
  }

  private animateLoadingProgress(): void {
    this.loadingProgress.set(0);
    const steps = [10, 20, 35, 50, 70, 85, 95, 100];
    const messages = [
      'Connecting to database...',
      'Validating SQL query...',
      'Executing query...',
      'Fetching results...',
      'Processing data...',
      'Preparing response...',
      'Generating suggestions...',
      'Complete!'
    ];

    steps.forEach((step, index) => {
      setTimeout(() => {
        this.loadingProgress.set(step);
        if (index < messages.length) {
          this.loadingMessage.set(messages[index]);
        }
      }, index * 700);
    });
  }

  private animateChartLoadingProgress(): void {
    this.loadingProgress.set(0);
    const steps = [15, 30, 50, 70, 85, 100];
    const messages = [
      'Preparing chart data...',
      'Selecting visualization type...',
      'Rendering chart...',
      'Applying styling...',
      'Finalizing...',
      'Complete!'
    ];

    steps.forEach((step, index) => {
      setTimeout(() => {
        this.loadingProgress.set(step);
        if (index < messages.length) {
          this.loadingMessage.set(messages[index]);
        }
      }, index * 750);
    });
  }
}