import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-export-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './export-modal.component.html',
  styleUrls: ['./export-modal.component.css'],
})
export class ExportModalComponent {
  isOpen = signal<boolean>(false);
  selectedFormat = signal<string>('');

  // Regular properties for two-way binding with ngModel
  exportWidthValue: number = 800;
  exportHeightValue: number = 600;
  exportFilenameValue: string = 'chartbot-sql-export';

  // Signals initialized with the regular property values
  exportWidth = signal<number>(this.exportWidthValue);
  exportHeight = signal<number>(this.exportHeightValue);
  exportFilename = signal<string>(this.exportFilenameValue);

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
  }

  close(): void {
    this.isOpen.set(false);
  }

  selectFormat(format: string): void {
    this.selectedFormat.set(format);
  }

  exportChart(): void {
    // Implement export logic using the signal values
    console.log({
      format: this.selectedFormat(),
      width: this.exportWidth(),
      height: this.exportHeight(),
      filename: this.exportFilename()
    });
    this.close();
  }
}