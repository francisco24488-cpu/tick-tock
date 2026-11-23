import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { RegistroService, Empresa, Usuario, Registro, ActividadItem } from './services/registro';

export interface EmpresaExtendida extends Empresa {
  maxComidasPorTurno?: number;
  tiempoLimiteTareasMinutos?: number;
  tiempoLimiteQRMinutos?: number;
  habilitarLimiteEntrada?: boolean;
  toleranciaEntradaMinutos?: number;
  permitirMultiplesRegistrosDia?: boolean;
  tipoMiembroOption?: string;
  tipoMiembroSingular?: string;
  tipoMiembroPlural?: string;
}

export interface ComidaItem {
  inicio: string;
  fin?: string;
  segundos?: number;
}

export interface RegistroExtendido extends Registro {
  comidasRealizadas?: number;
  historialComidas?: ComidaItem[];
  minutosComidaAsignados?: number;
  comidaExpiradaSinRegresar?: boolean;
  alertaComidaVistaPorAdmin?: boolean;
  timestampTareaInicio?: number;
  tareaExpiradaSinRegistrar?: boolean;
  alertaTareaVistaPorAdmin?: boolean;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
  encapsulation: ViewEncapsulation.None
})
export class App implements OnInit, OnDestroy {
  // Claves globales de EmailJS (cuenta soporte.ticktock@gmail.com)
  private readonly EMAILJS_SERVICE_ID = 'service_008th9q';
  private readonly EMAILJS_TEMPLATE_ID = 'template_ota0ucm';
  private readonly EMAILJS_PUBLIC_KEY = 'Oyqn5xRif_jnlnDNw';

  // =========================================================================
  // 🔗 PEGA AQUÍ LOS LINKS DE TUS DOCUMENTOS (Google Drive, PDF, Docs, etc.)
  // =========================================================================
  readonly LINK_MANUAL_ADMIN = 'https://njvwasjgrqepkiulxyxe.supabase.co/storage/v1/object/public/Manual%20de%20Usuario/Manual%20de%20Usuario%20-%20Perfil%20Administrador%20y%20Encargado.md.pdf';
  readonly LINK_MANUAL_USUARIO = 'https://njvwasjgrqepkiulxyxe.supabase.co/storage/v1/object/public/Manual%20de%20Usuario/Manual%20de%20Usuario%20-%20Perfil%20Estudiante%20y%20Empleado.md.pdf';
  readonly LINK_INFORME_APLICACION = 'https://njvwasjgrqepkiulxyxe.supabase.co/storage/v1/object/public/Informe/Informe%20de%20Prototipo.pdfhttps://PEGA_AQUI_LINK_INFORME_APLICACION';

  pantallaActual: 'bienvenida' | 'login' | 'registro' | 'dashboard' = 'bienvenida';
  tabAuth: 'login' | 'registro' = 'login';

  usuarioActual: Usuario | null = null;
  sesionIniciada: boolean = false;
  empresaActualId: string = '';

  empresa: EmpresaExtendida = {
    nombre: 'TickTock Asistencia',
    sucursal: '',
    ubicacion: '',
    codigo: 'TT-2026',
    horario: '',
    horaInicio: '',
    horaFin: '',
    colorTema: '#f97316',
    duracionComidaMinutos: 45,
    maxComidasPorTurno: 1,
    tiempoLimiteTareasMinutos: 10,
    tiempoLimiteQRMinutos: 15,
    habilitarLimiteEntrada: false,
    toleranciaEntradaMinutos: 20,
    permitirMultiplesRegistrosDia: true,
    habilitarFormEstudiantes: true,
    habilitarReporteHoras: true,
    habilitarReporteInformes: true,
    habilitarReporteCompleto: true,
    departamentosPersonalizados: []
  };

  // Selector dinámico de cómo llamar a los registros (Alumnos, Empleados, Compañeros, etc.)
  tipoMiembroOption: string = 'Empleados';
  tipoMiembroSingularCustom: string = '';
  tipoMiembroPluralCustom: string = '';

  readonly opcionesTipoMiembro = [
    { id: 'Empleados', singular: 'Empleado', plural: 'Empleados' },
    { id: 'Alumnos', singular: 'Alumno', plural: 'Alumnos' },
    { id: 'Estudiantes', singular: 'Estudiante', plural: 'Estudiantes' },
    { id: 'Compañeros', singular: 'Compañero', plural: 'Compañeros' },
    { id: 'Colaboradores', singular: 'Colaborador', plural: 'Colaboradores' },
    { id: 'Practicantes', singular: 'Practicante', plural: 'Practicantes' },
    { id: 'Personal', singular: 'Integrante', plural: 'Personal' }
  ];

  readonly minutosRapidos = ['00', '05', '10', '15', '20', '30', '45'];

  // Variables del editor táctil de horario en Configuración
  cfgInicioHora: string = '';
  cfgInicioMin: string = '00';
  cfgInicioAmPm: 'AM' | 'PM' = 'AM';
  cfgFinHora: string = '';
  cfgFinMin: string = '00';
  cfgFinAmPm: 'AM' | 'PM' = 'PM';

  // Variables del editor táctil de horario en Registro de Compañía
  regInicioHora: string = '';
  regInicioMin: string = '00';
  regInicioAmPm: 'AM' | 'PM' = 'AM';
  regFinHora: string = '';
  regFinMin: string = '00';
  regFinAmPm: 'AM' | 'PM' = 'PM';

  temasDisponibles = [
    { nombre: 'Naranja Vibrante', hex: '#f97316' },
    { nombre: 'Azul Cielo', hex: '#2563eb' },
    { nombre: 'Morado Índigo', hex: '#7c3aed' },
    { nombre: 'Rosa Coral', hex: '#e11d48' },
    { nombre: 'Verde Turquesa', hex: '#0d9488' }
  ];

  departamentosBase = [
    'General',
    'Administración',
    'Desarrollo & TI',
    'Operaciones',
    'Ventas & Marketing',
    'Servicio Social',
    'Recursos Humanos',
    'Contabilidad y Finanzas',
    'Diseño y Comunicación',
    'Soporte Técnico',
    'Logística'
  ];

  // Formularios Auth (Registro exclusivo para Compañías)
  formCorreo: string = '';
  formPassword: string = '';
  formNombre: string = '';
  formDepartamento: string = 'Administración';
  formDepartamentoPersonalizado: string = '';
  formAvatar: string = '🏢';
  formEmpresaNombre: string = '';
  formSucursal: string = '';
  formUbicacion: string = '';
  formHoraInicio: string = '';
  formHoraFin: string = '';
  formTelefono: string = '';
  formTipoMiembroOption: string = 'Empleados';
  formTipoMiembroSingularCustom: string = '';
  formTipoMiembroPluralCustom: string = '';

  // Control de visibilidad de contraseñas (ojito)
  verPassLogin: boolean = false;
  verPassRegistro: boolean = false;
  verPassNuevoAlumno: boolean = false;
  verPassEditarAlumno: boolean = false;

  // Modal Nuevo Registro / Miembro (Admin)
  mostrarModalNuevoEstudiante: boolean = false;
  adminNuevoNombre: string = '';
  adminNuevoCorreo: string = '';
  adminNuevoPassword: string = '';
  adminNuevoDept: string = 'General';
  adminNuevoDeptPersonalizado: string = '';
  adminNuevoAvatar: string = '🧑‍💻';
  adminNuevoTel: string = '';
  adminNuevoMatricula: string = '';

  // Modal Editar Miembro (Admin)
  mostrarModalEditarEstudiante: boolean = false;
  editEstudianteId: string = '';
  editEstudianteNombre: string = '';
  editEstudianteMatricula: string = '';
  editEstudianteCorreo: string = '';
  editEstudianteTelefono: string = '';
  editEstudianteDept: string = 'General';
  editEstudianteDeptPersonalizado: string = '';
  editEstudiantePassword: string = '';

  // Modal Información, Manuales e Informe de Aplicación
  mostrarModalDocumentos: boolean = false;

  // Verificación de 2 Pasos por Gmail con código
  mostrarModalVerificacionGmail: boolean = false;
  usuarioPendienteVerificacion: Usuario | null = null;
  codigoVerificacionIngresado: string = '';
  enviandoCorreoGmail: boolean = false;
  correoEnviadoExito: boolean = false;
  errorEnvioGmail: string = '';
  mensajeExitoVerificacionLink: string = '';

  // QR & Cámara Real
  mostrarModalQR: boolean = false;
  mostrarModalCamaraMovil: boolean = false;
  codigoGeneradoQR: string = '';
  qrImagenUrl: string = '';
  timestampQRGenerado: number = 0;
  private procesandoExpiracionQR: boolean = false;
  private procesandoExpiracionComida: boolean = false;
  private procesandoExpiracionTarea: boolean = false;

  codigoEscaneadoManual: string = '';
  escaneandoCamara: boolean = false;
  validandoQR: boolean = false;
  estadoCamaraTexto: string = 'Iniciando cámara...';
  errorModalEscaner: string = '';
  private mediaStream: MediaStream | null = null;
  private scanLoopId: any = null;

  // Cronómetros en Vivo
  tiempoRestanteQR: number = 0;
  tiempoRestanteActividad: number = 0;
  tiempoRestantePausa: number = 0;
  tiempoRestanteToleranciaEntrada: number = 0;
  estadoToleranciaEntrada: 'DESHABILITADO' | 'ANTES' | 'EN_TOLERANCIA' | 'EXPIRADO' = 'DESHABILITADO';
  private avisoComida2MinDado: boolean = false;
  private avisoComida1MinDado: boolean = false;

  usuariosSistema: Usuario[] = [];
  registros: RegistroExtendido[] = [];

  observacionActual: string = '';
  cargandoAccion: boolean = false;

  mostrarModalSalida: boolean = false;
  mostrarModalEmpresa: boolean = false;
  reporteFinalTexto: string = '';

  // Filtros Admin
  busquedaAlumnoAdmin: string = '';
  busquedaEmpleado: string = '';
  filtroEstado: string = 'TODOS';
  mesFiltroReporte: string = new Date().toISOString().substring(0, 7);

  relojHora: string = '00:00:00';
  relojAmPm: string = 'AM';
  relojFecha: string = '';
  private masterTimerId: any;
  private subsEmpresa: Subscription[] = [];

  mostrarToast: boolean = false;
  mensajeToast: string = '';
  tipoToast: 'exito' | 'alerta' | 'info' = 'exito';

  constructor(
    private registroService: RegistroService,
    private cdr: ChangeDetectorRef
  ) {}

  // --- GESTIÓN DEL MODAL DE INFORMACIÓN, MANUALES E INFORME ---
  get linkManualSegunRol(): string {
    return this.usuarioActual?.rol === 'admin'
      ? this.LINK_MANUAL_ADMIN
      : this.LINK_MANUAL_USUARIO;
  }

  abrirModalDocumentos(): void {
    this.mostrarModalDocumentos = true;
    this.cdr.detectChanges();
  }

  cerrarModalDocumentos(): void {
    this.mostrarModalDocumentos = false;
    this.cdr.detectChanges();
  }

  verificarLinkDocumento(event: Event, url: string, nombreDoc: string): void {
    if (!url || url.includes('PEGA_AQUI_LINK')) {
      event.preventDefault();
      this.notificar(`⚠️ Aún no se ha configurado el link de "${nombreDoc}" en app.ts`, 'alerta');
      return;
    }
    this.mostrarModalDocumentos = false;
    this.cdr.detectChanges();
  }

  // --- EDITOR TÁCTIL DE HORAS AM / PM ---
  private descomponerHoraTexto(texto?: string): { hora: string; min: string; ampm: 'AM' | 'PM' } {
    if (!texto || !texto.trim()) {
      return { hora: '', min: '00', ampm: 'AM' };
    }
    const m = texto.trim().match(/(\d{1,2}):(\d{2})\s*(?:de la\s+|del\s+)?(am|pm|mañana|mediodía|mediodia|tarde|noche)?/i);
    if (!m) return { hora: '', min: '00', ampm: 'AM' };

    let h = parseInt(m[1], 10);
    const min = m[2].padStart(2, '0');
    const per = (m[3] || '').toLowerCase();
    let ampm: 'AM' | 'PM' = 'AM';

    if (per === 'pm' || per === 'tarde' || per === 'noche') {
      ampm = 'PM';
      if (h > 12) h -= 12;
      if (h === 0) h = 12;
    } else if (per === 'mediodía' || per === 'mediodia') {
      ampm = 'PM';
      h = 12;
    } else if (per === 'am' || per === 'mañana') {
      ampm = 'AM';
      if (h === 0 || h > 12) h = 12;
    } else {
      if (h >= 12) {
        ampm = 'PM';
        if (h > 12) h -= 12;
      } else if (h === 0) {
        h = 12;
      }
    }

    return {
      hora: h.toString().padStart(2, '0'),
      min,
      ampm
    };
  }

