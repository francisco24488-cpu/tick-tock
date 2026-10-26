import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RegistroService, Empresa, Empleado, Registro } from './services/registro';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  empresa: Empresa = { nombre: 'Mastache Servicio', sucursal: 'UTNG', codigo: 'UTNG-2026', horario: '02:00 PM - 07:00 PM' };
  empleados: Empleado[] = [];
  registros: Registro[] = [];

  empleadoSeleccionadoId: number = 0;
  empleadoSeleccionado: Empleado | null = null;
  observacionActual: string = '';

  // Filtros
  busquedaEmpleado: string = '';
  filtroEstado: string = 'TODOS';

  // Reloj Digital
  relojHora: string = '00:00:00';
  relojAmPm: string = 'PM';
  relojFecha: string = '';
  private timerId: any;

  // Notificaciones Toast
  mostrarToast: boolean = false;
  mensajeToast: string = '';
  tipoToast: 'exito' | 'alerta' | 'info' = 'exito';

  // Modales
  mostrarModalEmpleado: boolean = false;
  mostrarModalEmpresa: boolean = false;

  nuevoEmpleado = {
    nombre: '',
    puesto: 'Estudiante',
    departamento: 'Edificio D',
    avatar: '👨‍🎓',
    tarifaHora: 0
  };

  avatares = ['👨‍🎓', '👩‍🎓', '🧑‍💻', '📁', '🧹', '📚', '👤'];
  departamentos = ['Edificio D', 'Edificio A', 'Edificio B', 'Biblioteca', 'Laboratorios'];

  constructor(
    private registroService: RegistroService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.iniciarReloj();

    this.registroService.getDatosIniciales().subscribe({
      next: (data) => {
        if (data.empresa) this.empresa = data.empresa;
        this.empleados = data.empleados || [];
        this.registros = data.registros || [];

        if (this.empleados.length > 0) {
          this.empleadoSeleccionadoId = this.empleados[0].id;
          this.alCambiarEmpleado();
        }
      },
      error: (err) => {
        console.error('Error al cargar datos JSON:', err);
        this.notificar('Error al cargar base de datos inicial', 'alerta');
      }
    });
  }

  ngOnDestroy(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
  }

  iniciarReloj(): void {
    const actualizar = () => {
      const ahora = new Date();
      const opcionesFecha: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      };
      this.relojFecha = ahora.toLocaleDateString('es-ES', opcionesFecha);

      let horas = ahora.getHours();
      const mins = ahora.getMinutes().toString().padStart(2, '0');
      const segs = ahora.getSeconds().toString().padStart(2, '0');
      
      this.relojAmPm = horas >= 12 ? 'PM' : 'AM';
      horas = horas % 12 || 12;
      this.relojHora = `${horas.toString().padStart(2, '0')}:${mins}:${segs}`;
      
      // Forzar actualización de vista para evitar que el reloj se congelé
      this.cdr.detectChanges();
    };

    actualizar();
    this.timerId = setInterval(actualizar, 1000);
  }

  notificar(mensaje: string, tipo: 'exito' | 'alerta' | 'info' = 'exito'): void {
    this.mensajeToast = mensaje;
    this.tipoToast = tipo;
    this.mostrarToast = true;
    setTimeout(() => {
      this.mostrarToast = false;
    }, 3000);
  }

  alCambiarEmpleado(): void {
    this.empleadoSeleccionado = this.empleados.find(e => e.id === Number(this.empleadoSeleccionadoId)) || null;
  }

  get registroActivo(): Registro | undefined {
    if (!this.empleadoSeleccionado) return undefined;
    return this.registros.find(r => r.empleadoId === this.empleadoSeleccionado?.id && (r.estado === 'En Turno' || r.estado === 'En Pausa'));
  }

  get estaEnTurno(): boolean {
    return this.registroActivo?.estado === 'En Turno';
  }

  get estaEnPausa(): boolean {
    return this.registroActivo?.estado === 'En Pausa';
  }

  marcarEntrada(): void {
    if (!this.empleadoSeleccionado) return;

    const ahora = new Date();
    const nuevo: Registro = {
      id: Date.now(),
      empleadoId: this.empleadoSeleccionado.id,
      empleadoNombre: this.empleadoSeleccionado.nombre,
      puesto: this.empleadoSeleccionado.puesto,
      departamento: this.empleadoSeleccionado.departamento,
      fecha: ahora.toLocaleDateString('es-ES'),
      horaEntrada: ahora.toLocaleTimeString('es-ES'),
      estado: 'En Turno',
      observacion: this.observacionActual.trim() || 'Acomodo y clasificación de documentos'
    };

    this.registros.unshift(nuevo);
    this.notificar(`Entrada registrada para ${this.empleadoSeleccionado.nombre}`, 'exito');
    this.observacionActual = '';
  }

  conmutarPausa(): void {
    const reg = this.registroActivo;
    if (!reg) return;

    const horaActual = new Date().toLocaleTimeString('es-ES');
    if (reg.estado === 'En Turno') {
      reg.estado = 'En Pausa';
      reg.horaPausaInicio = horaActual;
      this.notificar(`Receso iniciado para ${reg.empleadoNombre}`, 'info');
    } else if (reg.estado === 'En Pausa') {
      reg.estado = 'En Turno';
      reg.horaPausaFin = horaActual;
      this.notificar(`Servicio reanudado para ${reg.empleadoNombre}`, 'exito');
    }
  }

  marcarSalida(): void {
    const reg = this.registroActivo;
    if (!reg) return;

    const ahora = new Date();
    reg.horaSalida = ahora.toLocaleTimeString('es-ES');
    reg.estado = 'Completado';
    reg.totalHoras = 'Turno Finalizado';
    this.notificar(`Salida registrada para ${reg.empleadoNombre}`, 'alerta');
  }

  get registrosFiltrados(): Registro[] {
    return this.registros.filter(r => {
      const coincideBusqueda = r.empleadoNombre.toLowerCase().includes(this.busquedaEmpleado.toLowerCase()) ||
                              r.departamento.toLowerCase().includes(this.busquedaEmpleado.toLowerCase()) ||
                              (r.observacion && r.observacion.toLowerCase().includes(this.busquedaEmpleado.toLowerCase()));
      const coincideEstado = this.filtroEstado === 'TODOS' || r.estado === this.filtroEstado;
      return coincideBusqueda && coincideEstado;
    });
  }

  get totalEmpleados(): number { return this.empleados.length; }
  get personalEnTurno(): number { return this.registros.filter(r => r.estado === 'En Turno').length; }
  get personalEnPausa(): number { return this.registros.filter(r => r.estado === 'En Pausa').length; }
  get totalCompletados(): number { return this.registros.filter(r => r.estado === 'Completado').length; }

  eliminarRegistro(id: number): void {
    this.registros = this.registros.filter(r => r.id !== id);
    this.notificar('Registro eliminado del historial', 'info');
  }

  abrirModalEmpleado(): void { this.mostrarModalEmpleado = true; }
  cerrarModalEmpleado(): void { this.mostrarModalEmpleado = false; }
  abrirModalEmpresa(): void { this.mostrarModalEmpresa = true; }
  cerrarModalEmpresa(): void { this.mostrarModalEmpresa = false; }

  guardarNuevoEmpleado(): void {
    if (!this.nuevoEmpleado.nombre) return;

    const emp: Empleado = {
      id: Date.now(),
      nombre: this.nuevoEmpleado.nombre,
      puesto: this.nuevoEmpleado.puesto,
      departamento: this.nuevoEmpleado.departamento,
      avatar: this.nuevoEmpleado.avatar,
      tarifaHora: 0
    };

    this.empleados.push(emp);
    this.empleadoSeleccionadoId = emp.id;
    this.alCambiarEmpleado();
    this.cerrarModalEmpleado();
    this.notificar(`Estudiante ${emp.nombre} agregado con éxito`, 'exito');
    this.nuevoEmpleado = { nombre: '', puesto: 'Estudiante', departamento: 'Edificio D', avatar: '👨‍🎓', tarifaHora: 0 };
  }

  exportarCSV(): void {
    if (this.registros.length === 0) {
      this.notificar('No hay datos para exportar', 'alerta');
      return;
    }

    let csv = "ID,Estudiante,Puesto,Departamento,Fecha,Hora Entrada,Hora Salida,Estado,Actividad Realizada\n";
    this.registros.forEach(r => {
      csv += `${r.id},"${r.empleadoNombre}","${r.puesto}","${r.departamento}","${r.fecha}","${r.horaEntrada}","${r.horaSalida || ''}","${r.estado}","${r.observacion || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reporte_Asistencia_UTNG_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.notificar('Reporte CSV generado correctamente', 'exito');
  }
}