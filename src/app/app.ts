import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RegistroService, Empresa, Usuario, Registro, QrKioscoActivo } from './services/registro';

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
    habilitarReporteCompleto: true
  };

  // Paletas de color disponibles para el Administrador (siempre sobre fondo blanco limpio)
  temasDisponibles = [
    { nombre: 'Naranja Vibrante', hex: '#f97316' },
    { nombre: 'Azul Cielo', hex: '#2563eb' },
    { nombre: 'Morado Índigo', hex: '#7c3aed' },
    { nombre: 'Rosa Coral', hex: '#e11d48' },
    { nombre: 'Verde Turquesa', hex: '#0d9488' }
  ];

  // Opciones desplegables para viñetas de horario ("De:" y "A:")
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

  // Formularios Auth (100% vacíos para que solo se vea el placeholder de guía)
  formCorreo: string = '';
  formPassword: string = '';
  formNombre: string = '';
  formRol: 'estudiante' | 'admin' = 'estudiante';
  formDepartamento: string = 'General';
  formAvatar: string = '🧑‍💻';
  formEmpresaNombre: string = '';
  formSucursal: string = '';
  formUbicacion: string = '';
  formHoraInicio: string = '';
  formHoraFin: string = '';
  formTelefono: string = '';
  formMatricula: string = '';

  // Modal Nuevo Estudiante
  mostrarModalNuevoEstudiante: boolean = false;
  adminNuevoNombre: string = '';
  adminNuevoCorreo: string = '';
  adminNuevoPassword: string = '';
  adminNuevoDept: string = 'General';
  adminNuevoAvatar: string = '🧑‍💻';
  adminNuevoTel: string = '';
  adminNuevoMatricula: string = '';

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

  // Los 3 Cronómetros en Vivo
  tiempoRestanteQR: number = 0;         // 15 min (900s) para escanear QR
  tiempoRestanteActividad: number = 0;  // 10 min (600s) para registrar actividad
  tiempoRestantePausa: number = 0;      // Minutos configurados para comida
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

  departamentos = ['General', 'Administración', 'Desarrollo & TI', 'Operaciones', 'Ventas & Marketing', 'Servicio Social'];

  constructor(
    private registroService: RegistroService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarLibreriasQR();
    this.cargarSesionGuardada();
    this.iniciarRelojYCronometros();
    this.recargarDatosDesdeNube(false);

    this.registroService.getEmpresaConfig().subscribe({
      next: (cfg) => {
        if (cfg) {
          this.empresa = { ...this.empresa, ...cfg };
          if (!this.empresa.colorTema) {
            this.empresa.colorTema = '#f97316';
          }
          this.cdr.detectChanges();
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

    this.registroService.getRegistros().subscribe({
      next: (data: Registro[]) => {
        this.registros = (data || []).sort((a, b) => (b.timestampEntrada || 0) - (a.timestampEntrada || 0));
        this.recalcularCronometros();
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error('Error registros:', err)
    });

    this.registroService.getUsuarios().subscribe({
      next: (data: Usuario[]) => {
        this.usuariosSistema = data || [];
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error('Error usuarios:', err)
    });
  }

  ngOnDestroy(): void {
    if (this.masterTimerId) clearInterval(this.masterTimerId);
    this.detenerCamara();
  }

  // --- VARIABLES CSS DINÁMICAS SEGÚN COLOR SELECCIONADO POR EL ADMIN ---
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

  async cambiarColorTemaRapido(hex: string): Promise<void> {
    this.empresa.colorTema = hex;
    this.cdr.detectChanges();
    try {
      await this.registroService.guardarEmpresaConfig(this.empresa);
      this.notificar('🎨 Color de la plataforma actualizado', 'exito');
    } catch (e) {
      console.error(e);
    }
  }

  async recargarDatosDesdeNube(mostrarAviso: boolean = true): Promise<void> {
    try {
      const [usuarios, registros, qrKiosco] = await Promise.all([
        this.registroService.obtenerUsuariosDirecto(),
        this.registroService.obtenerRegistrosDirecto(),
        this.registroService.obtenerQrKioscoDirecto()
      ]);

      if (usuarios.length > 0) this.usuariosSistema = usuarios;
      if (registros.length > 0) {
        this.registros = registros.sort((a, b) => (b.timestampEntrada || 0) - (a.timestampEntrada || 0));
      }
      if (qrKiosco) this.qrKioscoActivo = qrKiosco;

      this.recalcularCronometros();
      this.cdr.detectChanges();
      if (mostrarAviso) {
        this.notificar(`🔄 Datos sincronizados (${this.totalEstudiantes} alumnos registrados)`, 'info');
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
        this.notificar('⚠️ ¡Falta 1 MINUTO! Prepárate para presionar Reanudar Turno.', 'alerta');
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
    if (reg.actividadRegistrada) return true;
    return !!reg.observacion && !reg.observacion.toLowerCase().includes('pendiente');
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

  // --- GESTIÓN DE ALUMNOS (ADMIN) ---
  abrirModalNuevoEstudiante(): void {
    this.adminNuevoNombre = '';
    this.adminNuevoCorreo = '';
    this.adminNuevoPassword = '';
    this.adminNuevoDept = 'General';
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

    this.cargandoAccion = true;
    this.cdr.detectChanges();
    const correoNorm = this.adminNuevoCorreo.trim().toLowerCase();

    try {
      const existe = await this.registroService.buscarUsuarioPorCorreo(correoNorm);
      if (existe) {
        this.notificar('Este correo ya está registrado', 'alerta');
        return;
      }

      const nuevoEstudiante: Usuario = {
        nombre: this.adminNuevoNombre.trim(),
        correo: correoNorm,
        password: this.adminNuevoPassword.trim(),
        rol: 'estudiante',
        departamento: this.adminNuevoDept,
        avatar: this.adminNuevoAvatar,
        puesto: 'Estudiante / Colaborador',
        empresaNombre: this.empresa.nombre,
        sucursal: this.empresa.sucursal,
        horario: this.empresa.horario,
        telefono: this.adminNuevoTel.trim(),
        matricula: this.adminNuevoMatricula.trim()
      };

      const docRef = await this.registroService.registrarUsuario(nuevoEstudiante);
      nuevoEstudiante.id = docRef.id;
      this.usuariosSistema = [...this.usuariosSistema, nuevoEstudiante];

      this.notificar(`✅ Alumno ${nuevoEstudiante.nombre} registrado correctamente`, 'exito');
      this.mostrarModalNuevoEstudiante = false;
    } catch (error) {
      console.error(error);
      this.notificar('Error al guardar alumno en Firebase', 'alerta');
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

      const nuevoUsuario: Usuario = {
        nombre: this.formNombre.trim(),
        correo: correoNorm,
        password: this.formPassword.trim(),
        rol: this.formRol,
        departamento: this.formDepartamento,
        avatar: this.formAvatar,
        puesto: this.formRol === 'admin' ? 'Administrador General' : 'Estudiante / Colaborador',
        empresaNombre: this.formEmpresaNombre.trim() || this.empresa.nombre,
        sucursal: this.formSucursal.trim() || this.empresa.sucursal,
        horario: horarioFormateado,
        telefono: this.formTelefono.trim(),
        matricula: this.formMatricula.trim()
      };

      if (this.formRol === 'admin') {
        if (this.formEmpresaNombre.trim()) this.empresa.nombre = this.formEmpresaNombre.trim();
        if (this.formSucursal.trim()) this.empresa.sucursal = this.formSucursal.trim();
        if (this.formUbicacion.trim()) this.empresa.ubicacion = this.formUbicacion.trim();
        if (this.formHoraInicio) this.empresa.horaInicio = this.formHoraInicio;
        if (this.formHoraFin) this.empresa.horaFin = this.formHoraFin;
        if (this.formHoraInicio || this.formHoraFin) this.empresa.horario = horarioFormateado;
        await this.registroService.guardarEmpresaConfig(this.empresa);
      }

      const docRef = await this.registroService.registrarUsuario(nuevoUsuario);
      nuevoUsuario.id = docRef.id;
      this.usuariosSistema = [...this.usuariosSistema, nuevoUsuario];

      this.iniciarSesionUsuario(nuevoUsuario);
      this.notificar('¡Cuenta creada correctamente!', 'exito');
      this.limpiarFormularioAuth();
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
    localStorage.setItem('ticktock_user', JSON.stringify(this.usuarioActual));
    this.recalcularCronometros();
    this.cdr.detectChanges();
  }

  cerrarSesion(): void {
    this.usuarioActual = null;
    this.sesionIniciada = false;
    this.pantallaActual = 'bienvenida';
    localStorage.removeItem('ticktock_user');
    this.notificar('Sesión cerrada', 'info');
    this.cdr.detectChanges();
  }

  cargarSesionGuardada(): void {
    const raw = localStorage.getItem('ticktock_user');
    if (raw) {
      try {
        const user = JSON.parse(raw);
        if (user && user.nombre && user.rol) {
          this.usuarioActual = user;
          this.sesionIniciada = true;
          this.pantallaActual = 'dashboard';
        }
      } catch {
        localStorage.removeItem('ticktock_user');
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

    try {
      await this.registroService.guardarEmpresaConfig(this.empresa);
      this.notificar('✅ Configuración, horario y colores guardados', 'exito');
      this.mostrarModalEmpresa = false;
    } catch (e) {
      console.error(e);
      this.notificar('Error al guardar configuración', 'alerta');
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

  async generarQRKioscoAdmin(): Promise<void> {
    const ahora = Date.now();
    const pin = 'TK-' + Math.floor(100000 + Math.random() * 900000);
    const qrData: QrKioscoActivo = {
      codigo: pin,
      timestamp: ahora,
      generadoPor: this.usuarioActual?.nombre || 'Administrador'
    };

    this.qrKioscoActivo = qrData;
    await this.mostrarQRConTemporizador(pin, ahora);
    try {
      await this.registroService.guardarQrKiosco(qrData);
      this.notificar('🖥️ Código QR generado en pantalla (válido por 15 min)', 'exito');
    } catch (e) {
      console.error(e);
    }
    this.cdr.detectChanges();
  }

  async marcarEntrada(): Promise<void> {
    if (!this.usuarioActual || this.estaEnTurno || this.estaEnPausa || this.cargandoAccion) return;

    this.cargandoAccion = true;
    this.cdr.detectChanges();

    const ahora = new Date();
    const ahoraMs = ahora.getTime();
    const mesAno = ahora.toISOString().substring(0, 7);
    const pin = 'TK-' + Math.floor(100000 + Math.random() * 900000);
    const tieneActividadInicial = this.observacionActual.trim().length > 0;
    const textoActividad = tieneActividadInicial
      ? this.observacionActual.trim()
      : 'Pendiente de registrar actividad';

    const nuevo: Registro = {
      id: 'temp_' + ahoraMs,
      empleadoId: String(this.usuarioActual.correo).toLowerCase(),
      empleadoNombre: this.usuarioActual.nombre,
      puesto: this.usuarioActual.puesto || 'Estudiante / Colaborador',
      departamento: this.usuarioActual.departamento || 'General',
      fecha: ahora.toLocaleDateString('es-ES'),
      mesAno,
      horaEntrada: ahora.toLocaleTimeString('es-ES'),
      estado: 'En Turno',
      observacion: textoActividad,
      actividadRegistrada: tieneActividadInicial,
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
    this.notificar('🟢 Entrada iniciada. Escanea el QR antes de 15 min.', 'exito');

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
    if (!reg || !reg.codigoQR) return;
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

  // --- ESCÁNER CON CÁMARA REAL + VALIDACIÓN DIRECTA EN FIREBASE ---
  onInputCodigoManual(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.codigoEscaneadoManual = val;
    this.errorModalEscaner = '';
  }

  async abrirEscanerCamara(): Promise<void> {
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
      this.estadoCamaraTexto = 'Sin permiso de cámara. Escribe el PIN de la computadora abajo.';
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

      const [registrosFrescos, qrKioscoFresco] = await Promise.all([
        this.registroService.obtenerRegistrosDirecto(),
        this.registroService.obtenerQrKioscoDirecto()
      ]);

      if (registrosFrescos.length > 0) {
        this.registros = registrosFrescos.sort((a, b) => (b.timestampEntrada || 0) - (a.timestampEntrada || 0));
      }
      if (qrKioscoFresco) {
        this.qrKioscoActivo = qrKioscoFresco;
      }

      const regAlumno = this.registroActivo;
      const pinRegistroAlumno = this.extraerSoloDigitosOPin(regAlumno?.codigoQR);
      const pinKioscoAdmin = this.extraerSoloDigitosOPin(this.qrKioscoActivo?.codigo);

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
        this.recalcularCronometros();
        this.notificar(`✅ ¡Código verificado a las ${horaExacta}!`, 'exito');
        return;
      }

      if (this.qrKioscoActivo && pinKioscoAdmin && (pinIngresado === pinKioscoAdmin || pinIngresado.includes(pinKioscoAdmin))) {
        if (ahoraMs - this.qrKioscoActivo.timestamp > LIMITE_15_MIN_MS) {
          this.errorModalEscaner = '❌ El QR de la pantalla caducó (más de 15 min). Pide generar uno nuevo.';
          this.notificar('El QR de pantalla ya caducó', 'alerta');
          return;
        }

        if (regAlumno) {
          regAlumno.verificadoCamaraMovil = true;
          regAlumno.horaEscaneoQR = horaExacta;
          regAlumno.codigoQR = this.qrKioscoActivo.codigo;
          const idReal = await this.obtenerIdRealRegistro(regAlumno);
          if (idReal) {
            await this.registroService.actualizarRegistro(idReal, {
              verificadoCamaraMovil: true,
              horaEscaneoQR: horaExacta,
              codigoQR: this.qrKioscoActivo.codigo
            });
          }
          this.detenerCamara();
          this.recalcularCronometros();
          this.notificar(`✅ ¡Asistencia verificada con QR a las ${horaExacta}!`, 'exito');
          return;
        } else if (this.usuarioActual) {
          const tieneAct = this.observacionActual.trim().length > 0;
          const nuevo: Registro = {
            empleadoId: String(this.usuarioActual.correo).toLowerCase(),
            empleadoNombre: this.usuarioActual.nombre,
            puesto: this.usuarioActual.puesto || 'Estudiante / Colaborador',
            departamento: this.usuarioActual.departamento || 'General',
            fecha: ahora.toLocaleDateString('es-ES'),
            mesAno: ahora.toISOString().substring(0, 7),
            horaEntrada: horaExacta,
            estado: 'En Turno',
            observacion: tieneAct ? this.observacionActual.trim() : 'Pendiente de registrar actividad',
            actividadRegistrada: tieneAct,
            timestampEntrada: ahoraMs,
            timestampQR: this.qrKioscoActivo.timestamp,
            codigoQR: this.qrKioscoActivo.codigo,
            verificadoCamaraMovil: true,
            horaEscaneoQR: horaExacta
          };

          const docRef = await this.registroService.agregarRegistro(nuevo);
          nuevo.id = docRef.id;
          this.registros = [nuevo, ...this.registros];
          this.observacionActual = '';
          this.detenerCamara();
          this.recalcularCronometros();
          this.notificar(`🟢 ¡Entrada registrada y verificada a las ${horaExacta}!`, 'exito');
          return;
        }
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
        this.recalcularCronometros();
        this.notificar(`✅ ¡Código QR validado a las ${horaExacta}!`, 'exito');
        return;
      }

      this.errorModalEscaner = `❌ El código "${rawInput}" no coincide con ningún QR activo. Verifica los 6 dígitos en la pantalla.`;
      this.notificar('Código incorrecto. Revisa los dígitos en la computadora.', 'alerta');
    } catch (error) {
      console.error('Error al validar código:', error);
      this.errorModalEscaner = '⚠️ Error de conexión con Firebase. Intenta de nuevo.';
    } finally {
      this.validandoQR = false;
      this.cdr.detectChanges();
    }
  }

  // --- PAUSA COMIDA Y REANUDAR ---
  async conmutarPausa(): Promise<void> {
    const reg = this.registroActivo;
    if (!reg) {
      this.notificar('No tienes un turno activo para pausar', 'alerta');
      return;
    }
    if (this.cargandoAccion) return;

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
      this.notificar(`☕ Pausa de comida iniciada (${horaActual}). Tienes ${minsComida} min.`, 'info');
    } else {
      reg.estado = 'En Turno';
      reg.horaPausaFin = horaActual;
      datosActualizar.horaPausaFin = horaActual;

      this.recalcularCronometros();
      this.notificar(`▶️ Turno reanudado a las ${horaActual}.`, 'exito');
    }

    try {
      const idReal = await this.obtenerIdRealRegistro(reg);
      if (idReal) {
        await this.registroService.actualizarRegistro(idReal, datosActualizar);
      }
    } catch (err) {
      console.error('Error al cambiar estado de pausa:', err);
      this.notificar('Error al actualizar el estado de pausa', 'alerta');
    } finally {
      this.cargandoAccion = false;
      this.cdr.detectChanges();
    }
  }

  async actualizarActividad(): Promise<void> {
    const reg = this.registroActivo;
    if (!reg) return;

    if (!this.observacionActual.trim()) {
      this.notificar('Escribe la actividad realizada para guardarla', 'alerta');
      return;
    }

    this.cargandoAccion = true;
    this.cdr.detectChanges();

    const nuevaActividad = this.observacionActual.trim();
    reg.observacion = nuevaActividad;
    reg.actividadRegistrada = true;
    this.observacionActual = '';
    this.recalcularCronometros();

    try {
      const idReal = await this.obtenerIdRealRegistro(reg);
      if (idReal) {
        await this.registroService.actualizarRegistro(idReal, {
          observacion: nuevaActividad,
          actividadRegistrada: true
        });
      }
      this.notificar('✅ Actividad guardada correctamente', 'exito');
    } catch (e) {
      console.error(e);
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
    let csv = '\uFEFFID,Estudiante,Departamento,Fecha,Actividad Inicial,Reporte Final\n';
    this.registrosFiltrados.forEach(r => {
      csv += `"${r.id || ''}","${r.empleadoNombre}","${r.departamento}","${r.fecha}","${(r.observacion || '').replace(/"/g, '""')}","${(r.reporteFinal || '').replace(/"/g, '""')}"\n`;
    });
    this.descargarArchivoCSV(csv, `Reporte_Informes_${this.mesFiltroReporte}.csv`);
  }

  exportarReporteCompleto(): void {
    if (!this.empresa.habilitarReporteCompleto) return;
    let csv = '\uFEFFID,Empresa,Ubicacion,Estudiante,Departamento,Fecha,Entrada,Escaneo QR,Inicio Comida,Fin Comida,Salida,Estado,PIN QR,Actividad,Reporte Final\n';
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