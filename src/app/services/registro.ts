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
  id?: string;
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

export interface Usuario {
  id?: string;
  empresaId: string;
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
  empresaId: string;
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
  estado: 'En Turno' | 'En Pausa' | 'Completado' | 'Expirado';
  observacion: string;
  actividades?: ActividadItem[];
  actividadRegistrada?: boolean;
  reporteFinal?: string;
  timestampEntrada?: number;
  codigoQR?: string;
  timestampQR?: number;
  verificadoCamaraMovil?: boolean;
  horaEscaneoQR?: string;
  qrExpiradoSinEscanear?: boolean;
  alertaVistaPorAdmin?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class RegistroService {
  constructor(
    private firestore: Firestore,
    private ngZone: NgZone
  ) {}

  // --- CONFIGURACIÓN AISLADA POR COMPAÑÍA (empresas/{empresaId}) ---
  getEmpresaConfigById(empresaId: string): Observable<Empresa | undefined> {
    return new Observable<Empresa | undefined>((subscriber) => {
      const id = empresaId || 'default_empresa';
      const configDoc = doc(this.firestore, `empresas/${id}`);
      const unsub = onSnapshot(
        configDoc,
        (snap) => {
          this.ngZone.run(() => {
            subscriber.next(snap.exists() ? ({ ...(snap.data() as Empresa), id: snap.id }) : undefined);
          });
        },
        (error) => {
          this.ngZone.run(() => subscriber.error(error));
        }
      );
      return () => unsub();
    });
  }

  async obtenerEmpresaConfigDirecto(empresaId: string): Promise<Empresa | null> {
    try {
      const id = empresaId || 'default_empresa';
      const configDoc = doc(this.firestore, `empresas/${id}`);
      const snap = await getDoc(configDoc);
      return snap.exists() ? ({ ...(snap.data() as Empresa), id: snap.id }) : null;
    } catch (e) {
      console.error('Error leyendo configuración de empresa:', e);
      return null;
    }
  }

  guardarEmpresaConfig(empresaId: string, empresa: Empresa): Promise<void> {
    const id = empresaId || 'default_empresa';
    const configDoc = doc(this.firestore, `empresas/${id}`);
    return setDoc(configDoc, { ...empresa, id }, { merge: true });
  }

  // --- REGISTROS FILTRADOS ÚNICAMENTE PARA LA COMPAÑÍA ACTIVA ---
  getRegistrosByEmpresa(empresaId: string): Observable<Registro[]> {
    return new Observable<Registro[]>((subscriber) => {
      const id = empresaId || 'default_empresa';
      const registrosRef = collection(this.firestore, 'registros');
      const q = query(registrosRef, where('empresaId', '==', id));
      const unsub = onSnapshot(
        q,
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

  async obtenerRegistrosDirecto(empresaId: string): Promise<Registro[]> {
    try {
      const id = empresaId || 'default_empresa';
      const registrosRef = collection(this.firestore, 'registros');
      const q = query(registrosRef, where('empresaId', '==', id));
      const snap = await getDocs(q);
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

  // --- USUARIOS FILTRADOS ÚNICAMENTE PARA LA COMPAÑÍA ACTIVA ---
  getUsuariosByEmpresa(empresaId: string): Observable<Usuario[]> {
    return new Observable<Usuario[]>((subscriber) => {
      const id = empresaId || 'default_empresa';
      const usuariosRef = collection(this.firestore, 'usuarios');
      const q = query(usuariosRef, where('empresaId', '==', id));
      const unsub = onSnapshot(
        q,
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

  async obtenerUsuariosDirecto(empresaId: string): Promise<Usuario[]> {
    try {
      const id = empresaId || 'default_empresa';
      const usuariosRef = collection(this.firestore, 'usuarios');
      const q = query(usuariosRef, where('empresaId', '==', id));
      const snap = await getDocs(q);
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