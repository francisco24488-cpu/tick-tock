import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, addDoc, updateDoc, deleteDoc, doc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface Empresa {
  nombre: string;
  sucursal: string;
  codigo: string;
  horario: string;
}

export interface Empleado {
  id: string | number;
  nombre: string;
  puesto: string;
  departamento: string;
  avatar: string;
  tarifaHora?: number;
}

export interface Registro {
  id?: string;
  empleadoId: string | number;
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
  constructor(private firestore: Firestore) {}

  getRegistros(): Observable<Registro[]> {
    const registrosRef = collection(this.firestore, 'registros');
    return collectionData(registrosRef, { idField: 'id' }) as Observable<Registro[]>;
  }

  agregarRegistro(registro: Registro) {
    const registrosRef = collection(this.firestore, 'registros');
    return addDoc(registrosRef, registro);
  }

  actualizarRegistro(id: string, data: Partial<Registro>) {
    const registroDoc = doc(this.firestore, `registros/${id}`);
    return updateDoc(registroDoc, data);
  }

  eliminarRegistro(id: string) {
    const registroDoc = doc(this.firestore, `registros/${id}`);
    return deleteDoc(registroDoc);
  }
}