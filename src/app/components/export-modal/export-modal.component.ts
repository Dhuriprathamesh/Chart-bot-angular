import { Component, signal, input, output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExportService, ExportOptions } from '../../services/export.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-export-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './export-modal.component.html',
  styleUrls: ['./export-modal.component.css'],
})
export class ExportModalComponent {
  // Input properties
  chartData = input<any>(null);
  
  // Output events
  exportComplete = output<void>();
  exportError = output<string>();

  isOpen = signal<boolean>(false);
  selectedFormat = signal<string>('png');
  isExporting = signal<boolean>(false);

  // Regular properties for two-way binding with ngModel
  exportWidthValue: number = 800;
  exportHeightValue: number = 600;
  exportFilenameValue: string = 'chartbot-sql-export';

  // Signals initialized with the regular property values
  exportWidth = signal<number>(this.exportWidthValue);
  exportHeight = signal<number>(this.exportHeightValue);
  exportFilename = signal<string>(this.exportFilenameValue);

  constructor(private exportService: ExportService, private toastService: ToastService) {}

  // Change to public methods for template access
  public updateExportWidth() {
    this.exportWidth.set(this.exportWidthValue);
  }

  public updateExportHeight() {
    this.exportHeight.set(this.exportHeightValue);
  }

  public updateExportFilename() {
    this.exportFilename.set(this.exportFilenameValue);
  }

  open(): void {
    this.isOpen.set(true);
    // Set default filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    this.exportFilenameValue = `chartbot-export-${timestamp}`;
    this.updateExportFilename();
  }

  close(): void {
    this.isOpen.set(false);
    this.isExporting.set(false);
  }

  selectFormat(format: string): void {
    this.selectedFormat.set(format);
  }

  async exportChart(): Promise<void> {
    if (!this.chartData()) {
      this.toastService.error('No chart data available for export');
      this.exportError.emit('No chart data available for export');
      return;
    }

    if (!this.selectedFormat()) {
      this.toastService.error('Please select an export format');
      this.exportError.emit('Please select an export format');
      return;
    }

    this.isExporting.set(true);

    try {
      const options: ExportOptions = {
        format: this.selectedFormat() as 'png' | 'svg' | 'pdf' | 'json',
        width: this.exportWidth(),
        height: this.exportHeight(),
        filename: this.exportFilename()
      };

      this.exportService.exportChart(this.chartData(), options);
      
      // Show success message
      this.toastService.success(`Chart exported successfully as ${options.format.toUpperCase()}!`);
      
      // Add a small delay to show the export is complete
      setTimeout(() => {
        this.isExporting.set(false);
        this.exportComplete.emit();
        this.close();
      }, 1000);

    } catch (error) {
      this.isExporting.set(false);
      const errorMessage = `Export failed: ${error}`;
      this.toastService.error(errorMessage);
      this.exportError.emit(errorMessage);
    }
  }

  getFormatDescription(format: string): string {
    switch (format) {
      case 'png':
        return 'High-quality image file';
      case 'svg':
        return 'Scalable vector graphics';
      case 'pdf':
        return 'Portable document format';
      case 'json':
        return 'Raw chart data';
      default:
        return '';
    }
  }
}