  private formatearHoraAmPm(hora: string, min: string, ampm: 'AM' | 'PM'): string {
    const hDigits = (hora || '').replace(/\D/g, '');
    if (!hDigits) return '';
    let hNum = parseInt(hDigits, 10);
    if (isNaN(hNum) || hNum < 1) hNum = 1;
    if (hNum > 12) hNum = 12;

    const mDigits = (min || '00').replace(/\D/g, '');
    let mNum = parseInt(mDigits || '0', 10);
    if (isNaN(mNum) || mNum < 0) mNum = 0;
    if (mNum > 59) mNum = 59;

    return `${hNum.toString().padStart(2, '0')}:${mNum.toString().padStart(2, '0')} ${ampm}`;
  }

  sincronizarHorarioConfig(): void {
    this.empresa.horaInicio = this.formatearHoraAmPm(this.cfgInicioHora, this.cfgInicioMin, this.cfgInicioAmPm);
    this.empresa.horaFin = this.formatearHoraAmPm(this.cfgFinHora, this.cfgFinMin, this.cfgFinAmPm);
  }

  seleccionarMinutoConfig(cual: 'inicio' | 'fin', min: string): void {
    if (cual === 'inicio') {
      if (!this.cfgInicioHora) this.cfgInicioHora = '08';
      this.cfgInicioMin = min;
    } else {
      if (!this.cfgFinHora) this.cfgFinHora = '05';
      this.cfgFinMin = min;
    }
    this.sincronizarHorarioConfig();
  }

  cambiarAmPmConfig(cual: 'inicio' | 'fin', ampm: 'AM' | 'PM'): void {
    if (cual === 'inicio') {
      this.cfgInicioAmPm = ampm;
    } else {
      this.cfgFinAmPm = ampm;
    }
    this.sincronizarHorarioConfig();
  }

  limpiarHoraConfig(cual: 'inicio' | 'fin'): void {
    if (cual === 'inicio') {
      this.cfgInicioHora = '';
      this.cfgInicioMin = '00';
      this.empresa.horaInicio = '';
    } else {
      this.cfgFinHora = '';
      this.cfgFinMin = '00';
      this.empresa.horaFin = '';
    }
  }

  sincronizarHorarioRegistro(): void {
    this.formHoraInicio = this.formatearHoraAmPm(this.regInicioHora, this.regInicioMin, this.regInicioAmPm);
    this.formHoraFin = this.formatearHoraAmPm(this.regFinHora, this.regFinMin, this.regFinAmPm);
  }

  seleccionarMinutoRegistro(cual: 'inicio' | 'fin', min: string): void {
    if (cual === 'inicio') {
      if (!this.regInicioHora) this.regInicioHora = '08';
      this.regInicioMin = min;
    } else {
      if (!this.regFinHora) this.regFinHora = '05';
      this.regFinMin = min;
    }
    this.sincronizarHorarioRegistro();
  }

  cambiarAmPmRegistro(cual: 'inicio' | 'fin', ampm: 'AM' | 'PM'): void {
    if (cual === 'inicio') {
      this.regInicioAmPm = ampm;
    } else {
      this.regFinAmPm = ampm;
    }
    this.sincronizarHorarioRegistro();
  }

  // --- ETIQUETAS DINÁMICAS (ALUMNO / EMPLEADO / COMPAÑERO / PERSONALIZADO) ---
  get etiquetaSingular(): string {
    if (this.tipoMiembroOption === '__OTRO__') {
      return this.tipoMiembroSingularCustom.trim() || 'Integrante';
    }
    const found = this.opcionesTipoMiembro.find(o => o.id === this.tipoMiembroOption);
    return found ? found.singular : 'Empleado';
  }

  get etiquetaPlural(): string {
    if (this.tipoMiembroOption === '__OTRO__') {
      return this.tipoMiembroPluralCustom.trim() || 'Integrantes';
    }
    const found = this.opcionesTipoMiembro.find(o => o.id === this.tipoMiembroOption);
    return found ? found.plural : 'Empleados';
  }

  async cambiarTipoMiembroRapido(nuevaOpcion: string): Promise<void> {
    this.tipoMiembroOption = nuevaOpcion;
    if (nuevaOpcion !== '__OTRO__') {
      await this.guardarTipoMiembroEnNube(true);
    }
    this.cdr.detectChanges();
  }

  async guardarTipoMiembroEnNube(mostrarAviso: boolean = true): Promise<void> {
    if (!this.empresaActualId) return;
    this.empresa.tipoMiembroOption = this.tipoMiembroOption;
    this.empresa.tipoMiembroSingular = this.etiquetaSingular;
    this.empresa.tipoMiembroPlural = this.etiquetaPlural;

    try {
      await this.registroService.guardarEmpresaConfig(this.empresaActualId, this.empresa);
      if (mostrarAviso) {
        this.notificar(`🏷️ Tipo de registro actualizado a "${this.etiquetaPlural}"`, 'exito');
      }
    } catch (e) {
      console.error('Error guardando tipo de miembro:', e);
    }
  }

  // Botón rápido para activar/desactivar el cronómetro de tolerancia de hora de entrada
  async toggleRapidoLimiteEntrada(): Promise<void> {
    if (!this.empresaActualId) return;
    const nuevoValor = !this.empresa.habilitarLimiteEntrada;

    if (nuevoValor && !this.empresa.horaInicio) {
      this.notificar('⚠️ Primero configura una Hora de Inicio en ⚙️ Configuración', 'alerta');
      this.abrirModalEmpresa();
      return;
    }

    this.empresa.habilitarLimiteEntrada = nuevoValor;
    this.recalcularCronometros();
    this.cdr.detectChanges();

    try {
      await this.registroService.guardarEmpresaConfig(this.empresaActualId, this.empresa);
      this.notificar(
        nuevoValor
          ? `⏱️ Límite de entrada ACTIVADO (${this.empresa.horaInicio} + ${this.empresa.toleranciaEntradaMinutos || 20} min)`
          : '🔓 Límite de hora de entrada DESACTIVADO (pueden marcar a cualquier hora)',
        nuevoValor ? 'exito' : 'info'
      );
    } catch (e) {
      console.error('Error cambiando límite de entrada:', e);
    }
  }

  get listaDepartamentosCompleta(): string[] {
    const personalizados = this.empresa.departamentosPersonalizados || [];
    const combinados = [...this.departamentosBase, ...personalizados];
    return Array.from(new Set(combinados.filter(d => d && d.trim().length > 0)));
  }

  ngOnInit(): void {
    this.cargarLibreriasQR();
    this.aplicarVariablesGlobalesCSS('#f97316');
    this.cargarSesionGuardada();
    this.iniciarRelojYCronometros();
    this.procesarEnlaceVerificacionGmail();
  }

  ngOnDestroy(): void {
    if (this.masterTimerId) clearInterval(this.masterTimerId);
    this.limpiarSuscripcionesEmpresa();
    this.detenerCamara();
  }

  private limpiarSuscripcionesEmpresa(): void {
    this.subsEmpresa.forEach(s => s.unsubscribe());
    this.subsEmpresa = [];
  }

