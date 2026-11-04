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
  rol: 'estudiante' | 'admin';
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

// Función auxiliar para limitar el tiempo de espera a 5 segundos
function conTimeout<T>(promesa: Promise<T>, ms: number = 5000): Promise<T> {
  return Promise.race([
    promesa,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Tiempo de espera agotado al conectar con Firestore')), ms)
    )
  ]);
}

@Injectable({
  providedIn: 'root'
})
export class RegistroService {
  constructor(private firestore: Firestore) {}

  // --- REGISTROS DE ASISTENCIA ---
  getRegistros(): Observable<Registro[]> {
    const registrosRef = collection(this.firestore, 'registros');
    return collectionData(registrosRef, { idField: 'id' }) as Observable<Registro[]>;
  }

  agregarRegistro(registro: Registro) {
    const registrosRef = collection(this.firestore, 'registros');
    return conTimeout(addDoc(registrosRef, registro));
  }

  actualizarRegistro(id: string, data: Partial<Registro>) {
    const registroDoc = doc(this.firestore, `registros/${id}`);
    return conTimeout(updateDoc(registroDoc, data));
  }

  eliminarRegistro(id: string) {
    const registroDoc = doc(this.firestore, `registros/${id}`);
    return conTimeout(deleteDoc(registroDoc));
  }

  // --- USUARIOS Y AUTENTICACIÓN ---
  async registrarUsuario(usuario: Usuario): Promise<any> {
    const usuariosRef = collection(this.firestore, 'usuarios');
    return conTimeout(addDoc(usuariosRef, usuario));
  }

  async buscarUsuarioPorCorreo(correo: string): Promise<Usuario | null> {
    try {
      const usuariosRef = collection(this.firestore, 'usuarios');
      const q = query(usuariosRef, where('correo', '==', correo.trim().toLowerCase()));
      const querySnapshot = await conTimeout(getDocs(q));
      
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        return { id: docSnap.id, ...docSnap.data() } as Usuario;
      }
      return null;
    } catch (e) {
      console.error('Error al consultar usuario en Firestore:', e);
      throw e;
    }
  }

  getUsuarios(): Observable<Usuario[]> {
    const usuariosRef = collection(this.firestore, 'usuarios');
    return collectionData(usuariosRef, { idField: 'id' }) as Observable<Usuario[]>;
  }
}