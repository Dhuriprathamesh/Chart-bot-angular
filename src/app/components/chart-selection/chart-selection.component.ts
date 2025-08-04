import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chart-selection',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chart-selection.component.html',
  styleUrls: ['./chart-selection.component.css'],
})
export class ChartSelectionComponent {
  @Output() selectChart = new EventEmitter<string>();
  @Input() chartSuggestions: any[] = [];
  
  get chartOptions() {
    if (this.chartSuggestions && this.chartSuggestions.length > 0) {
      return this.chartSuggestions.map(suggestion => ({
        type: suggestion.type,
        icon: this.getIconForType(suggestion.type),
        label: suggestion.title,
        description: suggestion.description,
        bestFor: suggestion.best_for
      }));
    }
    
    // Fallback to default options
    return [
      { type: 'bar', icon: 'chart-bar', label: 'Bar Chart', description: 'Compare categories', bestFor: 'Comparing categories' },
      { type: 'line', icon: 'chart-line', label: 'Line Chart', description: 'Show trends', bestFor: 'Time series data' },
      { type: 'pie', icon: 'chart-pie', label: 'Pie Chart', description: 'Show proportions', bestFor: 'Parts of a whole' },
      { type: 'scatter', icon: 'braille', label: 'Scatter Plot', description: 'Find correlations', bestFor: 'Relationships' },
      { type: 'area', icon: 'chart-area', label: 'Area Chart', description: 'Cumulative data', bestFor: 'Cumulative trends' },
    ];
  }
  
  private getIconForType(type: string): string {
    const iconMap: { [key: string]: string } = {
      'bar': 'chart-bar',
      'line': 'chart-line',
      'pie': 'chart-pie',
      'scatter': 'braille',
      'area': 'chart-area',
      'table': 'table',
      'summary': 'info-circle'
    };
    return iconMap[type] || 'chart-bar';
  }
}