import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  docData,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  doc,
  query,
  where,
  getDocs
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface Empresa {
  nombre: string;
  sucursal: string;
  ubicacion: string;
  codigo: string;
  horario: string;
  duracionComidaMinutos: number;
  habilitarFormEstudiantes: boolean;
  habilitarReporteHoras: boolean;
  habilitarReporteInformes: boolean;
  habilitarReporteCompleto: boolean;
}

export interface QrKioscoActivo {
  codigo: string;
  timestamp: number;
  generadoPor: string;
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
  empresaNombre?: string;
  sucursal?: string;
  horario?: string;
  telefono?: string;
  matricula?: string;
}

export interface Registro {
  id?: string;
  empleadoId: string;
  empleadoNombre: string;
  puesto: string;
  departamento: string;
  fecha: string;
  mesAno?: string;
  horaEntrada: string;
  horaSalida?: string;
  horaPausaInicio?: string;
  horaPausaFin?: string;
  timestampPausaInicio?: number;
  totalHoras?: string;
  estado: 'En Turno' | 'En Pausa' | 'Completado';
  observacion: string;
  actividadRegistrada?: boolean;
  reporteFinal?: string;
  timestampEntrada?: number;
  codigoQR?: string;
  timestampQR?: number;
  verificadoCamaraMovil?: boolean;
  horaEscaneoQR?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RegistroService {
  constructor(private firestore: Firestore) {}

  getEmpresaConfig(): Observable<Empresa | undefined> {
    const configDoc = doc(this.firestore, 'configuracion/empresa');
    return docData(configDoc) as Observable<Empresa | undefined>;
  }

  guardarEmpresaConfig(empresa: Empresa): Promise<void> {
    const configDoc = doc(this.firestore, 'configuracion/empresa');
    return setDoc(configDoc, empresa, { merge: true });
  }

  getQrKiosco(): Observable<QrKioscoActivo | undefined> {
    const qrDoc = doc(this.firestore, 'configuracion/qr_kiosco');
    return docData(qrDoc) as Observable<QrKioscoActivo | undefined>;
  }

  guardarQrKiosco(qr: QrKioscoActivo): Promise<void> {
    const qrDoc = doc(this.firestore, 'configuracion/qr_kiosco');
    return setDoc(qrDoc, qr);
  }

  getRegistros(): Observable<Registro[]> {
    const registrosRef = collection(this.firestore, 'registros');
    return collectionData(registrosRef, { idField: 'id' }) as Observable<Registro[]>;
  }

  agregarRegistro(registro: Registro) {
    const registrosRef = collection(this.firestore, 'registros');
    const copia = { ...registro };
    delete copia.id;
    return addDoc(registrosRef, copia);
  }

  actualizarRegistro(id: string, data: Partial<Registro>) {
    const registroDoc = doc(this.firestore, `registros/${id}`);
    return updateDoc(registroDoc, data);
  }

  eliminarRegistro(id: string) {
    const registroDoc = doc(this.firestore, `registros/${id}`);
    return deleteDoc(registroDoc);
  }

  getUsuarios(): Observable<Usuario[]> {
    const usuariosRef = collection(this.firestore, 'usuarios');
    return collectionData(usuariosRef, { idField: 'id' }) as Observable<Usuario[]>;
  }

  async registrarUsuario(usuario: Usuario): Promise<any> {
    const usuariosRef = collection(this.firestore, 'usuarios');
    const copia = { ...usuario };
    delete copia.id;
    return addDoc(usuariosRef, copia);
  }

  async buscarUsuarioPorCorreo(correo: string): Promise<Usuario | null> {
    try {
      const usuariosRef = collection(this.firestore, 'usuarios');
      const q = query(usuariosRef, where('correo', '==', correo.trim().toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        return { ...(docSnap.data() as Usuario), id: docSnap.id };
      }
      return null;
    } catch (e) {
      console.error('Error al consultar usuarios en Firestore:', e);
      return null;
    }
  }

  eliminarUsuario(id: string) {
    const usuarioDoc = doc(this.firestore, `usuarios/${id}`);
    return deleteDoc(usuarioDoc);
  }
}