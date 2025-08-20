import { Injectable } from '@angular/core';

export interface ExportOptions {
  format: 'png' | 'svg' | 'pdf' | 'json';
  width: number;
  height: number;
  filename: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  constructor() { }

  exportChart(chartData: any, options: ExportOptions): void {
    switch (options.format) {
      case 'png':
        this.exportAsPNG(chartData, options);
        break;
      case 'svg':
        this.exportAsSVG(chartData, options);
        break;
      case 'pdf':
        this.exportAsPDF(chartData, options);
        break;
      case 'json':
        this.exportAsJSON(chartData, options);
        break;
    }
  }

  private exportAsPNG(chartData: any, options: ExportOptions): void {
    // For PNG export, we'll create a canvas and download it
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.error('Canvas context not available');
      return;
    }

    canvas.width = options.width;
    canvas.height = options.height;

    // Create a simple chart representation on canvas
    this.drawChartOnCanvas(ctx, chartData, options.width, options.height);

    // Convert to blob and download
    canvas.toBlob((blob) => {
      if (blob) {
        this.downloadFile(blob, `${options.filename}.png`, 'image/png');
      }
    }, 'image/png');
  }

  private exportAsSVG(chartData: any, options: ExportOptions): void {
    // Create SVG representation
    const svgContent = this.createSVGChart(chartData, options.width, options.height);
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    this.downloadFile(blob, `${options.filename}.svg`, 'image/svg+xml');
  }

  private exportAsPDF(chartData: any, options: ExportOptions): void {
    // For PDF, we'll create a simple text representation
    // In a real implementation, you'd use a PDF library like jsPDF
    const pdfContent = this.createPDFContent(chartData);
    const blob = new Blob([pdfContent], { type: 'application/pdf' });
    this.downloadFile(blob, `${options.filename}.pdf`, 'application/pdf');
  }

  private exportAsJSON(chartData: any, options: ExportOptions): void {
    // Export chart data as JSON
    const jsonContent = JSON.stringify(chartData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    this.downloadFile(blob, `${options.filename}.json`, 'application/json');
  }

  private drawChartOnCanvas(ctx: CanvasRenderingContext2D, chartData: any, width: number, height: number): void {
    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    // Draw chart title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(chartData.title || 'Chart', width / 2, 40);

    // Draw simple bar chart representation
    if (chartData.values && chartData.values.length > 0) {
      const barWidth = (width - 100) / chartData.values.length;
      const maxValue = Math.max(...chartData.values.map((v: any) => v.y || v.value || 0));
      const chartHeight = height - 100;
      const barMaxHeight = chartHeight * 0.8;

      chartData.values.forEach((value: any, index: number) => {
        const barHeight = ((value.y || value.value || 0) / maxValue) * barMaxHeight;
        const x = 50 + (index * barWidth);
        const y = height - 80 - barHeight;

        // Draw bar
        ctx.fillStyle = '#6366f1';
        ctx.fillRect(x, y, barWidth - 10, barHeight);

        // Draw label
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(value.x || value.label || `Item ${index + 1}`, x + barWidth / 2 - 5, height - 20);
      });
    }
  }

  private createSVGChart(chartData: any, width: number, height: number): string {
    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<rect width="100%" height="100%" fill="#1a1a2e"/>`;
    
    // Add title
    svg += `<text x="${width / 2}" y="30" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="20" font-weight="bold">${chartData.title || 'Chart'}</text>`;

    // Add simple chart representation
    if (chartData.values && chartData.values.length > 0) {
      const barWidth = (width - 100) / chartData.values.length;
      const maxValue = Math.max(...chartData.values.map((v: any) => v.y || v.value || 0));
      const chartHeight = height - 100;
      const barMaxHeight = chartHeight * 0.8;

      chartData.values.forEach((value: any, index: number) => {
        const barHeight = ((value.y || value.value || 0) / maxValue) * barMaxHeight;
        const x = 50 + (index * barWidth);
        const y = height - 80 - barHeight;

        // Draw bar
        svg += `<rect x="${x}" y="${y}" width="${barWidth - 10}" height="${barHeight}" fill="#6366f1"/>`;
        
        // Draw label
        svg += `<text x="${x + barWidth / 2 - 5}" y="${height - 20}" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="12">${value.x || value.label || `Item ${index + 1}`}</text>`;
      });
    }

    svg += '</svg>';
    return svg;
  }

  private createPDFContent(chartData: any): string {
    // Simple text representation for PDF
    // In a real implementation, you'd use a proper PDF library
    let content = `ChartBot SQL Export\n`;
    content += `Generated on: ${new Date().toLocaleString()}\n\n`;
    content += `Chart Title: ${chartData.title || 'Untitled Chart'}\n`;
    content += `Chart Type: ${chartData.type || 'Unknown'}\n\n`;
    
    if (chartData.values && chartData.values.length > 0) {
      content += `Data Points:\n`;
      chartData.values.forEach((value: any, index: number) => {
        content += `${index + 1}. ${value.x || value.label || 'Unknown'}: ${value.y || value.value || 0}\n`;
      });
    }

    return content;
  }

  private downloadFile(blob: Blob, filename: string, type: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
} 