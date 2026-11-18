import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RegistroService, Empresa, Usuario, Registro, QrKioscoActivo, ActividadItem } from './services/registro';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
  encapsulation: ViewEncapsulation.None
})
export class App implements OnInit, OnDestroy {
  pantallaActual: 'bienvenida' | 'login' | 'registro' | 'dashboard' = 'bienvenida';
  tabAuth: 'login' | 'registro' = 'login';

  usuarioActual: Usuario | null = null;
  sesionIniciada: boolean = false;

  empresa: Empresa = {
    nombre: 'TickTock Asistencia',
    sucursal: '',
    ubicacion: '',
    codigo: 'TT-2026',
    horario: '',
    horaInicio: '',
    horaFin: '',
    colorTema: '#f97316',
    duracionComidaMinutos: 45,
    habilitarFormEstudiantes: true,
    habilitarReporteHoras: true,
    habilitarReporteInformes: true,
    habilitarReporteCompleto: true,
    departamentosPersonalizados: [],
    emailjsServiceId: '',
    emailjsTemplateId: '',
    emailjsPublicKey: ''
  };

  temasDisponibles = [
    { nombre: 'Naranja Vibrante', hex: '#f97316' },
    { nombre: 'Azul Cielo', hex: '#2563eb' },
    { nombre: 'Morado Índigo', hex: '#7c3aed' },
    { nombre: 'Rosa Coral', hex: '#e11d48' },
    { nombre: 'Verde Turquesa', hex: '#0d9488' }
  ];

