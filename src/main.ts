import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { PlotlyModule } from 'angular-plotly.js';

// Configure PlotlyJS synchronously before bootstrapping
async function configurePlotlyAndBootstrap() {
  try {
    // Try to import PlotlyJS
    const PlotlyJS = await import('plotly.js-dist/plotly.js');
    const Plotly = PlotlyJS.default || PlotlyJS;
    
    // Set PlotlyJS for angular-plotly.js
    (PlotlyModule as any).plotlyjs = Plotly;
    console.log('PlotlyJS configured successfully');
    
    // Bootstrap Angular after PlotlyJS is configured
    bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
  } catch (error) {
    console.error('Failed to load PlotlyJS:', error);
    // Bootstrap without PlotlyJS if it fails to load
    bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
  }
}

// Start the configuration process
configurePlotlyAndBootstrap();