import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Empresa {
  nombre: string;
  sucursal: string;
  codigo: string;
  horario: string;
}

export interface Empleado {
  id: number;
  nombre: string;
  puesto: string;
  departamento: string;
  avatar: string;
  tarifaHora?: number;
}

export interface Registro {
  id: number;
  empleadoId: number;
  empleadoNombre: string;
  puesto: string;
  departamento: string;
  fecha: string;
  horaEntrada: string;
  horaSalida?: string;
  horaPausaInicio?: string;
  horaPausaFin?: string;
  totalHoras?: string;
  estado: 'En Turno' | 'En Pausa' | 'Completado';
  observacion?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RegistroService {
  private jsonUrl = 'data/registros.json';

  constructor(private http: HttpClient) {}

  getDatosIniciales(): Observable<any> {
    return this.http.get<any>(this.jsonUrl);
  }
}