  opcionesHorario: string[] = [
    '5:00 de la mañana',
    '6:00 de la mañana',
    '7:00 de la mañana',
    '7:30 de la mañana',
    '8:00 de la mañana',
    '8:30 de la mañana',
    '9:00 de la mañana',
    '9:30 de la mañana',
    '10:00 de la mañana',
    '11:00 de la mañana',
    '12:00 del mediodía',
    '1:00 de la tarde',
    '2:00 de la tarde',
    '3:00 de la tarde',
    '4:00 de la tarde',
    '5:00 de la tarde',
    '6:00 de la tarde',
    '7:00 de la tarde',
    '8:00 de la noche',
    '9:00 de la noche',
    '10:00 de la noche',
    '11:00 de la noche'
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

  // Formularios Auth
  formCorreo: string = '';
  formPassword: string = '';
  formNombre: string = '';
  formRol: 'estudiante' | 'admin' = 'estudiante';
  formDepartamento: string = 'General';
  formDepartamentoPersonalizado: string = '';
  formAvatar: string = '🧑‍💻';
  formEmpresaNombre: string = '';
  formSucursal: string = '';
  formUbicacion: string = '';
  formHoraInicio: string = '';
  formHoraFin: string = '';
  formTelefono: string = '';
  formMatricula: string = '';

  // Modal Nuevo Estudiante (Admin)
  mostrarModalNuevoEstudiante: boolean = false;
  adminNuevoNombre: string = '';
  adminNuevoCorreo: string = '';
  adminNuevoPassword: string = '';
  adminNuevoDept: string = 'General';
  adminNuevoDeptPersonalizado: string = '';
  adminNuevoAvatar: string = '🧑‍💻';
  adminNuevoTel: string = '';
  adminNuevoMatricula: string = '';

  // Modal Editar Estudiante (Admin)
  mostrarModalEditarEstudiante: boolean = false;
  editEstudianteId: string = '';
  editEstudianteNombre: string = '';
  editEstudianteMatricula: string = '';
  editEstudianteCorreo: string = '';
  editEstudianteTelefono: string = '';
  editEstudianteDept: string = 'General';
  editEstudianteDeptPersonalizado: string = '';
  editEstudiantePassword: string = '';

  // Verificación de 2 Pasos por Gmail ("¿Eres tú?")
  mostrarModalVerificacionGmail: boolean = false;
  usuarioPendienteVerificacion: Usuario | null = null;
  codigoVerificacionIngresado: string = '';
  enlaceVerificacionGenerado: string = '';
  enviandoCorreoGmail: boolean = false;
  mensajeExitoVerificacionLink: string = '';

  // QR & Cámara Real
  mostrarModalQR: boolean = false;
  mostrarModalCamaraMovil: boolean = false;
  codigoGeneradoQR: string = '';
  qrImagenUrl: string = '';
  timestampQRGenerado: number = 0;

  qrKioscoActivo: QrKioscoActivo | null = null;
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
  private avisoComida2MinDado: boolean = false;
  private avisoComida1MinDado: boolean = false;

  usuariosSistema: Usuario[] = [];
  registros: Registro[] = [];

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

  mostrarToast: boolean = false;
  mensajeToast: string = '';
  tipoToast: 'exito' | 'alerta' | 'info' = 'exito';

  constructor(
    private registroService: RegistroService,
    private cdr: ChangeDetectorRef
  ) {}

  get listaDepartamentosCompleta(): string[] {
    const personalizados = this.empresa.departamentosPersonalizados || [];
    const combinados = [...this.departamentosBase, ...personalizados];
    return Array.from(new Set(combinados.filter(d => d && d.trim().length > 0)));
  }

  ngOnInit(): void {
    this.cargarLibreriasQR();
    this.cargarConfiguracionLocal();
    this.cargarSesionGuardada();
    this.iniciarRelojYCronometros();
    this.procesarEnlaceVerificacionGmail();
    this.recargarDatosDesdeNube(false);

    // Suscripción en tiempo real a colores y configuración de empresa
    this.registroService.getEmpresaConfig().subscribe({
      next: (cfg) => {
        if (cfg) {
          this.aplicarConfiguracionRecibida(cfg);
        }
      },
      error: (err) => console.error('Error config empresa:', err)
    });

    this.registroService.getQrKiosco().subscribe({
      next: (qr) => {
        this.qrKioscoActivo = qr || null;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error QR kiosco:', err)
    });

    // Suscripción en tiempo real a registros (detecta al instante cuando escaneas el QR con el celular)
    this.registroService.getRegistros().subscribe({
      next: (data: Registro[]) => {
        const previoVerificado = this.registroActivo?.verificadoCamaraMovil;
        this.registros = (data || []).sort((a, b) => (b.timestampEntrada || 0) - (a.timestampEntrada || 0));
        const actualVerificado = this.registroActivo?.verificadoCamaraMovil;

        // Si el QR acaba de ser escaneado desde el celular, cerrar el modal QR en la PC al instante
        if (!previoVerificado && actualVerificado && this.mostrarModalQR) {
          this.mostrarModalQR = false;
          this.notificar(`✅ ¡Código QR escaneado a las ${this.registroActivo?.horaEscaneoQR}!`, 'exito');
        }

        this.recalcularCronometros();
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error('Error registros:', err)
    });

    // Suscripción en tiempo real a usuarios (detecta al instante cuando confirman "Sí, soy yo" en Gmail)
    this.registroService.getUsuarios().subscribe({
      next: (data: Usuario[]) => {
        this.usuariosSistema = data || [];

        if (this.mostrarModalVerificacionGmail && this.usuarioPendienteVerificacion) {
          const actualizado = this.usuariosSistema.find(
            u => u.correo.toLowerCase() === this.usuarioPendienteVerificacion!.correo.toLowerCase()
          );
          if (actualizado && actualizado.verificadoCorreo) {
            this.mostrarModalVerificacionGmail = false;
            const eraAutoregistro = !this.sesionIniciada;
            this.usuarioPendienteVerificacion = null;
            this.notificar('✅ ¡Correo verificado en Gmail! Registro completado.', 'exito');
            if (eraAutoregistro) {
              this.iniciarSesionUsuario(actualizado);
            }
          }
        }

        this.cdr.detectChanges();
      },
      error: (err: any) => console.error('Error usuarios:', err)
    });
  }

  ngOnDestroy(): void {
    if (this.masterTimerId) clearInterval(this.masterTimerId);
    this.detenerCamara();
  }

  // --- PROCESAR ENLACE DE VERIFICACIÓN EN 2 PASOS ("¿Eres tú?") DESDE GMAIL ---
  private async procesarEnlaceVerificacionGmail(): Promise<void> {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('verificar');
    if (!token) return;

    // Limpiar el parámetro de la URL
    window.history.replaceState({}, document.title, window.location.pathname);

    const verificado = await this.registroService.verificarUsuarioPorToken(token);
    if (verificado) {
      this.mensajeExitoVerificacionLink = `✅ ¡Identidad confirmada! El correo ${verificado.correo} ha sido verificado ("Sí, soy yo"). Ya puedes usar TickTock.`;
      this.notificar(`✅ Correo ${verificado.correo} verificado correctamente`, 'exito');
      if (!this.sesionIniciada) {
        this.iniciarSesionUsuario(verificado);
      }
      this.cdr.detectChanges();
    } else {
      this.notificar('⚠️ El enlace de verificación no es válido o ya expiró', 'alerta');
    }
  }

  // --- GESTIÓN GLOBAL DE COLORES EN TIEMPO REAL ---
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

  private cargarConfiguracionLocal(): void {
    const raw = localStorage.getItem('ticktock_empresa_cfg');
    if (raw) {
      try {
        const saved = JSON.parse(raw);
        if (saved) {
          this.empresa = { ...this.empresa, ...saved };
        }
      } catch {
        localStorage.removeItem('ticktock_empresa_cfg');
      }
    }
    this.aplicarVariablesGlobalesCSS(this.empresa.colorTema || '#f97316');
  }

  private aplicarConfiguracionRecibida(cfg: Partial<Empresa>): void {
    this.empresa = {
      ...this.empresa,
      ...cfg,
      colorTema: cfg.colorTema || this.empresa.colorTema || '#f97316',
      departamentosPersonalizados: cfg.departamentosPersonalizados || this.empresa.departamentosPersonalizados || []
    };
    this.aplicarVariablesGlobalesCSS(this.empresa.colorTema!);
    localStorage.setItem('ticktock_empresa_cfg', JSON.stringify(this.empresa));
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
    localStorage.setItem('ticktock_empresa_cfg', JSON.stringify(this.empresa));
    this.cdr.detectChanges();
  }

  async cambiarColorTemaRapido(hex: string): Promise<void> {
    this.empresa.colorTema = hex;
    this.aplicarVariablesGlobalesCSS(hex);
    localStorage.setItem('ticktock_empresa_cfg', JSON.stringify(this.empresa));
    this.cdr.detectChanges();

    try {
      await this.registroService.guardarEmpresaConfig(this.empresa);
      this.notificar('🎨 Color actualizado al instante para todos', 'exito');
    } catch (e) {
      console.error('Error guardando color en Firebase:', e);
      this.notificar('⚠️ Color aplicado localmente, revisa conexión', 'alerta');
    }
  }

  private async registrarDepartamentoSiEsNuevo(nombreDepto: string): Promise<void> {
    const limpio = nombreDepto.trim();
    if (!limpio) return;
    const existe = this.listaDepartamentosCompleta.some(d => d.toLowerCase() === limpio.toLowerCase());
    if (!existe) {
      const actuales = this.empresa.departamentosPersonalizados || [];
      this.empresa.departamentosPersonalizados = [...actuales, limpio];
      localStorage.setItem('ticktock_empresa_cfg', JSON.stringify(this.empresa));
      try {
        await this.registroService.guardarEmpresaConfig(this.empresa);
      } catch (e) {
        console.error('Error guardando departamento personalizado:', e);
      }
    }
  }

  async recargarDatosDesdeNube(mostrarAviso: boolean = true): Promise<void> {
    try {
      const [cfgNube, usuarios, registros, qrKiosco] = await Promise.all([
        this.registroService.obtenerEmpresaConfigDirecto(),
        this.registroService.obtenerUsuariosDirecto(),
        this.registroService.obtenerRegistrosDirecto(),
        this.registroService.obtenerQrKioscoDirecto()
      ]);

      if (cfgNube) {
        this.aplicarConfiguracionRecibida(cfgNube);
      }
      if (usuarios.length > 0) this.usuariosSistema = usuarios;
      if (registros.length > 0) {
        this.registros = registros.sort((a, b) => (b.timestampEntrada || 0) - (a.timestampEntrada || 0));
      }
      if (qrKiosco) this.qrKioscoActivo = qrKiosco;

      this.recalcularCronometros();
      this.cdr.detectChanges();
      if (mostrarAviso) {
        this.notificar(`🔄 Datos sincronizados (${this.totalEstudiantes} alumnos)`, 'info');
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

  private recalcularCronometros(): void {
    const ahoraMs = Date.now();
    const reg = this.registroActivo;

    const refQrTs = this.mostrarModalQR && this.timestampQRGenerado
      ? this.timestampQRGenerado
      : (reg?.timestampQR || reg?.timestampEntrada || this.qrKioscoActivo?.timestamp || 0);

    if (refQrTs > 0 && (!reg || !reg.verificadoCamaraMovil)) {
      const restQR = 900 - Math.floor((ahoraMs - refQrTs) / 1000);
      this.tiempoRestanteQR = restQR > 0 ? restQR : 0;
    } else {
      this.tiempoRestanteQR = 0;
    }

    if (reg && !this.esActividadRegistrada(reg) && reg.timestampEntrada) {
      const restAct = 600 - Math.floor((ahoraMs - reg.timestampEntrada) / 1000);
      this.tiempoRestanteActividad = restAct > 0 ? restAct : 0;
    } else {
      this.tiempoRestanteActividad = 0;
    }

    if (reg && reg.estado === 'En Pausa' && reg.timestampPausaInicio) {
      const totalSegsComida = (Number(this.empresa.duracionComidaMinutos) || 45) * 60;
      const restPausa = totalSegsComida - Math.floor((ahoraMs - reg.timestampPausaInicio) / 1000);
      this.tiempoRestantePausa = restPausa > 0 ? restPausa : 0;

      if (this.tiempoRestantePausa === 120 && !this.avisoComida2MinDado) {
        this.avisoComida2MinDado = true;
        this.notificar('⏰ ¡Faltan 2 MINUTOS para terminar tu tiempo de comida!', 'alerta');
      } else if (this.tiempoRestantePausa === 60 && !this.avisoComida1MinDado) {
        this.avisoComida1MinDado = true;
        this.notificar('⚠️ ¡Falta 1 MINUTO! Prepárate para presionar Terminar Comida.', 'alerta');
      }
    } else {
      this.tiempoRestantePausa = 0;
      this.avisoComida2MinDado = false;
      this.avisoComida1MinDado = false;
    }
  }

  formatearSegundos(segundos: number): string {
    const mins = Math.floor(segundos / 60).toString().padStart(2, '0');
    const segs = (segundos % 60).toString().padStart(2, '0');
    return `${mins}:${segs}`;
  }

  esActividadRegistrada(reg?: Registro): boolean {
    if (!reg) return false;
    if (reg.actividades && reg.actividades.length > 0) return true;
    if (reg.actividadRegistrada) return true;
    return !!reg.observacion && !reg.observacion.toLowerCase().includes('pendiente');
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

  // --- ENVÍO DE CORREO GMAIL DE VERIFICACIÓN EN 2 PASOS ("¿Eres tú?") ---
  private async iniciarFlujoVerificacionGmail(usuario: Usuario): Promise<void> {
    const origen = window.location.origin;
    const enlace = `${origen}/?verificar=${encodeURIComponent(usuario.tokenVerificacion || '')}`;

    this.usuarioPendienteVerificacion = usuario;
    this.enlaceVerificacionGenerado = enlace;
    this.codigoVerificacionIngresado = '';
    this.mostrarModalVerificacionGmail = true;
    this.cdr.detectChanges();

    // Si el Admin configuró EmailJS, enviamos el correo automáticamente a Gmail
    if (this.empresa.emailjsServiceId && this.empresa.emailjsTemplateId && this.empresa.emailjsPublicKey) {
      this.enviandoCorreoGmail = true;
      this.cdr.detectChanges();
      try {
        await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: this.empresa.emailjsServiceId.trim(),
            template_id: this.empresa.emailjsTemplateId.trim(),
            user_id: this.empresa.emailjsPublicKey.trim(),
            template_params: {
              to_email: usuario.correo,
              to_name: usuario.nombre,
              app_name: this.empresa.nombre || 'TickTock',
              verification_link: enlace,
              verification_code: usuario.codigoVerificacion,
              message: `¿Eres tú la persona que se está registrando en ${this.empresa.nombre || 'TickTock'}? Haz clic en "Sí, soy yo" en el enlace: ${enlace} o usa el código ${usuario.codigoVerificacion}`
            }
          })
        });
        this.notificar(`📧 Correo de confirmación enviado a ${usuario.correo}`, 'exito');
      } catch (e) {
        console.error('Error enviando correo automático:', e);
      } finally {
        this.enviandoCorreoGmail = false;
        this.cdr.detectChanges();
      }
    }
  }

  abrirGmailParaConfirmar(): void {
    if (!this.usuarioPendienteVerificacion) return;
    const u = this.usuarioPendienteVerificacion;
    const asunto = encodeURIComponent(`¿Eres tú? Confirma tu registro en ${this.empresa.nombre || 'TickTock'}`);
    const cuerpo = encodeURIComponent(
      `Hola ${u.nombre},\n\n` +
      `Se ha iniciado un registro con tu correo (${u.correo}) en la plataforma ${this.empresa.nombre || 'TickTock'}.\n\n` +
      `¿Eres tú la persona que se está registrando?\n` +
      `👉 Haz clic aquí para confirmar ("Sí, soy yo"):\n${this.enlaceVerificacionGenerado}\n\n` +
      `O ingresa este código de verificación en la página: ${u.codigoVerificacion}\n\n` +
      `Si no fuiste tú, ignora este mensaje.`
    );
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(u.correo)}&su=${asunto}&body=${cuerpo}`, '_blank');
  }

  async confirmarCodigoVerificacion2Pasos(): Promise<void> {
    if (!this.usuarioPendienteVerificacion) return;
    const codigoLimpio = this.codigoVerificacionIngresado.trim();

    if (!codigoLimpio || codigoLimpio !== this.usuarioPendienteVerificacion.codigoVerificacion) {
      this.notificar('❌ El código de verificación no coincide. Revisa el correo Gmail.', 'alerta');
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
      this.notificar('✅ ¡Sí, soy yo confirmado! Registro verificado con éxito.', 'exito');

      if (eraAutoregistro) {
        this.iniciarSesionUsuario(u);
      }
    } catch (e) {
      console.error(e);
      this.notificar('Error al confirmar verificación', 'alerta');
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
    this.iniciarFlujoVerificacionGmail(alumno);
  }

  // --- GESTIÓN DE ALUMNOS (ADMIN: ALTA Y EDICIÓN COMPLETA) ---
  abrirModalNuevoEstudiante(): void {
    this.adminNuevoNombre = '';
    this.adminNuevoCorreo = '';
    this.adminNuevoPassword = '';
    this.adminNuevoDept = 'General';
    this.adminNuevoDeptPersonalizado = '';
    this.adminNuevoAvatar = '🧑‍💻';
    this.adminNuevoTel = '';
    this.adminNuevoMatricula = '';
    this.mostrarModalNuevoEstudiante = true;
    this.cdr.detectChanges();
  }

  cerrarModalNuevoEstudiante(): void {
    this.mostrarModalNuevoEstudiante = false;
    this.cdr.detectChanges();
  }

  async registrarEstudiantePorAdmin(): Promise<void> {
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
        this.notificar('Este correo ya está registrado', 'alerta');
        return;
      }

      await this.registrarDepartamentoSiEsNuevo(deptoFinal);

      const token = 'VRF-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const codigo6 = Math.floor(100000 + Math.random() * 900000).toString();

      const nuevoEstudiante: Usuario = {
        nombre: this.adminNuevoNombre.trim(),
        correo: correoNorm,
        password: this.adminNuevoPassword.trim(),
        rol: 'estudiante',
        departamento: deptoFinal,
        avatar: this.adminNuevoAvatar,
        puesto: 'Estudiante / Colaborador',
        empresaNombre: this.empresa.nombre,
        sucursal: this.empresa.sucursal,
        horario: this.empresa.horario,
        telefono: this.adminNuevoTel.trim(),
        matricula: this.adminNuevoMatricula.trim(),
        verificadoCorreo: false,
        tokenVerificacion: token,
        codigoVerificacion: codigo6
      };

      const docRef = await this.registroService.registrarUsuario(nuevoEstudiante);
      nuevoEstudiante.id = docRef.id;
      this.usuariosSistema = [...this.usuariosSistema, nuevoEstudiante];

      this.mostrarModalNuevoEstudiante = false;
      this.notificar(`📧 Alumno creado. Falta confirmar "¿Eres tú?" en Gmail (${correoNorm})`, 'info');
      await this.iniciarFlujoVerificacionGmail(nuevoEstudiante);
    } catch (error) {
      console.error(error);
      this.notificar('Error al guardar alumno en Firebase', 'alerta');
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
      this.notificar('✅ Datos del estudiante actualizados correctamente', 'exito');
    } catch (e) {
      console.error('Error editando estudiante:', e);
      this.notificar('Error al actualizar datos del estudiante', 'alerta');
    } finally {
      this.cargandoAccion = false;
      this.cdr.detectChanges();
    }
  }

  // --- REGISTRO Y LOGIN ---
  async ejecutarRegistro(): Promise<void> {
    if (!this.formNombre.trim() || !this.formCorreo.trim() || !this.formPassword.trim()) {
      this.notificar('Completa tu nombre, correo y contraseña', 'alerta');
      return;
    }

    const deptoFinal = this.formDepartamento === '__OTRO__'
      ? this.formDepartamentoPersonalizado.trim()
      : this.formDepartamento;

    if (!deptoFinal) {
      this.notificar('Escribe el nombre de tu departamento o área', 'alerta');
      return;
    }

    this.cargandoAccion = true;
    this.cdr.detectChanges();
    const correoNorm = this.formCorreo.trim().toLowerCase();

    const horarioFormateado = (this.formHoraInicio && this.formHoraFin)
      ? `De ${this.formHoraInicio} a ${this.formHoraFin}`
      : (this.formHoraInicio ? `Desde ${this.formHoraInicio}` : (this.empresa.horario || 'Por definir'));

    try {
      const existe = await this.registroService.buscarUsuarioPorCorreo(correoNorm);
      if (existe) {
        this.notificar('Este correo ya existe en la plataforma', 'alerta');
        return;
      }

      await this.registrarDepartamentoSiEsNuevo(deptoFinal);

      const token = 'VRF-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const codigo6 = Math.floor(100000 + Math.random() * 900000).toString();

      const nuevoUsuario: Usuario = {
        nombre: this.formNombre.trim(),
        correo: correoNorm,
        password: this.formPassword.trim(),
        rol: this.formRol,
        departamento: deptoFinal,
        avatar: this.formAvatar,
        puesto: this.formRol === 'admin' ? 'Administrador General' : 'Estudiante / Colaborador',
        empresaNombre: this.formEmpresaNombre.trim() || this.empresa.nombre,
        sucursal: this.formSucursal.trim() || this.empresa.sucursal,
        horario: horarioFormateado,
        telefono: this.formTelefono.trim(),
        matricula: this.formMatricula.trim(),
        verificadoCorreo: false,
        tokenVerificacion: token,
        codigoVerificacion: codigo6
      };

      if (this.formRol === 'admin') {
        if (this.formEmpresaNombre.trim()) this.empresa.nombre = this.formEmpresaNombre.trim();
        if (this.formSucursal.trim()) this.empresa.sucursal = this.formSucursal.trim();
        if (this.formUbicacion.trim()) this.empresa.ubicacion = this.formUbicacion.trim();
        if (this.formHoraInicio) this.empresa.horaInicio = this.formHoraInicio;
        if (this.formHoraFin) this.empresa.horaFin = this.formHoraFin;
        if (this.formHoraInicio || this.formHoraFin) this.empresa.horario = horarioFormateado;
        localStorage.setItem('ticktock_empresa_cfg', JSON.stringify(this.empresa));
        await this.registroService.guardarEmpresaConfig(this.empresa);
      }

      const docRef = await this.registroService.registrarUsuario(nuevoUsuario);
      nuevoUsuario.id = docRef.id;
      this.usuariosSistema = [...this.usuariosSistema, nuevoUsuario];

      this.limpiarFormularioAuth();
      await this.iniciarFlujoVerificacionGmail(nuevoUsuario);
    } catch (error) {
      console.error(error);
      this.notificar('Error al crear la cuenta', 'alerta');
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
      let usuario = await this.registroService.buscarUsuarioPorCorreo(correoBuscado);
      if (!usuario) {
        usuario = this.usuariosSistema.find(u => u.correo.toLowerCase() === correoBuscado) || null;
      }

      if (usuario && usuario.password === passBuscada) {
        // Si tiene verificación de correo pendiente, pedir confirmación de 2 pasos
        if (usuario.verificadoCorreo === false) {
          this.notificar('⚠️ Confirma primero tu correo Gmail ("¿Eres tú?") para iniciar sesión.', 'alerta');
          await this.iniciarFlujoVerificacionGmail(usuario);
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
    this.usuarioActual = { ...usuario };
    this.sesionIniciada = true;
    this.pantallaActual = 'dashboard';
    sessionStorage.setItem('ticktock_user_tab', JSON.stringify(this.usuarioActual));
    localStorage.removeItem('ticktock_user');
    this.recalcularCronometros();
    this.cdr.detectChanges();
  }

  cerrarSesion(): void {
    this.usuarioActual = null;
    this.sesionIniciada = false;
    this.pantallaActual = 'bienvenida';
    sessionStorage.removeItem('ticktock_user_tab');
    localStorage.removeItem('ticktock_user');
    this.notificar('Sesión cerrada en esta pestaña', 'info');
    this.cdr.detectChanges();
  }

  cargarSesionGuardada(): void {
    localStorage.removeItem('ticktock_user');
    const raw = sessionStorage.getItem('ticktock_user_tab');
    if (raw) {
      try {
        const user = JSON.parse(raw);
        if (user && user.nombre && user.rol) {
          this.usuarioActual = user;
          this.sesionIniciada = true;
          this.pantallaActual = 'dashboard';
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
    this.formMatricula = '';
    this.formTelefono = '';
    this.formDepartamento = 'General';
    this.formDepartamentoPersonalizado = '';
  }

  // --- CONFIGURACIÓN DE EMPRESA ---
  abrirModalEmpresa(): void {
    this.mostrarModalEmpresa = true;
    this.cdr.detectChanges();
  }

  cerrarModalEmpresa(): void {
    this.mostrarModalEmpresa = false;
    this.cdr.detectChanges();
  }

  async guardarConfiguracionEmpresa(): Promise<void> {
    this.cargandoAccion = true;
    this.cdr.detectChanges();

    if (this.empresa.horaInicio && this.empresa.horaFin) {
      this.empresa.horario = `De ${this.empresa.horaInicio} a ${this.empresa.horaFin}`;
    } else if (this.empresa.horaInicio) {
      this.empresa.horario = `Desde ${this.empresa.horaInicio}`;
    }

    this.aplicarVariablesGlobalesCSS(this.empresa.colorTema || '#f97316');
    localStorage.setItem('ticktock_empresa_cfg', JSON.stringify(this.empresa));

    try {
      await this.registroService.guardarEmpresaConfig(this.empresa);
      this.notificar('✅ Configuración, horario y color guardados para todos', 'exito');
      this.mostrarModalEmpresa = false;
    } catch (e) {
      console.error(e);
      this.notificar('Error al guardar en la nube', 'alerta');
    } finally {
      this.cargandoAccion = false;
      this.cdr.detectChanges();
    }
  }

  // --- DETECCIÓN DE TURNO ACTIVO ---
  get registroActivo(): Registro | undefined {
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

  get estaEnTurno(): boolean { return this.registroActivo?.estado === 'En Turno'; }
  get estaEnPausa(): boolean { return this.registroActivo?.estado === 'En Pausa'; }

  get comidaYaUtilizada(): boolean {
    const reg = this.registroActivo;
    if (!reg) return false;
    return !!(reg.comidaTerminada || (reg.horaPausaInicio && reg.horaPausaFin));
  }

  private async obtenerIdRealRegistro(reg: Registro): Promise<string | null> {
    if (reg.id && !reg.id.startsWith('temp_')) return reg.id;
    const encontrado = this.registros.find(
      r => r.id && !r.id.startsWith('temp_') && r.timestampEntrada === reg.timestampEntrada
    );
    if (encontrado?.id) return encontrado.id;

    const frescos = await this.registroService.obtenerRegistrosDirecto();
    const match = frescos.find(
      r => r.timestampEntrada === reg.timestampEntrada ||
           (r.codigoQR && r.codigoQR === reg.codigoQR && r.estado !== 'Completado')
    );
    return match?.id || null;
  }

  async marcarEntrada(): Promise<void> {
    if (!this.usuarioActual || this.estaEnTurno || this.estaEnPausa || this.cargandoAccion) return;

    this.cargandoAccion = true;
    this.cdr.detectChanges();

    const ahora = new Date();
    const ahoraMs = ahora.getTime();
    const horaStr = ahora.toLocaleTimeString('es-ES');
    const mesAno = ahora.toISOString().substring(0, 7);
    const pin = 'TK-' + Math.floor(100000 + Math.random() * 900000);

    const textoInicial = this.observacionActual.trim();
    const tieneActividadInicial = textoInicial.length > 0;
    const listaActividadesInicial: ActividadItem[] = tieneActividadInicial
      ? [{ hora: horaStr, texto: textoInicial }]
      : [];

    const resumenObservacion = tieneActividadInicial
      ? `[${horaStr}] ${textoInicial}`
      : 'Pendiente de registrar actividad';

    const nuevo: Registro = {
      id: 'temp_' + ahoraMs,
      empleadoId: String(this.usuarioActual.correo).toLowerCase(),
      empleadoNombre: this.usuarioActual.nombre,
      puesto: this.usuarioActual.puesto || 'Estudiante / Colaborador',
      departamento: this.usuarioActual.departamento || 'General',
      fecha: ahora.toLocaleDateString('es-ES'),
      mesAno,
      horaEntrada: horaStr,
      estado: 'En Turno',
      observacion: resumenObservacion,
      actividades: listaActividadesInicial,
      actividadRegistrada: tieneActividadInicial,
      comidaTerminada: false,
      timestampEntrada: ahoraMs,
      timestampQR: ahoraMs,
      codigoQR: pin,
      verificadoCamaraMovil: false,
      horaEscaneoQR: ''
    };

    this.registros = [nuevo, ...this.registros];
    this.observacionActual = '';
    await this.mostrarQRConTemporizador(pin, ahoraMs);
    this.recalcularCronometros();
    this.notificar('🟢 Entrada iniciada. Escanea el QR con tu celular.', 'exito');

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
      const LIMITE_15_MIN_MS = 15 * 60 * 1000;

      const registrosFrescos = await this.registroService.obtenerRegistrosDirecto();
      if (registrosFrescos.length > 0) {
        this.registros = registrosFrescos.sort((a, b) => (b.timestampEntrada || 0) - (a.timestampEntrada || 0));
      }

      const regAlumno = this.registroActivo;
      const pinRegistroAlumno = this.extraerSoloDigitosOPin(regAlumno?.codigoQR);

      if (regAlumno && pinRegistroAlumno && (pinIngresado === pinRegistroAlumno || pinIngresado.includes(pinRegistroAlumno))) {
        const tsCreacion = regAlumno.timestampQR || regAlumno.timestampEntrada || 0;
        if (tsCreacion > 0 && (ahoraMs - tsCreacion > LIMITE_15_MIN_MS)) {
          this.errorModalEscaner = '❌ El código QR caducó (pasaron más de 15 minutos).';
          this.notificar('El código QR ya caducó (límite 15 min)', 'alerta');
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

      const registroCoincidente = this.registros.find(r => {
        if (r.estado === 'Completado') return false;
        const p = this.extraerSoloDigitosOPin(r.codigoQR);
        return p && (p === pinIngresado || pinIngresado.includes(p));
      });

      if (registroCoincidente) {
        const tsCreacion = registroCoincidente.timestampQR || registroCoincidente.timestampEntrada || 0;
        if (tsCreacion > 0 && (ahoraMs - tsCreacion > LIMITE_15_MIN_MS)) {
          this.errorModalEscaner = '❌ Ese código QR ya caducó (pasaron más de 15 minutos).';
          return;
        }

        registroCoincidente.verificadoCamaraMovil = true;
        registroCoincidente.horaEscaneoQR = horaExacta;
        if (registroCoincidente.id && !registroCoincidente.id.startsWith('temp_')) {
          await this.registroService.actualizarRegistro(registroCoincidente.id, {
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

  // --- PAUSA COMIDA DE UN SOLO USO POR JORNADA ---
  async conmutarPausa(): Promise<void> {
    const reg = this.registroActivo;
    if (!reg) {
      this.notificar('No tienes un turno activo', 'alerta');
      return;
    }
    if (this.cargandoAccion) return;

    if (reg.estado === 'En Turno' && this.comidaYaUtilizada) {
      this.notificar('⚠️ Ya utilizaste tu única comida permitida en esta jornada.', 'alerta');
      return;
    }

    this.cargandoAccion = true;
    this.cdr.detectChanges();

    const ahora = new Date();
    const horaActual = ahora.toLocaleTimeString('es-ES');
    const pasandoAPausa = reg.estado === 'En Turno';

    const nuevoEstado: 'En Pausa' | 'En Turno' = pasandoAPausa ? 'En Pausa' : 'En Turno';
    const datosActualizar: Partial<Registro> = { estado: nuevoEstado };

    if (pasandoAPausa) {
      reg.estado = 'En Pausa';
      reg.horaPausaInicio = horaActual;
      reg.timestampPausaInicio = ahora.getTime();
      datosActualizar.horaPausaInicio = horaActual;
      datosActualizar.timestampPausaInicio = ahora.getTime();

      const minsComida = Number(this.empresa.duracionComidaMinutos) || 45;
      this.recalcularCronometros();
      this.notificar(`☕ Comida iniciada (${horaActual}). Tienes ${minsComida} min (uso único).`, 'info');
    } else {
      const segundosUsados = reg.timestampPausaInicio
        ? Math.max(1, Math.floor((ahora.getTime() - reg.timestampPausaInicio) / 1000))
        : 0;

      reg.estado = 'En Turno';
      reg.horaPausaFin = horaActual;
      reg.comidaTerminada = true;
      reg.segundosComidaUsados = segundosUsados;

      datosActualizar.horaPausaFin = horaActual;
      datosActualizar.comidaTerminada = true;
      datosActualizar.segundosComidaUsados = segundosUsados;

      this.recalcularCronometros();
      this.notificar(`✅ Comida finalizada a las ${horaActual}. Turno reanudado.`, 'exito');
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
    let csv = '\uFEFFID,Estudiante,Departamento,Fecha,Hora Entrada,Hora Escaneo QR,Inicio Comida,Fin Comida,Hora Salida,Estado\n';
    this.registrosFiltrados.forEach(r => {
      csv += `"${r.id || ''}","${r.empleadoNombre}","${r.departamento}","${r.fecha}","${r.horaEntrada}","${r.horaEscaneoQR || 'Sin escanear'}","${r.horaPausaInicio || '--'}","${r.horaPausaFin || '--'}","${r.horaSalida || 'En turno'}","${r.estado}"\n`;
    });
    this.descargarArchivoCSV(csv, `Reporte_Horas_${this.mesFiltroReporte}.csv`);
  }

  exportarSoloActividades(): void {
    if (!this.empresa.habilitarReporteInformes) return;
    let csv = '\uFEFFID,Estudiante,Departamento,Fecha,Tareas y Actividades Registradas,Reporte Final\n';
    this.registrosFiltrados.forEach(r => {
      csv += `"${r.id || ''}","${r.empleadoNombre}","${r.departamento}","${r.fecha}","${(r.observacion || '').replace(/"/g, '""')}","${(r.reporteFinal || '').replace(/"/g, '""')}"\n`;
    });
    this.descargarArchivoCSV(csv, `Reporte_Informes_${this.mesFiltroReporte}.csv`);
  }

  exportarReporteCompleto(): void {
    if (!this.empresa.habilitarReporteCompleto) return;
    let csv = '\uFEFFID,Empresa,Ubicacion,Estudiante,Departamento,Fecha,Entrada,Escaneo QR,Inicio Comida,Fin Comida,Salida,Estado,PIN QR,Tareas y Actividades,Reporte Final\n';
    this.registrosFiltrados.forEach(r => {
      csv += `"${r.id || ''}","${this.empresa.nombre}","${this.empresa.ubicacion}","${r.empleadoNombre}","${r.departamento}","${r.fecha}","${r.horaEntrada}","${r.horaEscaneoQR || 'Sin escanear'}","${r.horaPausaInicio || '--'}","${r.horaPausaFin || '--'}","${r.horaSalida || 'En turno'}","${r.estado}","${r.codigoQR || ''}","${(r.observacion || '').replace(/"/g, '""')}","${(r.reporteFinal || '').replace(/"/g, '""')}"\n`;
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

  // --- LISTA COMPLETA Y CONTEO DE ALUMNOS REGISTRADOS ---
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
    if (regHoy.estado === 'En Turno') return '🟢 En Turno (' + regHoy.horaEntrada + ')';
    if (regHoy.estado === 'En Pausa') return '☕ En Comida';
    return '✅ Completado';
  }

  get registrosFiltrados(): Registro[] {
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

  get misRegistrosEstudiante(): Registro[] {
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
    this.registroService.eliminarUsuario(id).then(() => this.notificar('Alumno eliminado del directorio', 'info'));
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
    }, 3800);
  }
}