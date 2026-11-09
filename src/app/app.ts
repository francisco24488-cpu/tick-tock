import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RegistroService, Empresa, Usuario, Registro } from './services/registro';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
  encapsulation: ViewEncapsulation.None
})
export class App implements OnInit, OnDestroy {
  pantallaActual: 'bienvenida' | 'login' | 'registro' | 'dashboard' | 'reporteMensual' = 'bienvenida';
  tabAuth: 'login' | 'registro' = 'login';

  usuarioActual: Usuario | null = null;
  sesionIniciada: boolean = false;

  empresa: Empresa = { 
    nombre: 'Plataforma TickTock', 
    sucursal: 'Campus Central / Edificio D', 
    codigo: 'TT-2026-GLOBAL', 
    horario: '08:00 AM - 06:00 PM' 
  };

  // Formularios de Autenticación Pública
  formCorreo: string = '';
  formPassword: string = '';
  formNombre: string = '';
  formRol: 'estudiante' | 'admin' = 'estudiante';
  formDepartamento: string = 'General';
  formAvatar: string = '🧑‍💻';
  formEmpresaNombre: string = 'Plataforma TickTock';

  // Formulario para que el Administrador dé de alta a estudiantes
  mostrarModalNuevoEstudiante: boolean = false;
  adminNuevoNombre: string = '';
  adminNuevoCorreo: string = '';
  adminNuevoPassword: string = '';
  adminNuevoDept: string = 'General';
  adminNuevoAvatar: string = '🧑‍💻';

  usuariosSistema: Usuario[] = [];
  registros: Registro[] = [];

  observacionActual: string = '';
  cargandoAccion: boolean = false;

  // Modales adicionales
  mostrarModalSalida: boolean = false;
  mostrarModalEmpresa: boolean = false;
  reporteFinalTexto: string = '';

  // Filtros
  busquedaEmpleado: string = '';
  filtroEstado: string = 'TODOS';
  mesFiltroReporte: string = new Date().toISOString().substring(0, 7); // Formato YYYY-MM

  // Reloj
  relojHora: string = '00:00:00';
  relojAmPm: string = 'PM';
  relojFecha: string = '';
  private timerId: any;

  // Toast
  mostrarToast: boolean = false;
  mensajeToast: string = '';
  tipoToast: 'exito' | 'alerta' | 'info' = 'exito';

  avatares = ['🧑‍💻', '👨‍💼', '👩‍💼', '👑', '📁', '⚙️', '📊', '👤', '🚀', '🧪'];
  departamentos = ['General', 'Administración', 'Desarrollo & TI', 'Operaciones', 'Ventas & Marketing', 'Servicio Social'];

