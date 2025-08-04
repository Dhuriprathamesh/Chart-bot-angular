import { Component, signal } from '@angular/core';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { ChatComponent } from './components/chat/chat.component';
import { LoadingOverlayComponent } from './components/loading-overlay/loading-overlay.component';
import { ToastComponent } from './components/toast/toast.component';
import { ExportModalComponent } from './components/export-modal/export-modal.component';
import { ThemeService } from './services/theme.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    SidebarComponent,
    ChatComponent,
    LoadingOverlayComponent,
    ToastComponent,
    ExportModalComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  sidebarHidden = signal(false); // Always show sidebar by default

  constructor(private themeService: ThemeService) {
    document.body.classList.toggle('light-theme', this.themeService.theme() === 'light');
    // Clear any stored sidebar state to ensure it's visible
    localStorage.removeItem('sidebarHidden');
  }

  toggleSidebar(): void {
    this.sidebarHidden.update((hidden) => {
      const newState = !hidden;
      localStorage.setItem('sidebarHidden', newState.toString());
      return newState;
    });
  }
}