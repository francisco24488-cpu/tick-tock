import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface Empresa {
  nombre: string;
  sucursal: string;
  codigo: string;
  horario: string;
}

export interface Usuario {
  id?: string;
  nombre: string;
  correo: string;
  password?: string;
  rol: 'estudiante' | 'admin'; // 'estudiante' actua como usuario/colaborador general
  departamento: string;
  avatar: string;
  puesto: string;
}

export interface Registro {
  id?: string;
  empleadoId: string;
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

  // --- REGISTROS DE TIEMPO Y ASISTENCIA ---
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

  // --- AUTENTICACIÓN Y GESTIÓN DE USUARIOS ---
  async registrarUsuario(usuario: Usuario): Promise<any> {
    const usuariosRef = collection(this.firestore, 'usuarios');
    return addDoc(usuariosRef, usuario);
  }

  async buscarUsuarioPorCorreo(correo: string): Promise<Usuario | null> {
    const usuariosRef = collection(this.firestore, 'usuarios');
    const q = query(usuariosRef, where('correo', '==', correo.trim().toLowerCase()));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      return { id: docSnap.id, ...docSnap.data() } as Usuario;
    }
    return null;
  }

  getUsuarios(): Observable<Usuario[]> {
    const usuariosRef = collection(this.firestore, 'usuarios');
    return collectionData(usuariosRef, { idField: 'id' }) as Observable<Usuario[]>;
  }
}