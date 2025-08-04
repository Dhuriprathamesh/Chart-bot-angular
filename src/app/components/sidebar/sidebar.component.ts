import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HistoryService } from '../../services/history.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent {
  @Output() toggleSidebar = new EventEmitter<void>();
  history = this.historyService.getHistory();
  exampleQueries = [
    { query: 'SELECT id, first_name, last_name, email FROM users LIMIT 10', label: 'View Users' },
    { query: 'SELECT * FROM students;', label: 'View Students' },
    { query: 'SELECT grade, COUNT(*) AS total FROM students GROUP BY grade;', label: 'Students by Grade' },
  ];
  selectedQuery = signal<string>('');

  constructor(private historyService: HistoryService) {}

  clearHistory(): void {
    if (confirm('Are you sure you want to clear your query history?')) {
      this.historyService.clearHistory();
    }
  }

  selectExampleQuery(query: string): void {
    this.selectedQuery.set(query);
  }
}