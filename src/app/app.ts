import { Component, OnInit } from '@angular/core';
import { RegistroService } from './services/registro';

@Component({
  selector: 'app-root',
  standalone: true,
  template: `<h1>Control de Horas - TickTock</h1>`
})
export class App implements OnInit {
  constructor(private registroService: RegistroService) {}

  ngOnInit() {
    this.registroService.getDatosIniciales().subscribe();
  }
}