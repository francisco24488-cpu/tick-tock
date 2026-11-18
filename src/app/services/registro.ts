import { Injectable, NgZone } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  doc,
  query,
  where,
  getDocs,
  getDoc,
  onSnapshot
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface Empresa {
  nombre: string;
  sucursal: string;
  ubicacion: string;
  codigo: string;
  horario: string;
  horaInicio?: string;
  horaFin?: string;
  colorTema?: string;
  duracionComidaMinutos: number;
  habilitarFormEstudiantes: boolean;
  habilitarReporteHoras: boolean;
  habilitarReporteInformes: boolean;
  habilitarReporteCompleto: boolean;
  departamentosPersonalizados?: string[];
  emailjsServiceId?: string;
  emailjsTemplateId?: string;
  emailjsPublicKey?: string;
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
  rol: 'estudiante' | 'admin' | string;
  departamento: string;
  avatar: string;
  puesto: string;
  empresaNombre?: string;
  sucursal?: string;
  horario?: string;
  telefono?: string;
  matricula?: string;
  verificadoCorreo?: boolean;
  tokenVerificacion?: string;
  codigoVerificacion?: string;
}

export interface ActividadItem {
  hora: string;
  texto: string;
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
  comidaTerminada?: boolean;
  segundosComidaUsados?: number;
  totalHoras?: string;
  estado: 'En Turno' | 'En Pausa' | 'Completado';
  observacion: string;
  actividades?: ActividadItem[];
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
  constructor(
    private firestore: Firestore,
    private ngZone: NgZone
  ) {}

  // Escucha en tiempo real dentro de NgZone para actualización instantánea en pantalla
  getEmpresaConfig(): Observable<Empresa | undefined> {
    return new Observable<Empresa | undefined>((subscriber) => {
      const configDoc = doc(this.firestore, 'configuracion/empresa');
      const unsub = onSnapshot(
        configDoc,
        (snap) => {
          this.ngZone.run(() => {
            subscriber.next(snap.exists() ? (snap.data() as Empresa) : undefined);
          });
        },
        (error) => {
          this.ngZone.run(() => subscriber.error(error));
        }
      );
      return () => unsub();
    });
  }

  async obtenerEmpresaConfigDirecto(): Promise<Empresa | null> {
    try {
      const configDoc = doc(this.firestore, 'configuracion/empresa');
      const snap = await getDoc(configDoc);
      return snap.exists() ? (snap.data() as Empresa) : null;
    } catch (e) {
      console.error('Error leyendo configuración de empresa:', e);
      return null;
    }
  }

  guardarEmpresaConfig(empresa: Empresa): Promise<void> {
    const configDoc = doc(this.firestore, 'configuracion/empresa');
    return setDoc(configDoc, empresa, { merge: true });
  }

  getQrKiosco(): Observable<QrKioscoActivo | undefined> {
    return new Observable<QrKioscoActivo | undefined>((subscriber) => {
      const qrDoc = doc(this.firestore, 'configuracion/qr_kiosco');
      const unsub = onSnapshot(
        qrDoc,
        (snap) => {
          this.ngZone.run(() => {
            subscriber.next(snap.exists() ? (snap.data() as QrKioscoActivo) : undefined);
          });
        },
        (error) => {
          this.ngZone.run(() => subscriber.error(error));
        }
      );
      return () => unsub();
    });
  }

  async obtenerQrKioscoDirecto(): Promise<QrKioscoActivo | null> {
    try {
      const qrDoc = doc(this.firestore, 'configuracion/qr_kiosco');
      const snap = await getDoc(qrDoc);
      return snap.exists() ? (snap.data() as QrKioscoActivo) : null;
    } catch (e) {
      console.error('Error leyendo QR kiosco:', e);
      return null;
    }
  }

  guardarQrKiosco(qr: QrKioscoActivo): Promise<void> {
    const qrDoc = doc(this.firestore, 'configuracion/qr_kiosco');
    return setDoc(qrDoc, qr);
  }

  getRegistros(): Observable<Registro[]> {
    return new Observable<Registro[]>((subscriber) => {
      const registrosRef = collection(this.firestore, 'registros');
      const unsub = onSnapshot(
        registrosRef,
        (snap) => {
          this.ngZone.run(() => {
            const lista = snap.docs.map((d) => ({ ...(d.data() as Registro), id: d.id }));
            subscriber.next(lista);
          });
        },
        (error) => {
          this.ngZone.run(() => subscriber.error(error));
        }
      );
      return () => unsub();
    });
  }

  async obtenerRegistrosDirecto(): Promise<Registro[]> {
    try {
      const registrosRef = collection(this.firestore, 'registros');
      const snap = await getDocs(registrosRef);
      return snap.docs.map((d) => ({ ...(d.data() as Registro), id: d.id }));
    } catch (e) {
      console.error('Error leyendo registros directo:', e);
      return [];
    }
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
    return new Observable<Usuario[]>((subscriber) => {
      const usuariosRef = collection(this.firestore, 'usuarios');
      const unsub = onSnapshot(
        usuariosRef,
        (snap) => {
          this.ngZone.run(() => {
            const lista = snap.docs.map((d) => ({ ...(d.data() as Usuario), id: d.id }));
            subscriber.next(lista);
          });
        },
        (error) => {
          this.ngZone.run(() => subscriber.error(error));
        }
      );
      return () => unsub();
    });
  }

  async obtenerUsuariosDirecto(): Promise<Usuario[]> {
    try {
      const usuariosRef = collection(this.firestore, 'usuarios');
      const snap = await getDocs(usuariosRef);
      return snap.docs.map((d) => ({ ...(d.data() as Usuario), id: d.id }));
    } catch (e) {
      console.error('Error leyendo usuarios directo:', e);
      return [];
    }
  }

  async registrarUsuario(usuario: Usuario): Promise<any> {
    const usuariosRef = collection(this.firestore, 'usuarios');
    const copia = { ...usuario };
    delete copia.id;
    return addDoc(usuariosRef, copia);
  }

  actualizarUsuario(id: string, data: Partial<Usuario>): Promise<void> {
    const usuarioDoc = doc(this.firestore, `usuarios/${id}`);
    return updateDoc(usuarioDoc, data);
  }

  async verificarUsuarioPorToken(token: string): Promise<Usuario | null> {
    try {
      const usuariosRef = collection(this.firestore, 'usuarios');
      const q = query(usuariosRef, where('tokenVerificacion', '==', token.trim()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        const usuario = { ...(docSnap.data() as Usuario), id: docSnap.id };
        await updateDoc(doc(this.firestore, `usuarios/${docSnap.id}`), {
          verificadoCorreo: true
        });
        usuario.verificadoCorreo = true;
        return usuario;
      }
      return null;
    } catch (e) {
      console.error('Error verificando token de correo:', e);
      return null;
    }
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