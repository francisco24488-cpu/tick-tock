import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RegistroService } from './services/registro';

export interface Registro {
  id: number;
  empleadoId: number;
  empleadoNombre: string;
  puesto: string;
  departamento: string;
  fecha: string;
  horaEntrada: string;
  horaSalida?: string;
  estado: 'En Turno' | 'Completado';
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  empresa = { nombre: 'TechServices Corp', sucursal: 'Sede Central' };
  empleados: any[] = [];
  registros: Registro[] = [];
  
  empleadoSeleccionadoId: number = 1;
  empleadoSeleccionado: any = null;
  relojEnVivo: string = '';

  constructor(private registroService: RegistroService) {}

  ngOnInit(): void {
    setInterval(() => {
      this.relojEnVivo = new Date().toLocaleTimeString();
    }, 1000);

    this.registroService.getDatosIniciales().subscribe({
      next: (data) => {
        this.empresa = data.empresa;
        this.empleados = data.empleados;
        this.registros = data.registros;
        this.alCambiarEmpleado();
      }
    });
  }

  alCambiarEmpleado(): void {
    this.empleadoSeleccionado = this.empleados.find(e => e.id === Number(this.empleadoSeleccionadoId));
  }

  get estaEnTurno(): boolean {
    if (!this.empleadoSeleccionado) return false;
    return this.registros.some(r => r.empleadoId === this.empleadoSeleccionado.id && r.estado === 'En Turno');
  }

  marcarEntrada(): void {
    if (!this.empleadoSeleccionado) return;
    const ahora = new Date();
    const nuevo: Registro = {
      id: Date.now(),
      empleadoId: this.empleadoSeleccionado.id,
      empleadoNombre: this.empleadoSeleccionado.nombre,
      puesto: this.empleadoSeleccionado.puesto,
      departamento: this.empleadoSeleccionado.departamento,
      fecha: ahora.toLocaleDateString(),
      horaEntrada: ahora.toLocaleTimeString(),
      estado: 'En Turno'
    };
    this.registros.unshift(nuevo);
  }

  marcarSalida(): void {
    const reg = this.registros.find(r => r.empleadoId === this.empleadoSeleccionado?.id && r.estado === 'En Turno');
    if (reg) {
      reg.horaSalida = new Date().toLocaleTimeString();
      reg.estado = 'Completado';
    }
  }
}