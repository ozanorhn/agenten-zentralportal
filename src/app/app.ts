import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toast } from './components/toast/toast';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toast],
  template: `
    <router-outlet />
    <app-toast />
  `,
  styles: [],
})
export class App {}