  // --- CONECTAR EXCLUSIVAMENTE A LA BASE DE DATOS DE LA COMPAÑÍA DEL USUARIO ---
  private suscribirDatosDeEmpresa(empresaId: string): void {
    this.limpiarSuscripcionesEmpresa();
    this.empresaActualId = empresaId || 'default_empresa';
    this.usuariosSistema = [];
    this.registros = [];

    const subCfg = this.registroService.getEmpresaConfigById(this.empresaActualId).subscribe({
      next: (cfg) => {
        if (cfg) {
          this.aplicarConfiguracionRecibida(cfg);
        } else if (this.usuarioActual?.empresaNombre) {
          this.empresa.nombre = this.usuarioActual.empresaNombre;
          this.empresa.sucursal = this.usuarioActual.sucursal || '';
          this.empresa.horario = this.usuarioActual.horario || '';
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.error('Error config empresa:', err)
    });

    const subReg = this.registroService.getRegistrosByEmpresa(this.empresaActualId).subscribe({
      next: (data: Registro[]) => {
        const previoVerificado = this.registroActivo?.verificadoCamaraMovil;
        this.registros = (data || []).sort((a, b) => (b.timestampEntrada || 0) - (a.timestampEntrada || 0));
        const actualVerificado = this.registroActivo?.verificadoCamaraMovil;

        if (!previoVerificado && actualVerificado && this.mostrarModalQR) {
          this.mostrarModalQR = false;
          this.notificar(`✅ ¡Código QR escaneado a las ${this.registroActivo?.horaEscaneoQR}!`, 'exito');
        }

        this.recalcularCronometros();
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error('Error registros:', err)
    });

    const subUsr = this.registroService.getUsuariosByEmpresa(this.empresaActualId).subscribe({
      next: (data: Usuario[]) => {
        this.usuariosSistema = data || [];

        // Expulsión automática en tiempo real si el administrador eliminó este usuario
        if (
          this.sesionIniciada &&
          this.usuarioActual &&
          this.usuarioActual.rol !== 'admin' &&
          data &&
          data.length > 0
        ) {
          const emailActual = (this.usuarioActual.correo || '').toLowerCase();
          const idActual = this.usuarioActual.id;
          const sigueExistiendo = data.some(u =>
            (idActual && u.id === idActual) ||
            ((u.correo || '').toLowerCase() === emailActual)
          );

          if (!sigueExistiendo) {
            this.cerrarSesion('⛔ Tu cuenta fue eliminada por el administrador. Inicia sesión nuevamente.');
            return;
          }
        }

        if (this.mostrarModalVerificacionGmail && this.usuarioPendienteVerificacion) {
          const actualizado = this.usuariosSistema.find(
            u => u.correo.toLowerCase() === this.usuarioPendienteVerificacion!.correo.toLowerCase()
          );
          if (actualizado && actualizado.verificadoCorreo) {
            this.mostrarModalVerificacionGmail = false;
            const eraAutoregistro = !this.sesionIniciada;
            this.usuarioPendienteVerificacion = null;
            this.notificar('✅ ¡Correo verificado en Gmail! Cuenta activada.', 'exito');
            if (eraAutoregistro) {
              this.iniciarSesionUsuario(actualizado);
            }
          }
        }

        this.cdr.detectChanges();
      },
      error: (err: any) => console.error('Error usuarios:', err)
    });

    this.subsEmpresa.push(subCfg, subReg, subUsr);
  }

  // --- PROCESAR ENLACE DE VERIFICACIÓN EN 2 PASOS DESDE GMAIL ("Sí, soy yo") ---
  private async procesarEnlaceVerificacionGmail(): Promise<void> {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('verificar');
    if (!token) return;

    window.history.replaceState({}, document.title, window.location.pathname);

    const verificado = await this.registroService.verificarUsuarioPorToken(token);
    if (verificado) {
      this.mensajeExitoVerificacionLink = `✅ ¡Identidad confirmada! El correo ${verificado.correo} ha sido verificado correctamente.`;
      this.notificar(`✅ Correo ${verificado.correo} verificado`, 'exito');
      if (!this.sesionIniciada) {
        this.iniciarSesionUsuario(verificado);
      }
      this.cdr.detectChanges();
    } else {
      this.notificar('⚠️ El enlace de verificación no es válido o ya expiró', 'alerta');
    }
  }

  // --- GESTIÓN DE COLORES POR COMPAÑÍA EN TIEMPO REAL ---
  get temaEstilos(): { [key: string]: string } {
    const primary = this.empresa.colorTema || '#f97316';
    const dark = this.oscurecerHex(primary, 18);
    return {
      '--primary': primary,
      '--primary-dark': dark,
      '--primary-soft': `${primary}16`,
      '--primary-border': `${primary}48`
    };
  }

  private aplicarVariablesGlobalesCSS(hex: string): void {
    const color = hex || '#f97316';
    const dark = this.oscurecerHex(color, 18);
    const root = document.documentElement;
    root.style.setProperty('--primary', color);
    root.style.setProperty('--primary-dark', dark);
    root.style.setProperty('--primary-soft', `${color}16`);
    root.style.setProperty('--primary-border', `${color}48`);
  }

  private aplicarConfiguracionRecibida(cfg: any): void {
    this.empresa = {
      ...this.empresa,
      ...cfg,
      colorTema: cfg.colorTema || '#f97316',
      duracionComidaMinutos: cfg.duracionComidaMinutos !== undefined ? Number(cfg.duracionComidaMinutos) : 45,
      maxComidasPorTurno: cfg.maxComidasPorTurno !== undefined ? Number(cfg.maxComidasPorTurno) : 1,
      tiempoLimiteTareasMinutos: cfg.tiempoLimiteTareasMinutos !== undefined ? Number(cfg.tiempoLimiteTareasMinutos) : 10,
      tiempoLimiteQRMinutos: cfg.tiempoLimiteQRMinutos !== undefined ? Number(cfg.tiempoLimiteQRMinutos) : 15,
      habilitarLimiteEntrada: cfg.habilitarLimiteEntrada !== undefined ? Boolean(cfg.habilitarLimiteEntrada) : false,
      toleranciaEntradaMinutos: cfg.toleranciaEntradaMinutos !== undefined ? Number(cfg.toleranciaEntradaMinutos) : 20,
      permitirMultiplesRegistrosDia: cfg.permitirMultiplesRegistrosDia !== undefined ? Boolean(cfg.permitirMultiplesRegistrosDia) : true,
      departamentosPersonalizados: cfg.departamentosPersonalizados || []
    };

    const ini = this.descomponerHoraTexto(this.empresa.horaInicio);
    this.cfgInicioHora = ini.hora;
    this.cfgInicioMin = ini.min;
    this.cfgInicioAmPm = ini.ampm;

    const fin = this.descomponerHoraTexto(this.empresa.horaFin);
    this.cfgFinHora = fin.hora;
    this.cfgFinMin = fin.min;
    this.cfgFinAmPm = fin.ampm;

    if (cfg.tipoMiembroOption) {
      this.tipoMiembroOption = cfg.tipoMiembroOption;
      if (cfg.tipoMiembroOption === '__OTRO__') {
        this.tipoMiembroSingularCustom = cfg.tipoMiembroSingular || '';
        this.tipoMiembroPluralCustom = cfg.tipoMiembroPlural || '';
      }
    }

    this.aplicarVariablesGlobalesCSS(this.empresa.colorTema!);
    this.recalcularCronometros();
    this.cdr.detectChanges();
  }

  private oscurecerHex(hex: string, porcentaje: number): string {
    const clean = hex.replace('#', '');
    if (clean.length !== 6) return '#ea580c';
    const num = parseInt(clean, 16);
    const amt = Math.round(2.55 * porcentaje);
    const r = Math.max(0, Math.min(255, (num >> 16) - amt));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) - amt));
    const b = Math.max(0, Math.min(255, (num & 0x0000ff) - amt));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  seleccionarColorEnModal(hex: string): void {
    this.empresa.colorTema = hex;
    this.aplicarVariablesGlobalesCSS(hex);
    this.cdr.detectChanges();
  }

  async cambiarColorTemaRapido(hex: string): Promise<void> {
    if (!this.empresaActualId) return;
    this.empresa.colorTema = hex;
    this.aplicarVariablesGlobalesCSS(hex);
    this.cdr.detectChanges();

    try {
      await this.registroService.guardarEmpresaConfig(this.empresaActualId, this.empresa);
      this.notificar('🎨 Color actualizado al instante para tu compañía', 'exito');
    } catch (e) {
      console.error('Error guardando color en Firebase:', e);
      this.notificar('⚠️ Color aplicado localmente, revisa conexión', 'alerta');
    }
  }

  private async registrarDepartamentoSiEsNuevo(nombreDepto: string): Promise<void> {
    const limpio = nombreDepto.trim();
    if (!limpio || !this.empresaActualId) return;
    const existe = this.listaDepartamentosCompleta.some(d => d.toLowerCase() === limpio.toLowerCase());
    if (!existe) {
      const actuales = this.empresa.departamentosPersonalizados || [];
      this.empresa.departamentosPersonalizados = [...actuales, limpio];
      try {
        await this.registroService.guardarEmpresaConfig(this.empresaActualId, this.empresa);
      } catch (e) {
        console.error('Error guardando departamento personalizado:', e);
      }
    }
  }

  async recargarDatosDesdeNube(mostrarAviso: boolean = true): Promise<void> {
    if (!this.empresaActualId) return;
    try {
      const [cfgNube, usuarios, registros] = await Promise.all([
        this.registroService.obtenerEmpresaConfigDirecto(this.empresaActualId),
        this.registroService.obtenerUsuariosDirecto(this.empresaActualId),
        this.registroService.obtenerRegistrosDirecto(this.empresaActualId)
      ]);

      if (cfgNube) {
        this.aplicarConfiguracionRecibida(cfgNube);
      }
      this.usuariosSistema = usuarios;
      this.registros = registros.sort((a, b) => (b.timestampEntrada || 0) - (a.timestampEntrada || 0));

      this.recalcularCronometros();
      this.cdr.detectChanges();
      if (mostrarAviso) {
        this.notificar(`🔄 Datos sincronizados (${this.totalEstudiantes} ${this.etiquetaPlural.toLowerCase()})`, 'info');
      }
    } catch (e) {
      console.error('Error sincronizando datos:', e);
    }
  }

  private cargarLibreriasQR(): void {
    if (!(window as any).jsQR && !document.getElementById('jsqr-script')) {
      const script = document.createElement('script');
      script.id = 'jsqr-script';
      script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
      script.async = true;
      document.head.appendChild(script);
    }
    if (!(window as any).QRCode && !document.getElementById('qrcode-gen-script')) {
      const scriptGen = document.createElement('script');
      scriptGen.id = 'qrcode-gen-script';
      scriptGen.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js';
      scriptGen.async = true;
      document.head.appendChild(scriptGen);
    }
  }

  private iniciarRelojYCronometros(): void {
    const tick = () => {
      const ahora = new Date();
      this.relojFecha = ahora.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      let horas = ahora.getHours();
      const mins = ahora.getMinutes().toString().padStart(2, '0');
      const segs = ahora.getSeconds().toString().padStart(2, '0');
      this.relojAmPm = horas >= 12 ? 'PM' : 'AM';
      horas = horas % 12 || 12;
      this.relojHora = `${horas.toString().padStart(2, '0')}:${mins}:${segs}`;

      this.recalcularCronometros();
      this.cdr.detectChanges();
    };

    tick();
    this.masterTimerId = setInterval(tick, 1000);
  }

  // Convierte textos como "05:05 AM", "02:15 PM" o "2:00 de la tarde" a objeto Date de hoy
  private parsearHoraInicioHoy(horaStr?: string): Date | null {
    if (!horaStr) return null;
    const match = horaStr.trim().match(/(\d{1,2}):(\d{2})\s*(?:de la\s+|del\s+)?(mañana|mediodía|mediodia|tarde|noche|am|pm)?/i);
    if (!match) return null;

    let horas = parseInt(match[1], 10);
    const minutos = parseInt(match[2], 10);
    const periodo = (match[3] || '').toLowerCase();

    if (periodo === 'tarde' || periodo === 'noche' || periodo === 'pm') {
      if (horas < 12) horas += 12;
    } else if (periodo === 'mañana' || periodo === 'am') {
      if (horas === 12) horas = 0;
    } else if (periodo === 'mediodía' || periodo === 'mediodia') {
      horas = 12;
    }

    const ahora = new Date();
    return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), horas, minutos, 0, 0);
  }

  // --- CRONÓMETROS EN VIVO (QR, TAREAS, COMIDA Y TOLERANCIA DE ENTRADA) ---
  private recalcularCronometros(): void {
    const ahoraMs = Date.now();
    const reg = this.registroActivo;

    // 1. Cronómetro dinámico de QR (al llegar a 0 bota/cancela turno)
    const limiteQRSegs = Math.max(1, Number(this.empresa.tiempoLimiteQRMinutos) || 15) * 60;
    const refQrTs = this.mostrarModalQR && this.timestampQRGenerado
      ? this.timestampQRGenerado
      : (reg?.timestampQR || reg?.timestampEntrada || 0);

    if (reg && !reg.verificadoCamaraMovil && refQrTs > 0) {
      const restQR = limiteQRSegs - Math.floor((ahoraMs - refQrTs) / 1000);
      this.tiempoRestanteQR = restQR > 0 ? restQR : 0;

      if (restQR <= 0 && !this.procesandoExpiracionQR) {
        this.procesandoExpiracionQR = true;
        this.ejecutarExpiracionTurnoPorQR(reg);
        return;
      }
    } else {
      this.tiempoRestanteQR = 0;
    }

    // 2. Cronómetro dinámico de COMIDA (al llegar a 0 bota/cierra turno y avisa al Admin)
    if (reg && reg.estado === 'En Pausa' && reg.timestampPausaInicio) {
      const minsComida = reg.minutosComidaAsignados || Math.max(1, Number(this.empresa.duracionComidaMinutos) || 45);
      const totalSegsComida = minsComida * 60;
      const restPausa = totalSegsComida - Math.floor((ahoraMs - reg.timestampPausaInicio) / 1000);
      this.tiempoRestantePausa = restPausa > 0 ? restPausa : 0;

      if (this.tiempoRestantePausa === 120 && !this.avisoComida2MinDado) {
        this.avisoComida2MinDado = true;
        this.notificar('⏰ ¡Faltan 2 MINUTOS para terminar tu tiempo de comida!', 'alerta');
      } else if (this.tiempoRestantePausa === 60 && !this.avisoComida1MinDado) {
        this.avisoComida1MinDado = true;
        this.notificar('⚠️ ¡Falta 1 MINUTO! Prepárate para presionar Terminar Comida.', 'alerta');
      }

      if (restPausa <= 0 && !this.procesandoExpiracionComida) {
        this.procesandoExpiracionComida = true;
        this.ejecutarExpiracionTurnoPorComida(reg);
        return;
      }
    } else {
      this.tiempoRestantePausa = 0;
      this.avisoComida2MinDado = false;
      this.avisoComida1MinDado = false;
    }

    // 3. Cronómetro dinámico de ACTIVIDADES / TAREAS (al llegar a 0 bota/cierra turno y avisa al Admin)
    const limiteTareasSegs = Math.max(1, Number(this.empresa.tiempoLimiteTareasMinutos) || 10) * 60;
    const refTareaTs = reg ? (reg.timestampTareaInicio || reg.timestampEntrada || 0) : 0;

    if (reg && !this.esActividadRegistrada(reg) && refTareaTs > 0) {
      const restAct = limiteTareasSegs - Math.floor((ahoraMs - refTareaTs) / 1000);
      this.tiempoRestanteActividad = restAct > 0 ? restAct : 0;

      if (restAct <= 0 && !this.procesandoExpiracionTarea) {
        this.procesandoExpiracionTarea = true;
        this.ejecutarExpiracionTurnoPorTarea(reg);
        return;
      }
    } else {
      this.tiempoRestanteActividad = 0;
    }

    // 4. Cronómetro de tolerancia para marcar entrada según horario
    if (this.empresa.habilitarLimiteEntrada && this.empresa.horaInicio) {
      const horaInicioDate = this.parsearHoraInicioHoy(this.empresa.horaInicio);
      if (horaInicioDate) {
        const inicioMs = horaInicioDate.getTime();
        const toleranciaMs = Math.max(1, Number(this.empresa.toleranciaEntradaMinutos) || 20) * 60 * 1000;
        const limiteMs = inicioMs + toleranciaMs;

        if (ahoraMs < inicioMs) {
          this.estadoToleranciaEntrada = 'ANTES';
          this.tiempoRestanteToleranciaEntrada = 0;
        } else if (ahoraMs <= limiteMs) {
          this.estadoToleranciaEntrada = 'EN_TOLERANCIA';
          this.tiempoRestanteToleranciaEntrada = Math.max(0, Math.floor((limiteMs - ahoraMs) / 1000));
        } else {
          this.estadoToleranciaEntrada = 'EXPIRADO';
          this.tiempoRestanteToleranciaEntrada = 0;
        }
      } else {
        this.estadoToleranciaEntrada = 'DESHABILITADO';
        this.tiempoRestanteToleranciaEntrada = 0;
      }
    } else {
      this.estadoToleranciaEntrada = 'DESHABILITADO';
      this.tiempoRestanteToleranciaEntrada = 0;
    }
  }

  private async ejecutarExpiracionTurnoPorQR(reg: RegistroExtendido): Promise<void> {
    try {
      const minsQR = Number(this.empresa.tiempoLimiteQRMinutos) || 15;
      const horaLimiteStr = new Date().toLocaleTimeString('es-ES');
      const motivoExpiracion = `⛔ Entrada cancelada: No escaneó el QR dentro de los ${minsQR} minutos reglamentarios`;

      reg.estado = 'Expirado';
      reg.qrExpiradoSinEscanear = true;
      reg.alertaVistaPorAdmin = false;
      reg.horaSalida = horaLimiteStr;
      reg.totalHoras = 'Anulado (QR Expirado)';
      reg.observacion = motivoExpiracion;

      this.mostrarModalQR = false;
      this.detenerCamara();

      const idReal = await this.obtenerIdRealRegistro(reg);
      if (idReal) {
        await this.registroService.actualizarRegistro(idReal, {
          estado: 'Expirado',
          qrExpiradoSinEscanear: true,
          alertaVistaPorAdmin: false,
          horaSalida: horaLimiteStr,
          totalHoras: 'Anulado (QR Expirado)',
          observacion: motivoExpiracion
        });
      }

      this.notificar(
        `⛔ ¡Tiempo agotado (${minsQR} min)! No escaneaste el QR a tiempo. Tu entrada fue cancelada y se notificó al encargado.`,
        'alerta'
      );
      this.cdr.detectChanges();
    } catch (e) {
      console.error('Error al expirar turno por QR:', e);
    } finally {
      this.procesandoExpiracionQR = false;
    }
  }

  // --- EXPIRACIÓN AUTOMÁTICA AL ACABARSE EL TIEMPO DE COMIDA ---
  private async ejecutarExpiracionTurnoPorComida(reg: RegistroExtendido): Promise<void> {
    try {
      const minsComida = reg.minutosComidaAsignados || Number(this.empresa.duracionComidaMinutos) || 45;
      const horaLimiteStr = new Date().toLocaleTimeString('es-ES');
      const notaCierre = `⛔ Turno cerrado: Excedió los ${minsComida} min de comida sin regresar`;
      const obsAnterior = (reg.observacion && !reg.observacion.toLowerCase().includes('pendiente'))
        ? `${reg.observacion} | ${notaCierre}`
        : notaCierre;

      reg.estado = 'Expirado';
      reg.comidaExpiradaSinRegresar = true;
      reg.alertaComidaVistaPorAdmin = false;
      reg.horaPausaFin = `${horaLimiteStr} (Expirado)`;
      reg.horaSalida = horaLimiteStr;
      reg.totalHoras = 'Cerrado (Tiempo de comida agotado)';
      reg.observacion = obsAnterior;

      this.mostrarModalQR = false;
      this.detenerCamara();

      const idReal = await this.obtenerIdRealRegistro(reg);
      if (idReal) {
        await this.registroService.actualizarRegistro(idReal, {
          estado: 'Expirado',
          comidaExpiradaSinRegresar: true,
          alertaComidaVistaPorAdmin: false,
          horaPausaFin: `${horaLimiteStr} (Expirado)`,
          horaSalida: horaLimiteStr,
          totalHoras: 'Cerrado (Tiempo de comida agotado)',
          observacion: obsAnterior
        } as any);
      }

      this.notificar(
        `⛔ ¡Tiempo de comida agotado (${minsComida} min)! Tu turno fue cerrado automáticamente y se envió aviso al encargado.`,
        'alerta'
      );
      this.cdr.detectChanges();
    } catch (e) {
      console.error('Error al expirar turno por comida:', e);
    } finally {
      this.procesandoExpiracionComida = false;
    }
  }

  // --- EXPIRACIÓN AUTOMÁTICA AL ACABARSE EL TIEMPO DE ACTIVIDADES ---
  private async ejecutarExpiracionTurnoPorTarea(reg: RegistroExtendido): Promise<void> {
    try {
      const minsTarea = Number(this.empresa.tiempoLimiteTareasMinutos) || 10;
      const horaLimiteStr = new Date().toLocaleTimeString('es-ES');
      const motivoExpiracion = `⛔ Turno cerrado: No registró ninguna actividad dentro de los ${minsTarea} minutos reglamentarios`;

      reg.estado = 'Expirado';
      reg.tareaExpiradaSinRegistrar = true;
      reg.alertaTareaVistaPorAdmin = false;
      reg.horaSalida = horaLimiteStr;
      reg.totalHoras = 'Cerrado (Sin actividad registrada)';
      reg.observacion = motivoExpiracion;

      this.mostrarModalQR = false;
      this.detenerCamara();

      const idReal = await this.obtenerIdRealRegistro(reg);
      if (idReal) {
        await this.registroService.actualizarRegistro(idReal, {
          estado: 'Expirado',
          tareaExpiradaSinRegistrar: true,
          alertaTareaVistaPorAdmin: false,
          horaSalida: horaLimiteStr,
          totalHoras: 'Cerrado (Sin actividad registrada)',
          observacion: motivoExpiracion
        } as any);
      }

      this.notificar(
        `⛔ ¡Tiempo agotado (${minsTarea} min)! No anotaste ninguna actividad. Tu turno fue cerrado y se notificó al encargado.`,
        'alerta'
      );
      this.cdr.detectChanges();
    } catch (e) {
      console.error('Error al expirar turno por actividad:', e);
    } finally {
      this.procesandoExpiracionTarea = false;
    }
  }

  formatearSegundos(segundos: number): string {
    const mins = Math.floor(segundos / 60).toString().padStart(2, '0');
    const segs = (segundos % 60).toString().padStart(2, '0');
    return `${mins}:${segs}`;
  }

  esActividadRegistrada(reg?: RegistroExtendido): boolean {
    if (!reg) return false;
    if (reg.actividades && reg.actividades.length > 0) return true;
    if (reg.actividadRegistrada) return true;
    return !!reg.observacion && !reg.observacion.toLowerCase().includes('pendiente') && !reg.observacion.startsWith('⛔');
  }

  get actividadesTurnoActivo(): ActividadItem[] {
    const reg = this.registroActivo;
    if (!reg) return [];
    if (reg.actividades && reg.actividades.length > 0) {
      return reg.actividades;
    }
    if (this.esActividadRegistrada(reg)) {
      return [{ hora: reg.horaEntrada, texto: reg.observacion }];
    }
    return [];
  }

  irAAuth(tab: 'login' | 'registro'): void {
    this.tabAuth = tab;
    this.pantallaActual = tab;
    this.cdr.detectChanges();
  }

  irABienvenida(): void {
    this.pantallaActual = 'bienvenida';
    this.cdr.detectChanges();
  }

  // --- ENVÍO REAL DE CÓDIGO DE VERIFICACIÓN DE 2 PASOS POR GMAIL ---
  private async enviarCorreoCodigoGmailReal(usuario: Usuario): Promise<void> {
    this.usuarioPendienteVerificacion = usuario;
    this.codigoVerificacionIngresado = '';
    this.correoEnviadoExito = false;
    this.errorEnvioGmail = '';
    this.mostrarModalVerificacionGmail = true;
    this.cdr.detectChanges();

    const serviceId = this.EMAILJS_SERVICE_ID.trim();
    const templateId = this.EMAILJS_TEMPLATE_ID.trim();
    const publicKey = this.EMAILJS_PUBLIC_KEY.trim();

    this.enviandoCorreoGmail = true;
    this.cdr.detectChanges();

    const enlace = `${window.location.origin}/?verificar=${encodeURIComponent(usuario.tokenVerificacion || '')}`;

    try {
      const resp = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: serviceId,
          template_id: templateId,
          user_id: publicKey,
          template_params: {
            to_email: usuario.correo,
            email: usuario.correo,
            to_name: usuario.nombre,
            app_name: usuario.empresaNombre || this.empresa.nombre || 'TickTock',
            codigo: usuario.codigoVerificacion,
            passcode: usuario.codigoVerificacion,
            verification_code: usuario.codigoVerificacion,
            verification_link: enlace,
            message: `Hola ${usuario.nombre}, tu código de verificación en 2 pasos para ${usuario.empresaNombre || this.empresa.nombre} es: ${usuario.codigoVerificacion}. Si fuiste tú, ingresa este código o haz clic en "Sí, soy yo": ${enlace}`
          }
        })
      });

      if (resp.ok) {
        this.correoEnviadoExito = true;
        this.notificar(`📩 Código de verificación enviado al correo ${usuario.correo}`, 'exito');
      } else {
        const txt = await resp.text();
        this.errorEnvioGmail = `❌ No se pudo enviar el correo (${txt || 'Verifica la plantilla de correo'}).`;
      }
    } catch (e) {
      console.error('Error enviando correo de verificación:', e);
      this.errorEnvioGmail = '❌ Error de red al enviar el correo de verificación.';
    } finally {
      this.enviandoCorreoGmail = false;
      this.cdr.detectChanges();
    }
  }

  async reenviarCodigoVerificacion(): Promise<void> {
    if (!this.usuarioPendienteVerificacion) return;
    await this.enviarCorreoCodigoGmailReal(this.usuarioPendienteVerificacion);
  }

  async confirmarCodigoVerificacion2Pasos(): Promise<void> {
    if (!this.usuarioPendienteVerificacion) return;
    const codigoLimpio = this.codigoVerificacionIngresado.trim();

    if (!codigoLimpio || codigoLimpio !== this.usuarioPendienteVerificacion.codigoVerificacion) {
      this.notificar('❌ El código de 6 dígitos no coincide. Revisa tu bandeja de Gmail.', 'alerta');
      return;
    }

    this.cargandoAccion = true;
    this.cdr.detectChanges();

    try {
      const u = this.usuarioPendienteVerificacion;
      if (u.id) {
        await this.registroService.actualizarUsuario(u.id, { verificadoCorreo: true });
      }
      u.verificadoCorreo = true;
      this.usuariosSistema = this.usuariosSistema.map(item =>
        item.correo.toLowerCase() === u.correo.toLowerCase() ? { ...item, verificadoCorreo: true } : item
      );

      const eraAutoregistro = !this.sesionIniciada;
      this.mostrarModalVerificacionGmail = false;
      this.usuarioPendienteVerificacion = null;
      this.notificar('✅ ¡Código verificado! Correo confirmado con éxito.', 'exito');

      if (eraAutoregistro) {
        this.iniciarSesionUsuario(u);
      }
    } catch (e) {
      console.error(e);
      this.notificar('Error al confirmar código de verificación', 'alerta');
    } finally {
      this.cargandoAccion = false;
      this.cdr.detectChanges();
    }
  }

  cerrarModalVerificacionGmail(): void {
    this.mostrarModalVerificacionGmail = false;
    this.usuarioPendienteVerificacion = null;
    this.cdr.detectChanges();
  }

  reenviarVerificacionAlumno(alumno: Usuario): void {
    this.enviarCorreoCodigoGmailReal(alumno);
  }

  // --- GESTIÓN DE MIEMBROS (ADMIN) ---
  abrirModalNuevoEstudiante(): void {
    this.adminNuevoNombre = '';
    this.adminNuevoCorreo = '';
    this.adminNuevoPassword = '';
    this.adminNuevoDept = 'General';
    this.adminNuevoDeptPersonalizado = '';
    this.adminNuevoAvatar = '🧑‍💻';
    this.adminNuevoTel = '';
    this.adminNuevoMatricula = '';
    this.verPassNuevoAlumno = false;
    this.mostrarModalNuevoEstudiante = true;
    this.cdr.detectChanges();
  }

  cerrarModalNuevoEstudiante(): void {
    this.mostrarModalNuevoEstudiante = false;
    this.cdr.detectChanges();
  }

  async registrarEstudiantePorAdmin(): Promise<void> {
    if (!this.empresaActualId) return;
    if (!this.adminNuevoNombre.trim() || !this.adminNuevoCorreo.trim() || !this.adminNuevoPassword.trim()) {
      this.notificar('Ingresa nombre, correo y contraseña', 'alerta');
      return;
    }

    const deptoFinal = this.adminNuevoDept === '__OTRO__'
      ? this.adminNuevoDeptPersonalizado.trim()
      : this.adminNuevoDept;

    if (!deptoFinal) {
      this.notificar('Escribe el nombre del departamento o área', 'alerta');
      return;
    }

    this.cargandoAccion = true;
    this.cdr.detectChanges();
    const correoNorm = this.adminNuevoCorreo.trim().toLowerCase();

    try {
      const existe = await this.registroService.buscarUsuarioPorCorreo(correoNorm);
      if (existe) {
        this.notificar('Este correo ya está registrado en la plataforma', 'alerta');
        return;
      }

      await this.registrarDepartamentoSiEsNuevo(deptoFinal);

      const token = 'VRF-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const codigo6 = Math.floor(100000 + Math.random() * 900000).toString();

      const nuevoMiembro: Usuario = {
        empresaId: this.empresaActualId,
        nombre: this.adminNuevoNombre.trim(),
        correo: correoNorm,
        password: this.adminNuevoPassword.trim(),
        rol: 'estudiante',
        departamento: deptoFinal,
        avatar: this.adminNuevoAvatar,
        puesto: this.etiquetaSingular,
        empresaNombre: this.empresa.nombre,
        sucursal: this.empresa.sucursal,
        horario: this.empresa.horario,
        telefono: this.adminNuevoTel.trim(),
        matricula: this.adminNuevoMatricula.trim(),
        verificadoCorreo: false,
        tokenVerificacion: token,
        codigoVerificacion: codigo6
      };

      const docRef = await this.registroService.registrarUsuario(nuevoMiembro);
      nuevoMiembro.id = docRef.id;
      this.usuariosSistema = [...this.usuariosSistema, nuevoMiembro];

      this.mostrarModalNuevoEstudiante = false;
      this.notificar(`📩 ${this.etiquetaSingular} registrado. Enviando código a ${correoNorm}...`, 'info');
      await this.enviarCorreoCodigoGmailReal(nuevoMiembro);
    } catch (error) {
      console.error(error);
      this.notificar(`Error al guardar ${this.etiquetaSingular.toLowerCase()} en Firebase`, 'alerta');
    } finally {
      this.cargandoAccion = false;
      this.cdr.detectChanges();
    }
  }

  abrirModalEditarEstudiante(alumno: Usuario): void {
    this.editEstudianteId = alumno.id || '';
    this.editEstudianteNombre = alumno.nombre || '';
    this.editEstudianteMatricula = alumno.matricula || '';
    this.editEstudianteCorreo = alumno.correo || '';
    this.editEstudianteTelefono = alumno.telefono || '';
    this.editEstudiantePassword = alumno.password || '';
    this.verPassEditarAlumno = false;

    const deptoActual = alumno.departamento || 'General';
    if (this.listaDepartamentosCompleta.includes(deptoActual)) {
      this.editEstudianteDept = deptoActual;
      this.editEstudianteDeptPersonalizado = '';
    } else {
      this.editEstudianteDept = '__OTRO__';
      this.editEstudianteDeptPersonalizado = deptoActual;
    }

    this.mostrarModalEditarEstudiante = true;
    this.cdr.detectChanges();
  }

  cerrarModalEditarEstudiante(): void {
    this.mostrarModalEditarEstudiante = false;
    this.cdr.detectChanges();
  }

  async guardarEdicionEstudiante(): Promise<void> {
    if (!this.editEstudianteId) return;
    if (!this.editEstudianteNombre.trim() || !this.editEstudianteCorreo.trim()) {
      this.notificar('El nombre y el correo electrónico son obligatorios', 'alerta');
      return;
    }

    const deptoFinal = this.editEstudianteDept === '__OTRO__'
      ? this.editEstudianteDeptPersonalizado.trim()
      : this.editEstudianteDept;

    if (!deptoFinal) {
      this.notificar('Escribe el nombre del departamento o área', 'alerta');
      return;
    }

    this.cargandoAccion = true;
    this.cdr.detectChanges();

    try {
      await this.registrarDepartamentoSiEsNuevo(deptoFinal);

      const cambios: Partial<Usuario> = {
        nombre: this.editEstudianteNombre.trim(),
        matricula: this.editEstudianteMatricula.trim(),
        correo: this.editEstudianteCorreo.trim().toLowerCase(),
        telefono: this.editEstudianteTelefono.trim(),
        departamento: deptoFinal
      };

      if (this.editEstudiantePassword.trim()) {
        cambios.password = this.editEstudiantePassword.trim();
      }

      await this.registroService.actualizarUsuario(this.editEstudianteId, cambios);
      this.usuariosSistema = this.usuariosSistema.map(u =>
        u.id === this.editEstudianteId ? { ...u, ...cambios } : u
      );

      this.mostrarModalEditarEstudiante = false;
      this.notificar(`✅ Datos del ${this.etiquetaSingular.toLowerCase()} actualizados correctamente`, 'exito');
    } catch (e) {
      console.error('Error editando miembro:', e);
      this.notificar('Error al actualizar datos', 'alerta');
    } finally {
      this.cargandoAccion = false;
      this.cdr.detectChanges();
    }
  }

  // --- REGISTRO EXCLUSIVO PARA COMPAÑÍAS ---
  async ejecutarRegistro(): Promise<void> {
    if (!this.formEmpresaNombre.trim()) {
      this.notificar('Ingresa el nombre de tu Compañía o Institución', 'alerta');
      return;
    }
    if (!this.formNombre.trim() || !this.formCorreo.trim() || !this.formPassword.trim()) {
      this.notificar('Completa el nombre del encargado, correo Gmail y contraseña', 'alerta');
      return;
    }

    const deptoFinal = this.formDepartamento === '__OTRO__'
      ? this.formDepartamentoPersonalizado.trim()
      : this.formDepartamento;

    if (!deptoFinal) {
      this.notificar('Escribe el nombre del departamento o área', 'alerta');
      return;
    }

    this.sincronizarHorarioRegistro();

    this.cargandoAccion = true;
    this.cdr.detectChanges();
    const correoNorm = this.formCorreo.trim().toLowerCase();

    const horarioFormateado = (this.formHoraInicio && this.formHoraFin)
      ? `De ${this.formHoraInicio} a ${this.formHoraFin}`
      : (this.formHoraInicio ? `Desde ${this.formHoraInicio}` : 'Por definir');

    this.tipoMiembroOption = this.formTipoMiembroOption;
    if (this.formTipoMiembroOption === '__OTRO__') {
      this.tipoMiembroSingularCustom = this.formTipoMiembroSingularCustom.trim() || 'Integrante';
      this.tipoMiembroPluralCustom = this.formTipoMiembroPluralCustom.trim() || 'Integrantes';
    }

    try {
      const existe = await this.registroService.buscarUsuarioPorCorreo(correoNorm);
      if (existe) {
        this.notificar('Este correo ya está registrado. Inicia sesión o usa otro correo.', 'alerta');
        return;
      }

      const nuevaEmpresaId = 'emp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const departamentosInit = this.departamentosBase.some(d => d.toLowerCase() === deptoFinal.toLowerCase())
        ? []
        : [deptoFinal];

      const nuevaEmpresa: EmpresaExtendida = {
        id: nuevaEmpresaId,
        nombre: this.formEmpresaNombre.trim(),
        sucursal: this.formSucursal.trim(),
        ubicacion: this.formUbicacion.trim(),
        codigo: 'TT-' + Math.floor(1000 + Math.random() * 9000),
        horario: horarioFormateado,
        horaInicio: this.formHoraInicio,
        horaFin: this.formHoraFin,
        colorTema: '#f97316',
        duracionComidaMinutos: 45,
        maxComidasPorTurno: 1,
        tiempoLimiteTareasMinutos: 10,
        tiempoLimiteQRMinutos: 15,
        habilitarLimiteEntrada: false,
        toleranciaEntradaMinutos: 20,
        permitirMultiplesRegistrosDia: true,
        habilitarFormEstudiantes: true,
        habilitarReporteHoras: true,
        habilitarReporteInformes: true,
        habilitarReporteCompleto: true,
        departamentosPersonalizados: departamentosInit,
        tipoMiembroOption: this.tipoMiembroOption,
        tipoMiembroSingular: this.etiquetaSingular,
        tipoMiembroPlural: this.etiquetaPlural
      };

      await this.registroService.guardarEmpresaConfig(nuevaEmpresaId, nuevaEmpresa);
      this.empresa = { ...nuevaEmpresa };
      this.empresaActualId = nuevaEmpresaId;

      const token = 'VRF-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const codigo6 = Math.floor(100000 + Math.random() * 900000).toString();

      const nuevoAdmin: Usuario = {
        empresaId: nuevaEmpresaId,
        nombre: this.formNombre.trim(),
        correo: correoNorm,
        password: this.formPassword.trim(),
        rol: 'admin',
        departamento: deptoFinal,
        avatar: '👑',
        puesto: 'Administrador / Encargado',
        empresaNombre: nuevaEmpresa.nombre,
        sucursal: nuevaEmpresa.sucursal,
        horario: horarioFormateado,
        telefono: this.formTelefono.trim(),
        verificadoCorreo: false,
        tokenVerificacion: token,
        codigoVerificacion: codigo6
      };

      const docRef = await this.registroService.registrarUsuario(nuevoAdmin);
      nuevoAdmin.id = docRef.id;

      this.limpiarFormularioAuth();
      await this.enviarCorreoCodigoGmailReal(nuevoAdmin);
    } catch (error) {
      console.error(error);
      this.notificar('Error al registrar la compañía', 'alerta');
    } finally {
      this.cargandoAccion = false;
      this.cdr.detectChanges();
    }
  }

  async ejecutarLogin(): Promise<void> {
    if (!this.formCorreo.trim() || !this.formPassword.trim()) {
      this.notificar('Ingresa tu correo y contraseña', 'alerta');
      return;
    }

    this.cargandoAccion = true;
    this.cdr.detectChanges();
    const correoBuscado = this.formCorreo.trim().toLowerCase();
    const passBuscada = this.formPassword.trim();

    try {
      const usuario = await this.registroService.buscarUsuarioPorCorreo(correoBuscado);

      if (usuario && usuario.password === passBuscada) {
        const empId = usuario.empresaId || 'default_empresa';
        const cfgEmpresa = await this.registroService.obtenerEmpresaConfigDirecto(empId);
        if (cfgEmpresa) {
          this.aplicarConfiguracionRecibida(cfgEmpresa);
        }

        if (usuario.verificadoCorreo === false) {
          this.notificar('⚠️ Confirma primero tu correo Gmail con el código de 6 dígitos.', 'alerta');
          await this.enviarCorreoCodigoGmailReal(usuario);
          return;
        }

        this.iniciarSesionUsuario(usuario);
        await this.recargarDatosDesdeNube(false);
        this.notificar(`Bienvenido, ${usuario.nombre}`, 'exito');
        this.limpiarFormularioAuth();
      } else {
        this.notificar('Correo o contraseña incorrectos', 'alerta');
      }
    } catch (error) {
      console.error(error);
      this.notificar('Error al conectar con el servidor', 'alerta');
    } finally {
      this.cargandoAccion = false;
      this.cdr.detectChanges();
    }
  }

  iniciarSesionUsuario(usuario: Usuario): void {
    const empId = usuario.empresaId || 'default_empresa';
    this.usuarioActual = { ...usuario, empresaId: empId };
    this.empresaActualId = empId;
    this.sesionIniciada = true;
    this.pantallaActual = 'dashboard';

    sessionStorage.setItem('ticktock_user_tab', JSON.stringify(this.usuarioActual));
    localStorage.removeItem('ticktock_user');

    this.suscribirDatosDeEmpresa(empId);
    this.recalcularCronometros();
    this.cdr.detectChanges();
  }

  cerrarSesion(mensajePersonalizado?: string): void {
    this.limpiarSuscripcionesEmpresa();
    this.detenerCamara();
    this.mostrarModalQR = false;
    this.mostrarModalSalida = false;
    this.mostrarModalDocumentos = false;
    this.usuarioActual = null;
    this.empresaActualId = '';
    this.sesionIniciada = false;
    this.usuariosSistema = [];
    this.registros = [];
    this.aplicarVariablesGlobalesCSS('#f97316');
    this.pantallaActual = 'bienvenida';
    sessionStorage.removeItem('ticktock_user_tab');
    localStorage.removeItem('ticktock_user');
    this.notificar(
      mensajePersonalizado || 'Sesión cerrada en esta pestaña',
      mensajePersonalizado ? 'alerta' : 'info'
    );
    this.cdr.detectChanges();
  }

  cargarSesionGuardada(): void {
    localStorage.removeItem('ticktock_user');
    const raw = sessionStorage.getItem('ticktock_user_tab');
    if (raw) {
      try {
        const user = JSON.parse(raw);
        if (user && user.nombre && user.rol) {
          const empId = user.empresaId || 'default_empresa';
          this.usuarioActual = { ...user, empresaId: empId };
          this.empresaActualId = empId;
          this.sesionIniciada = true;
          this.pantallaActual = 'dashboard';
          this.suscribirDatosDeEmpresa(empId);
        }
      } catch {
        sessionStorage.removeItem('ticktock_user_tab');
      }
    }
  }

  limpiarFormularioAuth(): void {
    this.formNombre = '';
    this.formCorreo = '';
    this.formPassword = '';
    this.formEmpresaNombre = '';
    this.formSucursal = '';
    this.formUbicacion = '';
    this.formHoraInicio = '';
    this.formHoraFin = '';
    this.regInicioHora = '';
    this.regInicioMin = '00';
    this.regInicioAmPm = 'AM';
    this.regFinHora = '';
    this.regFinMin = '00';
    this.regFinAmPm = 'PM';
    this.formTelefono = '';
    this.formDepartamento = 'Administración';
    this.formDepartamentoPersonalizado = '';
    this.verPassLogin = false;
    this.verPassRegistro = false;
  }

  // --- CONFIGURACIÓN DE EMPRESA ---
  abrirModalEmpresa(): void {
    const ini = this.descomponerHoraTexto(this.empresa.horaInicio);
    this.cfgInicioHora = ini.hora;
    this.cfgInicioMin = ini.min;
    this.cfgInicioAmPm = ini.ampm;

    const fin = this.descomponerHoraTexto(this.empresa.horaFin);
    this.cfgFinHora = fin.hora;
    this.cfgFinMin = fin.min;
    this.cfgFinAmPm = fin.ampm;

    this.mostrarModalEmpresa = true;
    this.cdr.detectChanges();
  }

  cerrarModalEmpresa(): void {
    this.mostrarModalEmpresa = false;
    this.cdr.detectChanges();
  }

  async guardarConfiguracionEmpresa(): Promise<void> {
    if (!this.empresaActualId) return;
    this.cargandoAccion = true;
    this.cdr.detectChanges();

    this.sincronizarHorarioConfig();

    if (this.empresa.horaInicio && this.empresa.horaFin) {
      this.empresa.horario = `De ${this.empresa.horaInicio} a ${this.empresa.horaFin}`;
    } else if (this.empresa.horaInicio) {
      this.empresa.horario = `Desde ${this.empresa.horaInicio}`;
    } else {
      this.empresa.horario = '';
    }

    this.empresa.duracionComidaMinutos = Math.max(1, Number(this.empresa.duracionComidaMinutos) || 45);
    this.empresa.maxComidasPorTurno = Math.max(0, Number(this.empresa.maxComidasPorTurno ?? 1));
    this.empresa.tiempoLimiteTareasMinutos = Math.max(1, Number(this.empresa.tiempoLimiteTareasMinutos) || 10);
    this.empresa.tiempoLimiteQRMinutos = Math.max(1, Number(this.empresa.tiempoLimiteQRMinutos) || 15);
    this.empresa.toleranciaEntradaMinutos = Math.max(1, Number(this.empresa.toleranciaEntradaMinutos) || 20);

    this.empresa.tipoMiembroOption = this.tipoMiembroOption;
    this.empresa.tipoMiembroSingular = this.etiquetaSingular;
    this.empresa.tipoMiembroPlural = this.etiquetaPlural;

    this.aplicarVariablesGlobalesCSS(this.empresa.colorTema || '#f97316');
    this.recalcularCronometros();

    try {
      await this.registroService.guardarEmpresaConfig(this.empresaActualId, this.empresa);
      this.notificar('✅ Configuración, horario y tiempos guardados', 'exito');
      this.mostrarModalEmpresa = false;
    } catch (e) {
      console.error(e);
      this.notificar('Error al guardar en la nube', 'alerta');
    } finally {
      this.cargandoAccion = false;
      this.cdr.detectChanges();
    }
  }

  // --- DETECCIÓN DE TURNO ACTIVO Y BLOQUEOS ---
  get registroActivo(): RegistroExtendido | undefined {
    if (!this.usuarioActual) return undefined;
    const userEmail = (this.usuarioActual.correo || '').toLowerCase();
    const userName = (this.usuarioActual.nombre || '').toLowerCase();
    const userId = this.usuarioActual.id ? String(this.usuarioActual.id) : '';

    return this.registros.find(r =>
      (r.estado === 'En Turno' || r.estado === 'En Pausa') &&
      (
        (userId && String(r.empleadoId) === userId) ||
        (r.empleadoId && String(r.empleadoId).toLowerCase() === userEmail) ||
        (r.empleadoNombre && r.empleadoNombre.toLowerCase() === userName)
      )
    );
  }

  get entradaBloqueadaPorExpiracionHoy(): RegistroExtendido | undefined {
    if (!this.usuarioActual) return undefined;
    const hoy = new Date().toLocaleDateString('es-ES');
    const userEmail = (this.usuarioActual.correo || '').toLowerCase();
    const userName = (this.usuarioActual.nombre || '').toLowerCase();

    return this.registros.find(r =>
      r.fecha === hoy &&
      (r.qrExpiradoSinEscanear === true || r.comidaExpiradaSinRegresar === true || r.tareaExpiradaSinRegistrar === true) &&
      (
        (r.empleadoId && String(r.empleadoId).toLowerCase() === userEmail) ||
        (r.empleadoNombre && r.empleadoNombre.toLowerCase() === userName)
      )
    );
  }

  get tieneTurnoCompletadoHoy(): boolean {
    if (!this.usuarioActual) return false;
    const hoy = new Date().toLocaleDateString('es-ES');
    const userEmail = (this.usuarioActual.correo || '').toLowerCase();
    const userName = (this.usuarioActual.nombre || '').toLowerCase();

    return this.registros.some(r =>
      r.fecha === hoy &&
      r.estado === 'Completado' &&
      (
        (r.empleadoId && String(r.empleadoId).toLowerCase() === userEmail) ||
        (r.empleadoNombre && r.empleadoNombre.toLowerCase() === userName)
      )
    );
  }

  get entradaBloqueadaPorRegistroUnicoHoy(): boolean {
    return this.empresa.permitirMultiplesRegistrosDia === false && this.tieneTurnoCompletadoHoy;
  }

  get entradaBloqueadaPorToleranciaHorario(): boolean {
    return this.empresa.habilitarLimiteEntrada === true && this.estadoToleranciaEntrada === 'EXPIRADO';
  }

  // --- ALERTAS AL ADMINISTRADOR (QR, COMIDA Y ACTIVIDADES EXPIRADAS) ---
  get alertasQRExpiradoAdmin(): RegistroExtendido[] {
    return this.registros.filter(r => r.qrExpiradoSinEscanear === true && !r.alertaVistaPorAdmin);
  }

  get alertasComidaExpiradaAdmin(): RegistroExtendido[] {
    return this.registros.filter(r => r.comidaExpiradaSinRegresar === true && !r.alertaComidaVistaPorAdmin);
  }

  get alertasTareaExpiradaAdmin(): RegistroExtendido[] {
    return this.registros.filter(r => r.tareaExpiradaSinRegistrar === true && !r.alertaTareaVistaPorAdmin);
  }

  async descartarAlertaAdmin(reg: RegistroExtendido): Promise<void> {
    reg.alertaVistaPorAdmin = true;
    if (reg.id && !reg.id.startsWith('temp_')) {
      await this.registroService.actualizarRegistro(reg.id, { alertaVistaPorAdmin: true });
    }
    this.cdr.detectChanges();
  }

  async descartarAlertaComidaAdmin(reg: RegistroExtendido): Promise<void> {
    reg.alertaComidaVistaPorAdmin = true;
    if (reg.id && !reg.id.startsWith('temp_')) {
      await this.registroService.actualizarRegistro(reg.id, { alertaComidaVistaPorAdmin: true } as any);
    }
    this.notificar(`⛔ Turno de ${reg.empleadoNombre} mantenido cerrado.`, 'info');
    this.cdr.detectChanges();
  }

  async continuarTurnoTrasComida(reg: RegistroExtendido): Promise<void> {
    const ahoraStr = new Date().toLocaleTimeString('es-ES');
    const nuevasComidas = (typeof reg.comidasRealizadas === 'number' ? reg.comidasRealizadas : 0) + 1;
    const maxComidas = this.maxComidasPermitidas;
    const agoto = nuevasComidas >= maxComidas;

    reg.estado = 'En Turno';
    reg.comidaExpiradaSinRegresar = false;
    reg.alertaComidaVistaPorAdmin = true;
    reg.horaPausaFin = ahoraStr;
    reg.horaSalida = '';
    reg.totalHoras = '';
    reg.comidasRealizadas = nuevasComidas;
    reg.comidaTerminada = agoto;

    const idReal = await this.obtenerIdRealRegistro(reg);
    if (idReal) {
      await this.registroService.actualizarRegistro(idReal, {
        estado: 'En Turno',
        comidaExpiradaSinRegresar: false,
        alertaComidaVistaPorAdmin: true,
        horaPausaFin: ahoraStr,
        horaSalida: '',
        totalHoras: '',
        comidasRealizadas: nuevasComidas,
        comidaTerminada: agoto
      } as any);
    }
    this.notificar(`✅ Se autorizó a ${reg.empleadoNombre} seguir en turno.`, 'exito');
    this.cdr.detectChanges();
  }

  async darMasTiempoComida(reg: RegistroExtendido, minutosExtra: number = 15): Promise<void> {
    const ahoraMs = Date.now();
    reg.estado = 'En Pausa';
    reg.comidaExpiradaSinRegresar = false;
    reg.alertaComidaVistaPorAdmin = true;
    reg.timestampPausaInicio = ahoraMs;
    reg.minutosComidaAsignados = minutosExtra;
    reg.horaSalida = '';
    reg.totalHoras = '';

    const idReal = await this.obtenerIdRealRegistro(reg);
    if (idReal) {
      await this.registroService.actualizarRegistro(idReal, {
        estado: 'En Pausa',
        comidaExpiradaSinRegresar: false,
        alertaComidaVistaPorAdmin: true,
        timestampPausaInicio: ahoraMs,
        minutosComidaAsignados: minutosExtra,
        horaSalida: '',
        totalHoras: ''
      } as any);
    }
    this.notificar(`⏱️ Se dieron +${minutosExtra} min extra de comida a ${reg.empleadoNombre}.`, 'exito');
    this.cdr.detectChanges();
  }

  async descartarAlertaTareaAdmin(reg: RegistroExtendido): Promise<void> {
    reg.alertaTareaVistaPorAdmin = true;
    if (reg.id && !reg.id.startsWith('temp_')) {
      await this.registroService.actualizarRegistro(reg.id, { alertaTareaVistaPorAdmin: true } as any);
    }
    this.notificar(`⛔ Turno de ${reg.empleadoNombre} mantenido cerrado.`, 'info');
    this.cdr.detectChanges();
  }

  async continuarTurnoTrasTarea(reg: RegistroExtendido): Promise<void> {
    const ahoraMs = Date.now();
    reg.estado = 'En Turno';
    reg.tareaExpiradaSinRegistrar = false;
    reg.alertaTareaVistaPorAdmin = true;
    reg.timestampTareaInicio = ahoraMs;
    reg.horaSalida = '';
    reg.totalHoras = '';
    reg.observacion = 'Pendiente de registrar actividad (Tiempo extra otorgado)';

    const idReal = await this.obtenerIdRealRegistro(reg);
    if (idReal) {
      await this.registroService.actualizarRegistro(idReal, {
        estado: 'En Turno',
        tareaExpiradaSinRegistrar: false,
        alertaTareaVistaPorAdmin: true,
        timestampTareaInicio: ahoraMs,
        horaSalida: '',
        totalHoras: '',
        observacion: 'Pendiente de registrar actividad (Tiempo extra otorgado)'
      } as any);
    }
    this.notificar(`✅ Se reactivó el turno de ${reg.empleadoNombre} para anotar su actividad.`, 'exito');
    this.cdr.detectChanges();
  }

  async habilitarReintentoAlumno(reg: RegistroExtendido): Promise<void> {
    if (!reg.id) return;
    this.registros = this.registros.filter(r => r.id !== reg.id);
    if (!reg.id.startsWith('temp_')) {
      await this.registroService.eliminarRegistro(reg.id);
    }
    this.notificar(`🔓 Se habilitó nuevamente la entrada para ${reg.empleadoNombre}`, 'exito');
    this.cdr.detectChanges();
  }

  get estaEnTurno(): boolean { return this.registroActivo?.estado === 'En Turno'; }
  get estaEnPausa(): boolean { return this.registroActivo?.estado === 'En Pausa'; }

  // Conteo de comidas usadas vs permitidas en el turno actual
  get maxComidasPermitidas(): number {
    return Math.max(0, Number(this.empresa.maxComidasPorTurno ?? 1));
  }

  get comidasUsadasEnTurno(): number {
    const reg = this.registroActivo;
    if (!reg) return 0;
    if (typeof reg.comidasRealizadas === 'number') {
      return reg.comidasRealizadas;
    }
    return (reg.comidaTerminada || (reg.horaPausaInicio && reg.horaPausaFin)) ? 1 : 0;
  }

  get comidasAgotadasEnTurno(): boolean {
    return this.comidasUsadasEnTurno >= this.maxComidasPermitidas;
  }

  private async obtenerIdRealRegistro(reg: RegistroExtendido): Promise<string | null> {
    if (reg.id && !reg.id.startsWith('temp_')) return reg.id;
    const encontrado = this.registros.find(
      r => r.id && !r.id.startsWith('temp_') && r.timestampEntrada === reg.timestampEntrada
    );
    if (encontrado?.id) return encontrado.id;

    const frescos = await this.registroService.obtenerRegistrosDirecto(this.empresaActualId);
    const match = frescos.find(
      r => r.timestampEntrada === reg.timestampEntrada ||
           (r.codigoQR && r.codigoQR === reg.codigoQR && r.estado !== 'Completado' && r.estado !== 'Expirado')
    );
    return match?.id || null;
  }

  async marcarEntrada(): Promise<void> {
    if (!this.usuarioActual || !this.empresaActualId || this.estaEnTurno || this.estaEnPausa || this.cargandoAccion) return;

    if (this.entradaBloqueadaPorExpiracionHoy) {
      this.notificar('⛔ No puedes marcar entrada: Tu turno anterior fue cerrado por tiempo expirado. Contacta al encargado.', 'alerta');
      return;
    }

    if (this.entradaBloqueadaPorToleranciaHorario) {
      this.notificar(`⛔ Tiempo de entrada expirado: Superaste la tolerancia de ${this.empresa.toleranciaEntradaMinutos || 20} min después de las ${this.empresa.horaInicio}.`, 'alerta');
      return;
    }

    if (this.entradaBloqueadaPorRegistroUnicoHoy) {
      this.notificar('⚠️ Ya completaste tu registro de hoy (solo se permite 1 registro por día).', 'alerta');
      return;
    }

    this.cargandoAccion = true;
    this.cdr.detectChanges();

    const ahora = new Date();
    const ahoraMs = ahora.getTime();
    const horaStr = ahora.toLocaleTimeString('es-ES');
    const mesAno = ahora.toISOString().substring(0, 7);
    const pin = 'TK-' + Math.floor(100000 + Math.random() * 900000);
    const minsQR = Number(this.empresa.tiempoLimiteQRMinutos) || 15;

    const textoInicial = this.observacionActual.trim();
    const tieneActividadInicial = textoInicial.length > 0;
    const listaActividadesInicial: ActividadItem[] = tieneActividadInicial
      ? [{ hora: horaStr, texto: textoInicial }]
      : [];

    const resumenObservacion = tieneActividadInicial
      ? `[${horaStr}] ${textoInicial}`
      : 'Pendiente de registrar actividad';

    const nuevo: RegistroExtendido = {
      id: 'temp_' + ahoraMs,
      empresaId: this.empresaActualId,
      empleadoId: String(this.usuarioActual.correo).toLowerCase(),
      empleadoNombre: this.usuarioActual.nombre,
      puesto: this.usuarioActual.puesto || this.etiquetaSingular,
      departamento: this.usuarioActual.departamento || 'General',
      fecha: ahora.toLocaleDateString('es-ES'),
      mesAno,
      horaEntrada: horaStr,
      estado: 'En Turno',
      observacion: resumenObservacion,
      actividades: listaActividadesInicial,
      actividadRegistrada: tieneActividadInicial,
      comidaTerminada: false,
      comidasRealizadas: 0,
      historialComidas: [],
      timestampEntrada: ahoraMs,
      timestampTareaInicio: ahoraMs,
      timestampQR: ahoraMs,
      codigoQR: pin,
      verificadoCamaraMovil: false,
      horaEscaneoQR: '',
      qrExpiradoSinEscanear: false
    };

    this.registros = [nuevo, ...this.registros];
    this.observacionActual = '';
    await this.mostrarQRConTemporizador(pin, ahoraMs);
    this.recalcularCronometros();
    this.notificar(`🟢 Entrada iniciada. Escanea el QR antes de ${minsQR} min o se anulará.`, 'exito');

    try {
      const docRef = await this.registroService.agregarRegistro(nuevo);
      nuevo.id = docRef.id;
    } catch (err) {
      console.error('Error al guardar entrada:', err);
      this.notificar('Error al guardar en la nube', 'alerta');
    } finally {
      this.cargandoAccion = false;
      this.cdr.detectChanges();
    }
  }

  async verMiQRDeNuevo(): Promise<void> {
    const reg = this.registroActivo;
    if (!reg || !reg.codigoQR || reg.verificadoCamaraMovil) return;
    await this.mostrarQRConTemporizador(reg.codigoQR, reg.timestampQR || reg.timestampEntrada || Date.now());
  }

  private async mostrarQRConTemporizador(pin: string, timestampCreacion: number): Promise<void> {
    this.codigoGeneradoQR = pin;
    this.timestampQRGenerado = timestampCreacion;

    const QRCodeLib = (window as any).QRCode;
    if (QRCodeLib && typeof QRCodeLib.toDataURL === 'function') {
      try {
        this.qrImagenUrl = await QRCodeLib.toDataURL(pin, {
          width: 320,
          margin: 3,
          errorCorrectionLevel: 'H',
          color: { dark: '#000000', light: '#ffffff' }
        });
      } catch {
        this.qrImagenUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&ecc=H&margin=16&data=${encodeURIComponent(pin)}`;
      }
    } else {
      this.qrImagenUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&ecc=H&margin=16&data=${encodeURIComponent(pin)}`;
    }

    this.mostrarModalQR = true;
    this.recalcularCronometros();
    this.cdr.detectChanges();
  }

  cerrarModalQR(): void {
    this.mostrarModalQR = false;
    this.cdr.detectChanges();
  }

  // --- ESCÁNER CON CÁMARA REAL ---
  onInputCodigoManual(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.codigoEscaneadoManual = val;
    this.errorModalEscaner = '';
  }

  async abrirEscanerCamara(): Promise<void> {
    if (!this.estaEnTurno && !this.estaEnPausa) {
      this.notificar('Primero marca tu entrada para generar el código QR', 'alerta');
      return;
    }

    this.codigoEscaneadoManual = '';
    this.errorModalEscaner = '';
    this.validandoQR = false;
    this.mostrarModalCamaraMovil = true;
    this.escaneandoCamara = true;
    this.estadoCamaraTexto = 'Solicitando acceso a la cámara...';
    this.cdr.detectChanges();

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });

        setTimeout(() => {
          const videoElem = document.getElementById('camera-stream') as HTMLVideoElement;
          if (videoElem && this.mediaStream) {
            videoElem.srcObject = this.mediaStream;
            videoElem.setAttribute('playsinline', 'true');
            videoElem.play().then(() => {
              this.estadoCamaraTexto = 'Centra el código QR dentro del recuadro...';
              this.cdr.detectChanges();
              this.iniciarDeteccionQR(videoElem);
            }).catch(() => {
              this.estadoCamaraTexto = 'Cámara activa. Si no lee automático, escribe los 6 dígitos abajo.';
              this.cdr.detectChanges();
            });
          }
        }, 250);
      } else {
        this.estadoCamaraTexto = 'Cámara no disponible en este navegador. Escribe los 6 dígitos abajo.';
        this.cdr.detectChanges();
      }
    } catch (e) {
      console.warn('No se pudo abrir la cámara:', e);
      this.estadoCamaraTexto = 'Sin permiso de cámara. Escribe el PIN de la pantalla abajo.';
      this.cdr.detectChanges();
    }
  }

  private iniciarDeteccionQR(videoElem: HTMLVideoElement): void {
    const canvasFull = document.createElement('canvas');
    const ctxFull = canvasFull.getContext('2d', { willReadFrequently: true });

    const canvasCrop = document.createElement('canvas');
    const ctxCrop = canvasCrop.getContext('2d', { willReadFrequently: true });

    const BarcodeDetectorClass = (window as any).BarcodeDetector;
    const detectorNativo = BarcodeDetectorClass
      ? new BarcodeDetectorClass({ formats: ['qr_code'] })
      : null;

    if (this.scanLoopId) clearInterval(this.scanLoopId);

    this.scanLoopId = setInterval(async () => {
      if (!this.escaneandoCamara || this.validandoQR || !videoElem || videoElem.readyState < 2) {
        return;
      }

      if (detectorNativo) {
        try {
          const barcodes = await detectorNativo.detect(videoElem);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            const valor = String(barcodes[0].rawValue).trim().toUpperCase();
            if (valor) {
              this.codigoEscaneadoManual = valor;
              this.cdr.detectChanges();
              await this.validarCodigoEscaner();
              return;
            }
          }
        } catch {
          // Seguir con jsQR
        }
      }

      const jsQRFunc = (window as any).jsQR;
      if (jsQRFunc && ctxFull && ctxCrop && videoElem.videoWidth > 0) {
        const vw = videoElem.videoWidth;
        const vh = videoElem.videoHeight;

        const cropSize = Math.floor(Math.min(vw, vh) * 0.65);
        const sx = Math.floor((vw - cropSize) / 2);
        const sy = Math.floor((vh - cropSize) / 2);
        canvasCrop.width = 420;
        canvasCrop.height = 420;
        ctxCrop.drawImage(videoElem, sx, sy, cropSize, cropSize, 0, 0, 420, 420);

        const imgCrop = ctxCrop.getImageData(0, 0, 420, 420);
        const resCrop = jsQRFunc(imgCrop.data, 420, 420, { inversionAttempts: 'attemptBoth' });
        if (resCrop && resCrop.data) {
          this.codigoEscaneadoManual = String(resCrop.data).trim().toUpperCase();
          this.cdr.detectChanges();
          await this.validarCodigoEscaner();
          return;
        }

        const scale = Math.min(1, 640 / vw);
        const fw = Math.floor(vw * scale);
        const fh = Math.floor(vh * scale);
        canvasFull.width = fw;
        canvasFull.height = fh;
        ctxFull.drawImage(videoElem, 0, 0, fw, fh);

        const imgFull = ctxFull.getImageData(0, 0, fw, fh);
        const resFull = jsQRFunc(imgFull.data, fw, fh, { inversionAttempts: 'attemptBoth' });
        if (resFull && resFull.data) {
          this.codigoEscaneadoManual = String(resFull.data).trim().toUpperCase();
          this.cdr.detectChanges();
          await this.validarCodigoEscaner();
        }
      }
    }, 200);
  }

  detenerCamara(): void {
    if (this.scanLoopId) {
      clearInterval(this.scanLoopId);
      this.scanLoopId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    this.escaneandoCamara = false;
    this.mostrarModalCamaraMovil = false;
    this.errorModalEscaner = '';
    this.cdr.detectChanges();
  }

  private extraerSoloDigitosOPin(valor?: string): string {
    if (!valor) return '';
    return valor.trim().toUpperCase().replace(/^TK-?/i, '').replace(/[^A-Z0-9]/g, '');
  }

  async validarCodigoEscaner(): Promise<void> {
    if (this.validandoQR) return;
    this.errorModalEscaner = '';

    const rawInput = (this.codigoEscaneadoManual || '').trim().toUpperCase();
    const pinIngresado = this.extraerSoloDigitosOPin(rawInput);

    if (!pinIngresado || pinIngresado.length < 4) {
      this.errorModalEscaner = '⚠️ Escribe los 6 dígitos del PIN o apunta la cámara al QR.';
      this.notificar('Ingresa los 6 dígitos del código', 'alerta');
      this.cdr.detectChanges();
      return;
    }

    this.validandoQR = true;
    this.cdr.detectChanges();

    try {
      const ahora = new Date();
      const ahoraMs = ahora.getTime();
      const horaExacta = ahora.toLocaleTimeString('es-ES');
      const minsQR = Number(this.empresa.tiempoLimiteQRMinutos) || 15;
      const LIMITE_QR_MS = minsQR * 60 * 1000;

      const registrosFrescos = await this.registroService.obtenerRegistrosDirecto(this.empresaActualId);
      if (registrosFrescos.length > 0) {
        this.registros = registrosFrescos.sort((a, b) => (b.timestampEntrada || 0) - (a.timestampEntrada || 0));
      }

      const regAlumno = this.registroActivo;
      const pinRegistroAlumno = this.extraerSoloDigitosOPin(regAlumno?.codigoQR);

      if (regAlumno && pinRegistroAlumno && (pinIngresado === pinRegistroAlumno || pinIngresado.includes(pinRegistroAlumno))) {
        const tsCreacion = regAlumno.timestampQR || regAlumno.timestampEntrada || 0;
        if (tsCreacion > 0 && (ahoraMs - tsCreacion > LIMITE_QR_MS)) {
          this.errorModalEscaner = `❌ El código QR caducó (pasaron más de ${minsQR} minutos).`;
          this.notificar(`El código QR ya caducó (límite ${minsQR} min)`, 'alerta');
          return;
        }

        regAlumno.verificadoCamaraMovil = true;
        regAlumno.horaEscaneoQR = horaExacta;
        const idReal = await this.obtenerIdRealRegistro(regAlumno);
        if (idReal) {
          await this.registroService.actualizarRegistro(idReal, {
            verificadoCamaraMovil: true,
            horaEscaneoQR: horaExacta
          });
        }

        this.detenerCamara();
        this.mostrarModalQR = false;
        this.recalcularCronometros();
        this.notificar(`✅ ¡Código QR escaneado a las ${horaExacta}!`, 'exito');
        return;
      }

      this.errorModalEscaner = `❌ El código "${rawInput}" no coincide con tu QR activo. Verifica los 6 dígitos.`;
      this.notificar('Código incorrecto. Revisa los dígitos.', 'alerta');
    } catch (error) {
      console.error('Error al validar código:', error);
      this.errorModalEscaner = '⚠️ Error de conexión con Firebase. Intenta de nuevo.';
    } finally {
      this.validandoQR = false;
      this.cdr.detectChanges();
    }
  }

  // --- PAUSA COMIDA CON CANTIDAD DE VECES Y DURACIÓN EDITABLE ---
  async conmutarPausa(): Promise<void> {
    const reg = this.registroActivo;
    if (!reg) {
      this.notificar('No tienes un turno activo', 'alerta');
      return;
    }
    if (this.cargandoAccion) return;

    const maxComidas = this.maxComidasPermitidas;
    const comidasActuales = this.comidasUsadasEnTurno;

    if (reg.estado === 'En Turno') {
      if (maxComidas <= 0) {
        this.notificar('⚠️ Las pausas de comida están deshabilitadas por el encargado.', 'alerta');
        return;
      }
      if (comidasActuales >= maxComidas) {
        this.notificar(`⚠️ Ya utilizaste tus ${maxComidas} comida(s) permitida(s) en esta jornada.`, 'alerta');
        return;
      }
    }

    this.cargandoAccion = true;
    this.cdr.detectChanges();

    const ahora = new Date();
    const horaActual = ahora.toLocaleTimeString('es-ES');
    const pasandoAPausa = reg.estado === 'En Turno';

    const nuevoEstado: 'En Pausa' | 'En Turno' = pasandoAPausa ? 'En Pausa' : 'En Turno';
    const datosActualizar: Partial<RegistroExtendido> = { estado: nuevoEstado };
    const historialActual: ComidaItem[] = Array.isArray(reg.historialComidas) ? [...reg.historialComidas] : [];

    if (pasandoAPausa) {
      const minsComida = Number(this.empresa.duracionComidaMinutos) || 45;
      historialActual.push({ inicio: horaActual });
      reg.estado = 'En Pausa';
      reg.horaPausaInicio = reg.horaPausaInicio || horaActual;
      reg.timestampPausaInicio = ahora.getTime();
      reg.minutosComidaAsignados = minsComida;
      reg.historialComidas = historialActual;

      datosActualizar.horaPausaInicio = reg.horaPausaInicio;
      datosActualizar.timestampPausaInicio = ahora.getTime();
      datosActualizar.minutosComidaAsignados = minsComida;
      datosActualizar.historialComidas = historialActual;

      this.recalcularCronometros();
      this.notificar(`☕ Comida #${comidasActuales + 1} de ${maxComidas} iniciada (${horaActual}). Tienes ${minsComida} min.`, 'info');
    } else {
      const segundosUsados = reg.timestampPausaInicio
        ? Math.max(1, Math.floor((ahora.getTime() - reg.timestampPausaInicio) / 1000))
        : 0;

      const nuevasComidasUsadas = comidasActuales + 1;
      if (historialActual.length > 0) {
        historialActual[historialActual.length - 1] = {
          ...historialActual[historialActual.length - 1],
          fin: horaActual,
          segundos: segundosUsados
        };
      }

      const agotoComidas = nuevasComidasUsadas >= maxComidas;

      reg.estado = 'En Turno';
      reg.horaPausaFin = horaActual;
      reg.comidasRealizadas = nuevasComidasUsadas;
      reg.historialComidas = historialActual;
      reg.comidaTerminada = agotoComidas;
      reg.minutosComidaAsignados = undefined;
      reg.segundosComidaUsados = (reg.segundosComidaUsados || 0) + segundosUsados;

      datosActualizar.horaPausaFin = horaActual;
      datosActualizar.comidasRealizadas = nuevasComidasUsadas;
      datosActualizar.historialComidas = historialActual;
      datosActualizar.comidaTerminada = agotoComidas;
      datosActualizar.minutosComidaAsignados = 0;
      datosActualizar.segundosComidaUsados = reg.segundosComidaUsados;

      this.recalcularCronometros();
      this.notificar(`✅ Comida #${nuevasComidasUsadas} de ${maxComidas} finalizada a las ${horaActual}. Turno reanudado.`, 'exito');
    }

    try {
      const idReal = await this.obtenerIdRealRegistro(reg);
      if (idReal) {
        await this.registroService.actualizarRegistro(idReal, datosActualizar);
      }
    } catch (err) {
      console.error('Error al actualizar estado de comida:', err);
      this.notificar('Error al actualizar estado de comida', 'alerta');
    } finally {
      this.cargandoAccion = false;
      this.cdr.detectChanges();
    }
  }

  // --- AGREGAR NUEVA ACTIVIDAD / TAREA SIN BORRAR LAS ANTERIORES ---
  async actualizarActividad(): Promise<void> {
    const reg = this.registroActivo;
    if (!reg) {
      this.notificar('Primero marca tu entrada para registrar tareas', 'alerta');
      return;
    }

    const textoNuevaTarea = this.observacionActual.trim();
    if (!textoNuevaTarea) {
      this.notificar('Escribe la nueva tarea o actividad para agregarla', 'alerta');
      return;
    }

    this.cargandoAccion = true;
    this.cdr.detectChanges();

    const horaRegistro = new Date().toLocaleTimeString('es-ES');

    const listaPrevias: ActividadItem[] = (reg.actividades && reg.actividades.length > 0)
      ? [...reg.actividades]
      : (this.esActividadRegistrada(reg) ? [{ hora: reg.horaEntrada, texto: reg.observacion }] : []);

    const listaActualizada: ActividadItem[] = [
      ...listaPrevias,
      { hora: horaRegistro, texto: textoNuevaTarea }
    ];

    const resumenCompleto = listaActualizada
      .map(item => `[${item.hora}] ${item.texto}`)
      .join(' | ');

    reg.actividades = listaActualizada;
    reg.observacion = resumenCompleto;
    reg.actividadRegistrada = true;
    this.observacionActual = '';
    this.recalcularCronometros();

    try {
      const idReal = await this.obtenerIdRealRegistro(reg);
      if (idReal) {
        await this.registroService.actualizarRegistro(idReal, {
          actividades: listaActualizada,
          observacion: resumenCompleto,
          actividadRegistrada: true
        });
      }
      this.notificar(`✅ Tarea #${listaActualizada.length} agregada sin borrar las anteriores`, 'exito');
    } catch (e) {
      console.error(e);
      this.notificar('Error al guardar la tarea en la nube', 'alerta');
    } finally {
      this.cargandoAccion = false;
      this.cdr.detectChanges();
    }
  }

  abrirModalSalida(): void {
    if (!this.registroActivo) return;
    this.reporteFinalTexto = '';
    this.mostrarModalSalida = true;
    this.cdr.detectChanges();
  }

  cerrarModalSalida(): void {
    this.mostrarModalSalida = false;
    this.cdr.detectChanges();
  }

  async confirmarSalida(): Promise<void> {
    const reg = this.registroActivo;
    if (!reg) return;

    this.cargandoAccion = true;
    this.cdr.detectChanges();

    const ahora = new Date();
    const horaSalidaStr = ahora.toLocaleTimeString('es-ES');
    const repFinalStr = this.reporteFinalTexto.trim() || 'Turno concluido sin observaciones adicionales.';

    reg.horaSalida = horaSalidaStr;
    reg.estado = 'Completado';
    reg.totalHoras = 'Jornada Concluida';
    reg.reporteFinal = repFinalStr;

    this.mostrarModalSalida = false;
    this.observacionActual = '';
    this.reporteFinalTexto = '';
    this.recalcularCronometros();

    try {
      const idReal = await this.obtenerIdRealRegistro(reg);
      if (idReal) {
        await this.registroService.actualizarRegistro(idReal, {
          horaSalida: horaSalidaStr,
          estado: 'Completado',
          totalHoras: 'Jornada Concluida',
          reporteFinal: repFinalStr
        });
      }
      this.notificar(`🔴 Salida registrada a las ${horaSalidaStr}`, 'exito');
    } catch (e) {
      console.error(e);
    } finally {
      this.cargandoAccion = false;
      this.cdr.detectChanges();
    }
  }

  // --- EXPORTACIÓN DE REPORTES CSV ---
  exportarSoloHoras(): void {
    if (!this.empresa.habilitarReporteHoras) return;
    let csv = `\uFEFFID,${this.etiquetaSingular},Departamento,Fecha,Hora Entrada,Hora Escaneo QR,Inicio Comida,Fin Comida,Comidas Usadas,Hora Salida,Estado\n`;
    this.registrosFiltrados.forEach(r => {
      const comidasCount = typeof r.comidasRealizadas === 'number' ? r.comidasRealizadas : (r.horaPausaInicio ? 1 : 0);
      csv += `"${r.id || ''}","${r.empleadoNombre}","${r.departamento}","${r.fecha}","${r.horaEntrada}","${r.horaEscaneoQR || 'Sin escanear'}","${r.horaPausaInicio || '--'}","${r.horaPausaFin || '--'}","${comidasCount}","${r.horaSalida || 'En turno'}","${r.estado}"\n`;
    });
    this.descargarArchivoCSV(csv, `Reporte_Horas_${this.mesFiltroReporte}.csv`);
  }

  exportarSoloActividades(): void {
    if (!this.empresa.habilitarReporteInformes) return;
    let csv = `\uFEFFID,${this.etiquetaSingular},Departamento,Fecha,Tareas y Actividades Registradas,Reporte Final\n`;
    this.registrosFiltrados.forEach(r => {
      csv += `"${r.id || ''}","${r.empleadoNombre}","${r.departamento}","${r.fecha}","${(r.observacion || '').replace(/"/g, '""')}","${(r.reporteFinal || '').replace(/"/g, '""')}"\n`;
    });
    this.descargarArchivoCSV(csv, `Reporte_Informes_${this.mesFiltroReporte}.csv`);
  }

  exportarReporteCompleto(): void {
    if (!this.empresa.habilitarReporteCompleto) return;
    let csv = `\uFEFFID,Empresa,Ubicacion,${this.etiquetaSingular},Departamento,Fecha,Entrada,Escaneo QR,Inicio Comida,Fin Comida,Comidas Usadas,Salida,Estado,PIN QR,Tareas y Actividades,Reporte Final\n`;
    this.registrosFiltrados.forEach(r => {
      const comidasCount = typeof r.comidasRealizadas === 'number' ? r.comidasRealizadas : (r.horaPausaInicio ? 1 : 0);
      csv += `"${r.id || ''}","${this.empresa.nombre}","${this.empresa.ubicacion}","${r.empleadoNombre}","${r.departamento}","${r.fecha}","${r.horaEntrada}","${r.horaEscaneoQR || 'Sin escanear'}","${r.horaPausaInicio || '--'}","${r.horaPausaFin || '--'}","${comidasCount}","${r.horaSalida || 'En turno'}","${r.estado}","${r.codigoQR || ''}","${(r.observacion || '').replace(/"/g, '""')}","${(r.reporteFinal || '').replace(/"/g, '""')}"\n`;
    });
    this.descargarArchivoCSV(csv, `Reporte_Completo_${this.mesFiltroReporte}.csv`);
  }

  private descargarArchivoCSV(contenido: string, nombreArchivo: string): void {
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    this.notificar('📄 Reporte descargado correctamente', 'exito');
  }

  // --- LISTA COMPLETA Y CONTEO DE MIEMBROS DE ESTA COMPAÑÍA ---
  get listaEstudiantesRegistrados(): Usuario[] {
    return this.usuariosSistema.filter(u => (u.rol || '').toLowerCase() !== 'admin');
  }

  get estudiantesFiltradosAdmin(): Usuario[] {
    const q = this.busquedaAlumnoAdmin.trim().toLowerCase();
    if (!q) return this.listaEstudiantesRegistrados;
    return this.listaEstudiantesRegistrados.filter(u =>
      (u.nombre || '').toLowerCase().includes(q) ||
      (u.correo || '').toLowerCase().includes(q) ||
      (u.matricula || '').toLowerCase().includes(q) ||
      (u.departamento || '').toLowerCase().includes(q)
    );
  }

  get totalEstudiantes(): number {
    return this.listaEstudiantesRegistrados.length;
  }

  obtenerEstadoHoyAlumno(alumno: Usuario): string {
    const hoy = new Date().toLocaleDateString('es-ES');
    const email = (alumno.correo || '').toLowerCase();
    const nombre = (alumno.nombre || '').toLowerCase();

    const regHoy = this.registros.find(r =>
      r.fecha === hoy &&
      ((r.empleadoId || '').toLowerCase() === email || (r.empleadoNombre || '').toLowerCase() === nombre)
    );

    if (!regHoy) return '⚪ Sin marcaje hoy';
    if (regHoy.estado === 'Expirado' || regHoy.qrExpiradoSinEscanear || regHoy.comidaExpiradaSinRegresar || regHoy.tareaExpiradaSinRegistrar) {
      return '⛔ Cerrado / Bloqueado';
    }
    if (regHoy.estado === 'En Turno') return '🟢 En Turno (' + regHoy.horaEntrada + ')';
    if (regHoy.estado === 'En Pausa') return '☕ En Comida';
    return '✅ Completado';
  }

  get registrosFiltrados(): RegistroExtendido[] {
    return this.registros.filter(r => {
      const q = this.busquedaEmpleado.toLowerCase();
      const coincideBusqueda =
        (r.empleadoNombre || '').toLowerCase().includes(q) ||
        (r.departamento || '').toLowerCase().includes(q) ||
        (r.observacion || '').toLowerCase().includes(q);
      const coincideEstado = this.filtroEstado === 'TODOS' || r.estado === this.filtroEstado;
      return coincideBusqueda && coincideEstado;
    });
  }

  get misRegistrosEstudiante(): RegistroExtendido[] {
    if (!this.usuarioActual) return [];
    const userEmail = (this.usuarioActual.correo || '').toLowerCase();
    const userName = (this.usuarioActual.nombre || '').toLowerCase();
    const userId = this.usuarioActual.id ? String(this.usuarioActual.id) : '';

    return this.registros.filter(r =>
      (userId && String(r.empleadoId) === userId) ||
      (r.empleadoId && String(r.empleadoId).toLowerCase() === userEmail) ||
      (r.empleadoNombre && r.empleadoNombre.toLowerCase() === userName)
    );
  }

  get personalEnTurno(): number { return this.registros.filter(r => r.estado === 'En Turno').length; }
  get personalEnPausa(): number { return this.registros.filter(r => r.estado === 'En Pausa').length; }
  get totalCompletados(): number { return this.registros.filter(r => r.estado === 'Completado').length; }

  eliminarRegistro(id?: string): void {
    if (!id) return;
    this.registros = this.registros.filter(r => r.id !== id);
    if (!id.startsWith('temp_')) {
      this.registroService.eliminarRegistro(id).then(() => this.notificar('Registro eliminado', 'info'));
    }
    this.cdr.detectChanges();
  }

  eliminarUsuario(id?: string): void {
    if (!id) return;
    this.usuariosSistema = this.usuariosSistema.filter(u => u.id !== id);
    this.registroService.eliminarUsuario(id).then(() => this.notificar(`${this.etiquetaSingular} eliminado del directorio`, 'info'));
    this.cdr.detectChanges();
  }

  notificar(mensaje: string, tipo: 'exito' | 'alerta' | 'info' = 'exito'): void {
    this.mensajeToast = mensaje;
    this.tipoToast = tipo;
    this.mostrarToast = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.mostrarToast = false;
      this.cdr.detectChanges();
    }, 4200);
  }
}