  constructor(
    private registroService: RegistroService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.iniciarReloj();
    this.cargarSesionGuardada();

    this.registroService.getRegistros().subscribe({
      next: (data: Registro[]) => {
        this.registros = data || [];
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
    if (this.timerId) clearInterval(this.timerId);
  }

  irAAuth(tab: 'login' | 'registro'): void {
    this.tabAuth = tab;
    this.pantallaActual = tab;
  }

  irABienvenida(): void {
    this.pantallaActual = 'bienvenida';
  }

  // --- SELECCIÓN RÁPIDA EN MODO KIOSK ---
  seleccionarUsuarioDirecto(usuario: Usuario): void {
    this.iniciarSesionUsuario(usuario);
    this.notificar(`Acceso rápido: ${usuario.nombre}`, 'exito');
  }

  // --- FUNCIONALIDAD: EL ADMINISTRADOR REGISTRA A SUS ALUMNOS ---
  abrirModalNuevoEstudiante(): void {
    this.adminNuevoNombre = '';
    this.adminNuevoCorreo = '';
    this.adminNuevoPassword = '';
    this.adminNuevoDept = 'General';
    this.adminNuevoAvatar = '🧑‍💻';
    this.mostrarModalNuevoEstudiante = true;
  }

  cerrarModalNuevoEstudiante(): void {
    this.mostrarModalNuevoEstudiante = false;
  }

  async registrarEstudiantePorAdmin(): Promise<void> {
    if (!this.adminNuevoNombre.trim() || !this.adminNuevoCorreo.trim() || !this.adminNuevoPassword.trim()) {
      this.notificar('Por favor completa el nombre, correo y contraseña del estudiante', 'alerta');
      return;
    }

    this.cargandoAccion = true;
    this.cdr.detectChanges();

    const correoNormalizado = this.adminNuevoCorreo.trim().toLowerCase();

    try {
      const existe = await this.registroService.buscarUsuarioPorCorreo(correoNormalizado);
      if (existe) {
        this.notificar('Este correo ya está registrado en la base de datos', 'alerta');
        this.cargandoAccion = false;
        this.cdr.detectChanges();
        return;
      }

      const nuevoEstudiante: Usuario = {
        nombre: this.adminNuevoNombre.trim(),
        correo: correoNormalizado,
        password: this.adminNuevoPassword.trim(),
        rol: 'estudiante',
        departamento: this.adminNuevoDept,
        avatar: this.adminNuevoAvatar,
        puesto: 'Estudiante / Colaborador',
        empresaNombre: this.empresa.nombre
      };

      await this.registroService.registrarUsuario(nuevoEstudiante);
      this.notificar(`¡Estudiante ${nuevoEstudiante.nombre} registrado con éxito en Firestore!`, 'exito');
      this.mostrarModalNuevoEstudiante = false;
    } catch (error) {
      console.error(error);
      this.notificar('Error al guardar el nuevo estudiante', 'alerta');
    } finally {
      this.cargandoAccion = false;
      this.cdr.detectChanges();
    }
  }

  async ejecutarRegistro(): Promise<void> {
    if (!this.formNombre.trim() || !this.formCorreo.trim() || !this.formPassword.trim()) {
      this.notificar('Por favor completa todos los campos requeridos', 'alerta');
      return;
    }

    this.cargandoAccion = true;
    this.cdr.detectChanges();

    const correoNormalizado = this.formCorreo.trim().toLowerCase();

    try {
      const existe = await this.registroService.buscarUsuarioPorCorreo(correoNormalizado);
      if (existe) {
        this.notificar('Este correo ya está registrado', 'alerta');
        this.cargandoAccion = false;
        this.cdr.detectChanges();
        return;
      }

      const nuevoUsuario: Usuario = {
        nombre: this.formNombre.trim(),
        correo: correoNormalizado,
        password: this.formPassword.trim(),
        rol: this.formRol,
        departamento: this.formDepartamento,
        avatar: this.formAvatar,
        puesto: this.formRol === 'admin' ? 'Administrador General' : 'Estudiante / Colaborador',
        empresaNombre: this.formEmpresaNombre.trim() || this.empresa.nombre
      };

      const docRef = await this.registroService.registrarUsuario(nuevoUsuario);
      nuevoUsuario.id = docRef.id;

      this.iniciarSesionUsuario(nuevoUsuario);
      this.notificar(`¡Cuenta creada e iniciada! Bienvenido, ${nuevoUsuario.nombre}`, 'exito');
      this.limpiarFormularioAuth();
    } catch (error) {
      console.error(error);
      this.notificar('Error de conexión con la base de datos', 'alerta');
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
        this.notificar(`Bienvenido de nuevo, ${usuario.nombre}`, 'exito');
        this.limpiarFormularioAuth();
      } else {
        this.notificar('Correo o contraseña incorrectos', 'alerta');
      }
    } catch (error) {
      console.error(error);
      this.notificar('Error de autenticación', 'alerta');
    } finally {
      this.cargandoAccion = false;
      this.cdr.detectChanges();
    }
  }

  iniciarSesionUsuario(usuario: Usuario): void {
    this.usuarioActual = { ...usuario };
    this.sesionIniciada = true;
    this.pantallaActual = 'dashboard';
    if (usuario.empresaNombre) {
      this.empresa.nombre = usuario.empresaNombre;
    }
    localStorage.setItem('ticktock_user', JSON.stringify(this.usuarioActual));
  }

  cerrarSesion(): void {
    this.usuarioActual = null;
    this.sesionIniciada = false;
    this.pantallaActual = 'bienvenida';
    localStorage.removeItem('ticktock_user');
    this.notificar('Sesión cerrada correctamente', 'info');
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
          if (user.empresaNombre) {
            this.empresa.nombre = user.empresaNombre;
          }
        }
      } catch (e) {
        localStorage.removeItem('ticktock_user');
      }
    }
  }

  limpiarFormularioAuth(): void {
    this.formNombre = '';
    this.formCorreo = '';
    this.formPassword = '';
  }

  // --- REGISTRO DIARIO Y REPORTES ---
  get registroActivo(): Registro | undefined {
    if (!this.usuarioActual) return undefined;
    const userId = String(this.usuarioActual.id || this.usuarioActual.correo);
    return this.registros.find(r => 
      (String(r.empleadoId) === userId || r.empleadoNombre === this.usuarioActual?.nombre) && 
      (r.estado === 'En Turno' || r.estado === 'En Pausa')
    );
  }

  get estaEnTurno(): boolean { return this.registroActivo?.estado === 'En Turno'; }
  get estaEnPausa(): boolean { return this.registroActivo?.estado === 'En Pausa'; }

  marcarEntrada(): void {
    if (!this.usuarioActual) return;

    if (!this.observacionActual.trim()) {
      this.notificar('⚠️ La actividad u objetivo del día es OBLIGATORIA para iniciar turno', 'alerta');
      return;
    }

    this.cargandoAccion = true;
    this.cdr.detectChanges();
    const ahora = new Date();
    const mesAno = ahora.toISOString().substring(0, 7);

    const nuevo: Registro = {
      empleadoId: String(this.usuarioActual.id || this.usuarioActual.correo),
      empleadoNombre: this.usuarioActual.nombre,
      puesto: this.usuarioActual.puesto || 'Estudiante / Colaborador',
      departamento: this.usuarioActual.departamento || 'General',
      fecha: ahora.toLocaleDateString('es-ES'),
      mesAno: mesAno,
      horaEntrada: ahora.toLocaleTimeString('es-ES'),
      estado: 'En Turno',
      observacion: this.observacionActual.trim()
    };

    this.registroService.agregarRegistro(nuevo).then(() => {
      this.notificar(`Entrada guardada en Firestore a las ${nuevo.horaEntrada}`, 'exito');
      this.observacionActual = '';
    }).catch(err => {
      console.error(err);
      this.notificar('Error al guardar marcaje', 'alerta');
    }).finally(() => {
      this.cargandoAccion = false;
      this.cdr.detectChanges();
    });
  }

  actualizarActividad(): void {
    const reg = this.registroActivo;
    if (!reg || !reg.id) {
      this.notificar('No hay un turno activo para actualizar', 'alerta');
      return;
    }

    if (!this.observacionActual.trim()) {
      this.notificar('Escribe la nueva actividad o ubicación para actualizar', 'alerta');
      return;
    }

    this.cargandoAccion = true;
    this.cdr.detectChanges();

    this.registroService.actualizarRegistro(reg.id, { observacion: this.observacionActual.trim() }).then(() => {
      this.notificar('¡Actividad diaria actualizada!', 'exito');
      this.observacionActual = '';
    }).catch(err => {
      console.error(err);
      this.notificar('Error al actualizar la actividad', 'alerta');
    }).finally(() => {
      this.cargandoAccion = false;
      this.cdr.detectChanges();
    });
  }

  conmutarPausa(): void {
    const reg = this.registroActivo;
    if (!reg || !reg.id) return;

    this.cargandoAccion = true;
    this.cdr.detectChanges();
    const horaActual = new Date().toLocaleTimeString('es-ES');
    const esTurno = reg.estado === 'En Turno';

    const datosActualizar: Partial<Registro> = {
      estado: esTurno ? 'En Pausa' : 'En Turno',
      ...(esTurno ? { horaPausaInicio: horaActual } : { horaPausaFin: horaActual })
    };

    this.registroService.actualizarRegistro(reg.id, datosActualizar).then(() => {
      this.notificar(esTurno ? 'Pausa iniciada' : 'Jornada reanudada', 'info');
    }).catch(err => console.error(err)).finally(() => {
      this.cargandoAccion = false;
      this.cdr.detectChanges();
    });
  }

  abrirModalSalida(): void {
    const reg = this.registroActivo;
    if (!reg) return;
    this.reporteFinalTexto = '';
    this.mostrarModalSalida = true;
  }

  cerrarModalSalida(): void {
    this.mostrarModalSalida = false;
  }

  confirmarSalida(): void {
    const reg = this.registroActivo;
    if (!reg || !reg.id) return;

    this.cargandoAccion = true;
    this.cdr.detectChanges();
    const ahora = new Date();

    const datosActualizar: Partial<Registro> = {
      horaSalida: ahora.toLocaleTimeString('es-ES'),
      estado: 'Completado',
      totalHoras: 'Jornada Concluida',
      reporteFinal: this.reporteFinalTexto.trim() || 'Jornada finalizada sin observaciones adicionales.'
    };

    this.registroService.actualizarRegistro(reg.id, datosActualizar).then(() => {
      this.notificar(`Salida registrada a las ${datosActualizar.horaSalida}`, 'exito');
      this.mostrarModalSalida = false;
      this.observacionActual = '';
      this.reporteFinalTexto = '';
    }).catch(err => {
      console.error(err);
      this.notificar('Error al guardar la salida', 'alerta');
    }).finally(() => {
      this.cargandoAccion = false;
      this.cdr.detectChanges();
    });
  }

  // --- FILTROS Y REPORTES MENSUALES EXPORTABLES A EXCEL ---
  get registrosDelMes(): Registro[] {
    return this.registros.filter(r => {
      const coincideMes = !r.mesAno || r.mesAno === this.mesFiltroReporte || r.fecha.includes(this.mesFiltroReporte);
      return coincideMes;
    });
  }

  exportarExcelMensual(): void {
    const datos = this.registrosDelMes;
    if (datos.length === 0) {
      this.notificar('No hay datos en el mes seleccionado para exportar', 'alerta');
      return;
    }

    let csvContent = "\uFEFF"; // BOM UTF-8 para compatibilidad en Excel
    csvContent += "ID,Organización,Empleado,Puesto,Departamento,Fecha,Hora Entrada,Hora Salida,Estado,Actividad Inicial / Ubicación,Reporte Diario Final\n";

    datos.forEach(r => {
      csvContent += `"${r.id || ''}","${this.empresa.nombre}","${r.empleadoNombre}","${r.puesto}","${r.departamento}","${r.fecha}","${r.horaEntrada}","${r.horaSalida || ''}","${r.estado}","${(r.observacion || '').replace(/"/g, '""')}","${(r.reporteFinal || '').replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Reporte_Mensual_TickTock_${this.mesFiltroReporte}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    this.notificar('Reporte Excel / CSV descargado con éxito', 'exito');
  }

  get registrosFiltrados(): Registro[] {
    return this.registros.filter(r => {
      const coincideBusqueda = r.empleadoNombre.toLowerCase().includes(this.busquedaEmpleado.toLowerCase()) ||
                              r.departamento.toLowerCase().includes(this.busquedaEmpleado.toLowerCase()) ||
                              (r.observacion && r.observacion.toLowerCase().includes(this.busquedaEmpleado.toLowerCase())) ||
                              (r.reporteFinal && r.reporteFinal.toLowerCase().includes(this.busquedaEmpleado.toLowerCase()));
      const coincideEstado = this.filtroEstado === 'TODOS' || r.estado === this.filtroEstado;
      return coincideBusqueda && coincideEstado;
    });
  }

  get misRegistrosEstudiante(): Registro[] {
    if (!this.usuarioActual) return [];
    const userId = String(this.usuarioActual.id || this.usuarioActual.correo);
    return this.registros.filter(r => String(r.empleadoId) === userId || r.empleadoNombre === this.usuarioActual?.nombre);
  }

  get totalEstudiantes(): number { return this.usuariosSistema.filter(u => u.rol === 'estudiante').length; }
  get personalEnTurno(): number { return this.registros.filter(r => r.estado === 'En Turno').length; }
  get personalEnPausa(): number { return this.registros.filter(r => r.estado === 'En Pausa').length; }
  get totalCompletados(): number { return this.registros.filter(r => r.estado === 'Completado').length; }

  eliminarRegistro(id?: string): void {
    if (!id) return;
    this.registroService.eliminarRegistro(id).then(() => {
      this.notificar('Registro eliminado de Firestore', 'info');
    });
  }

  eliminarUsuario(id?: string): void {
    if (!id) return;
    this.registroService.eliminarUsuario(id).then(() => {
      this.notificar('Usuario eliminado de la base de datos', 'info');
    });
  }

  iniciarReloj(): void {
    const actualizar = () => {
      const ahora = new Date();
      this.relojFecha = ahora.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      let horas = ahora.getHours();
      const mins = ahora.getMinutes().toString().padStart(2, '0');
      const segs = ahora.getSeconds().toString().padStart(2, '0');
      this.relojAmPm = horas >= 12 ? 'PM' : 'AM';
      horas = horas % 12 || 12;
      this.relojHora = `${horas.toString().padStart(2, '0')}:${mins}:${segs}`;
      this.cdr.detectChanges();
    };
    actualizar();
    this.timerId = setInterval(actualizar, 1000);
  }

  notificar(mensaje: string, tipo: 'exito' | 'alerta' | 'info' = 'exito'): void {
    this.mensajeToast = mensaje;
    this.tipoToast = tipo;
    this.mostrarToast = true;
    setTimeout(() => { this.mostrarToast = false; }, 3500);
  }

  abrirModalEmpresa(): void { this.mostrarModalEmpresa = true; }
  cerrarModalEmpresa(): void { this.mostrarModalEmpresa = false; }
}