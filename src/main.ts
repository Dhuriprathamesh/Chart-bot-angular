import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

function configurePlotlyAndBootstrap() {
  const script = document.createElement('script');
  script.src = 'https://cdn.plot.ly/plotly-2.27.0.min.js';
  script.type = 'text/javascript';
  script.async = true;

  script.onload = () => {
    const plotly = (window as any).Plotly;
    if (plotly) {
      console.log('✅ PlotlyJS loaded from CDN');

      // No need to provide anything — use window.Plotly in your component
      bootstrapApplication(AppComponent, appConfig)
        .catch(err => console.error('Bootstrap error:', err));
    } else {
      console.error('❌ Plotly not found on window object');
    }
  };

  script.onerror = () => {
    console.error('❌ Failed to load PlotlyJS from CDN');
  };

  document.head.appendChild(script);
}

configurePlotlyAndBootstrap();
