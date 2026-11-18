import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { RegistroService, Empresa, Usuario, Registro, ActividadItem } from './services/registro';

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
  empresaActualId: string = '';

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

  // Control de visibilidad de contraseñas (ojito)
  verPassLogin: boolean = false;
  verPassRegistro: boolean = false;
  verPassNuevoAlumno: boolean = false;
  verPassEditarAlumno: boolean = false;

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

  // Verificación de 2 Pasos por Gmail con código
  mostrarModalVerificacionGmail: boolean = false;
  usuarioPendienteVerificacion: Usuario | null = null;
  codigoVerificacionIngresado: string = '';
  enviandoCorreoGmail: boolean = false;
  correoEnviadoExito: boolean = false;
  errorEnvioGmail: string = '';
  mostrarConfigEmailJSInline: boolean = false;
  mensajeExitoVerificacionLink: string = '';

  // QR & Cámara Real
  mostrarModalQR: boolean = false;
  mostrarModalCamaraMovil: boolean = false;
  codigoGeneradoQR: string = '';
  qrImagenUrl: string = '';
  timestampQRGenerado: number = 0;
  private procesandoExpiracionQR: boolean = false;

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
  private subsEmpresa: Subscription[] = [];

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

  // --- PROCESAR ENLACE DE VERIFICACIÓN EN 2 PASOS DESDE GMAIL ---
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

  private aplicarConfiguracionRecibida(cfg: Partial<Empresa>): void {
    this.empresa = {
      ...this.empresa,
      ...cfg,
      colorTema: cfg.colorTema || '#f97316',
      departamentosPersonalizados: cfg.departamentosPersonalizados || []
    };
    this.aplicarVariablesGlobalesCSS(this.empresa.colorTema!);
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

  // --- CRONÓMETROS EN VIVO Y EXPIRACIÓN ESTRICTA DE 15 MINUTOS ---
  private recalcularCronometros(): void {
    const ahoraMs = Date.now();
    const reg = this.registroActivo;

    const refQrTs = this.mostrarModalQR && this.timestampQRGenerado
      ? this.timestampQRGenerado
      : (reg?.timestampQR || reg?.timestampEntrada || 0);

    if (reg && !reg.verificadoCamaraMovil && refQrTs > 0) {
      const restQR = 900 - Math.floor((ahoraMs - refQrTs) / 1000);
      this.tiempoRestanteQR = restQR > 0 ? restQR : 0;

      // Si pasaron los 15 minutos y NO escaneó el QR: anular entrada, sacar del turno y alertar al encargado
      if (restQR <= 0 && !this.procesandoExpiracionQR) {
        this.procesandoExpiracionQR = true;
        this.ejecutarExpiracionTurnoPorQR(reg);
      }
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

  private async ejecutarExpiracionTurnoPorQR(reg: Registro): Promise<void> {
    try {
      const horaLimiteStr = new Date().toLocaleTimeString('es-ES');
      const motivoExpiracion = '⛔ Entrada cancelada: No escaneó el QR dentro de los 15 minutos reglamentarios';

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
        '⛔ ¡Tiempo agotado (15 min)! No escaneaste el QR a tiempo. Tu entrada fue cancelada y se notificó al encargado.',
        'alerta'
      );
      this.cdr.detectChanges();
    } catch (e) {
      console.error('Error al expirar turno por QR:', e);
    } finally {
      this.procesandoExpiracionQR = false;
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

  // --- ENVÍO REAL DE CÓDIGO DE VERIFICACIÓN DE 2 PASOS POR GMAIL (SIN VENTANA DE REDACCIÓN) ---
  private async enviarCorreoCodigoGmailReal(usuario: Usuario): Promise<void> {
    this.usuarioPendienteVerificacion = usuario;
    this.codigoVerificacionIngresado = '';
    this.correoEnviadoExito = false;
    this.errorEnvioGmail = '';
    this.mostrarConfigEmailJSInline = false;
    this.mostrarModalVerificacionGmail = true;
    this.cdr.detectChanges();

    const serviceId = (this.empresa.emailjsServiceId || '').trim();
    const templateId = (this.empresa.emailjsTemplateId || '').trim();
    const publicKey = (this.empresa.emailjsPublicKey || '').trim();

    if (!serviceId || !templateId || !publicKey) {
      this.errorEnvioGmail = '⚠️ Falta conectar el servicio de envío automático de correo (EmailJS) en esta compañía.';
      this.mostrarConfigEmailJSInline = true;
      this.cdr.detectChanges();
      return;
    }

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
        this.errorEnvioGmail = `❌ No se pudo enviar el correo (${txt || 'Revisa tus claves de EmailJS'}).`;
      }
    } catch (e) {
      console.error('Error enviando correo de verificación:', e);
      this.errorEnvioGmail = '❌ Error de red al enviar el correo de verificación.';
    } finally {
      this.enviandoCorreoGmail = false;
      this.cdr.detectChanges();
    }
  }

  async guardarConfigEmailJSYReenviar(): Promise<void> {
    if (!this.empresa.emailjsServiceId?.trim() || !this.empresa.emailjsTemplateId?.trim() || !this.empresa.emailjsPublicKey?.trim()) {
      this.notificar('Completa Service ID, Template ID y Public Key', 'alerta');
      return;
    }

    const empId = this.usuarioPendienteVerificacion?.empresaId || this.empresaActualId;
    if (empId) {
      await this.registroService.guardarEmpresaConfig(empId, this.empresa);
    }

    if (this.usuarioPendienteVerificacion) {
      await this.enviarCorreoCodigoGmailReal(this.usuarioPendienteVerificacion);
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

  // --- GESTIÓN DE ALUMNOS (ADMIN: ALTA Y EDICIÓN COMPLETA EN SU PROPIA COMPAÑÍA) ---
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

      const nuevoEstudiante: Usuario = {
        empresaId: this.empresaActualId,
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
      this.notificar(`📩 Alumno creado. Enviando código de verificación a ${correoNorm}...`, 'info');
      await this.enviarCorreoCodigoGmailReal(nuevoEstudiante);
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
      this.notificar('✅ Datos del estudiante actualizados correctamente', 'exito');
    } catch (e) {
      console.error('Error editando estudiante:', e);
      this.notificar('Error al actualizar datos del estudiante', 'alerta');
    } finally {
      this.cargandoAccion = false;
      this.cdr.detectChanges();
    }
  }

  // --- REGISTRO EXCLUSIVO PARA COMPAÑÍAS (CREA SU PROPIA BASE DE DATOS AISLADA) ---
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

    this.cargandoAccion = true;
    this.cdr.detectChanges();
    const correoNorm = this.formCorreo.trim().toLowerCase();

    const horarioFormateado = (this.formHoraInicio && this.formHoraFin)
      ? `De ${this.formHoraInicio} a ${this.formHoraFin}`
      : (this.formHoraInicio ? `Desde ${this.formHoraInicio}` : 'Por definir');

    try {
      const existe = await this.registroService.buscarUsuarioPorCorreo(correoNorm);
      if (existe) {
        this.notificar('Este correo ya está registrado. Inicia sesión o usa otro correo.', 'alerta');
        return;
      }

      // Crear ID único e independiente para esta nueva compañía
      const nuevaEmpresaId = 'emp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const departamentosInit = this.departamentosBase.some(d => d.toLowerCase() === deptoFinal.toLowerCase())
        ? []
        : [deptoFinal];

      const nuevaEmpresa: Empresa = {
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
        habilitarFormEstudiantes: true,
        habilitarReporteHoras: true,
        habilitarReporteInformes: true,
        habilitarReporteCompleto: true,
        departamentosPersonalizados: departamentosInit,
        emailjsServiceId: '',
        emailjsTemplateId: '',
        emailjsPublicKey: ''
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

  cerrarSesion(): void {
    this.limpiarSuscripcionesEmpresa();
    this.usuarioActual = null;
    this.empresaActualId = '';
    this.sesionIniciada = false;
    this.usuariosSistema = [];
    this.registros = [];
    this.aplicarVariablesGlobalesCSS('#f97316');
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
    this.formTelefono = '';
    this.formDepartamento = 'Administración';
    this.formDepartamentoPersonalizado = '';
    this.verPassLogin = false;
    this.verPassRegistro = false;
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
    if (!this.empresaActualId) return;
    this.cargandoAccion = true;
    this.cdr.detectChanges();

    if (this.empresa.horaInicio && this.empresa.horaFin) {
      this.empresa.horario = `De ${this.empresa.horaInicio} a ${this.empresa.horaFin}`;
    } else if (this.empresa.horaInicio) {
      this.empresa.horario = `Desde ${this.empresa.horaInicio}`;
    }

    this.aplicarVariablesGlobalesCSS(this.empresa.colorTema || '#f97316');

    try {
      await this.registroService.guardarEmpresaConfig(this.empresaActualId, this.empresa);
      this.notificar('✅ Configuración, horario y color guardados para tu compañía', 'exito');
      this.mostrarModalEmpresa = false;
    } catch (e) {
      console.error(e);
      this.notificar('Error al guardar en la nube', 'alerta');
    } finally {
      this.cargandoAccion = false;
      this.cdr.detectChanges();
    }
  }

  // --- DETECCIÓN DE TURNO ACTIVO Y BLOQUEO POR QR EXPIRADO ---
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

  // Verifica si el estudiante dejó vencer los 15 min del QR hoy y quedó bloqueado
  get entradaBloqueadaPorExpiracionHoy(): Registro | undefined {
    if (!this.usuarioActual) return undefined;
    const hoy = new Date().toLocaleDateString('es-ES');
    const userEmail = (this.usuarioActual.correo || '').toLowerCase();
    const userName = (this.usuarioActual.nombre || '').toLowerCase();

    return this.registros.find(r =>
      r.fecha === hoy &&
      r.qrExpiradoSinEscanear === true &&
      (
        (r.empleadoId && String(r.empleadoId).toLowerCase() === userEmail) ||
        (r.empleadoNombre && r.empleadoNombre.toLowerCase() === userName)
      )
    );
  }

  // Alertas visibles para el Encargado/Administrador cuando algún estudiante no escaneó a tiempo
  get alertasQRExpiradoAdmin(): Registro[] {
    return this.registros.filter(r => r.qrExpiradoSinEscanear === true && !r.alertaVistaPorAdmin);
  }

  async descartarAlertaAdmin(reg: Registro): Promise<void> {
    reg.alertaVistaPorAdmin = true;
    if (reg.id && !reg.id.startsWith('temp_')) {
      await this.registroService.actualizarRegistro(reg.id, { alertaVistaPorAdmin: true });
    }
    this.cdr.detectChanges();
  }

  async habilitarReintentoAlumno(reg: Registro): Promise<void> {
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
      this.notificar('⛔ No puedes marcar entrada: Excediste los 15 min de tu QR anterior. Contacta al encargado.', 'alerta');
      return;
    }

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
      empresaId: this.empresaActualId,
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
      horaEscaneoQR: '',
      qrExpiradoSinEscanear: false
    };

    this.registros = [nuevo, ...this.registros];
    this.observacionActual = '';
    await this.mostrarQRConTemporizador(pin, ahoraMs);
    this.recalcularCronometros();
    this.notificar('🟢 Entrada iniciada. Escanea el QR antes de 15 min o se anulará.', 'exito');

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

      const registrosFrescos = await this.registroService.obtenerRegistrosDirecto(this.empresaActualId);
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

  // --- LISTA COMPLETA Y CONTEO DE ALUMNOS DE ESTA COMPAÑÍA ---
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
    if (regHoy.estado === 'Expirado' || regHoy.qrExpiradoSinEscanear) return '⛔ QR Expirado (Bloqueado)';
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
    }, 4200);
  }
}