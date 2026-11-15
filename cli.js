// Interfaz de terminal: `npm start`
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { abrirAgenda } from './agenda.js';

const NOMBRE = 'Mauricio';
const agenda = abrirAgenda('agenda.db');
const rl = createInterface({ input: stdin, output: stdout });

const tty = Boolean(stdout.isTTY);
const gris = (s) => (tty ? '\x1b[2m' + s + '\x1b[0m' : s);
const negrita = (s) => (tty ? '\x1b[1m' + s + '\x1b[0m' : s);

const fechaLarga = new Intl.DateTimeFormat('es-EC', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
}).format(new Date());

function bloque(titulo, tareas) {
  const lineas = [negrita(titulo)];
  if (!tareas.length) lineas.push(gris('   (sin tareas)'));
  tareas.forEach((t) => {
    const marca = t.hecha ? '[x]' : '[ ]';
    const id = ('#' + t.id).padStart(4);
    const texto = marca + ' ' + t.texto;
    lineas.push('  ' + id + '  ' + (t.hecha ? gris(texto) : texto));
  });
  return lineas.join('\n');
}

function pintar(limpiar = true) {
  if (limpiar && tty) stdout.write('\x1b[2J\x1b[H');
  const v = agenda.listar();
  const r = agenda.resumen();
  const partes = [
    negrita('Agenda de ' + NOMBRE) + gris('  ·  ' + fechaLarga),
    '',
    bloque('HOY', v.hoy),
    '',
    bloque('MAÑANA', v.manana),
  ];
  if (v.otras.length) partes.push('', bloque('OTRAS FECHAS', v.otras));
  partes.push(
    '',
    gris('─'.repeat(58)),
    gris(r.totalPendientes + ' pendientes (hoy ' + r.hoyPendientes + ' · mañana ' + r.mananaPendientes + ') · ' + r.totalHechas + ' hechas'),
    gris('a <texto> hoy · m <texto> mañana · h <id> marcar · x <id> borrar · l listar · q salir')
  );
  stdout.write('\n' + partes.join('\n') + '\n\n');
}

function ayuda() {
  stdout.write('\n' +
    '  a <texto>   agregar una tarea para hoy\n' +
    '  m <texto>   agregar una tarea para mañana\n' +
    '  h <id>      marcar o desmarcar una tarea como hecha\n' +
    '  x <id>      borrar una tarea\n' +
    '  l           volver a listar\n' +
    '  q           salir\n\n');
}

pintar(false);

const iterador = rl[Symbol.asyncIterator]();
async function siguienteLinea() {
  stdout.write('> ');
  const { value, done } = await iterador.next();
  return done ? null : value;
}

process.on('SIGINT', () => {
  stdout.write('\n');
  rl.close();
  agenda.cerrar();
  process.exit(0);
});

for (;;) {
  const linea = await siguienteLinea();
  if (linea === null) break; // entrada cerrada (Ctrl+D)

  const entrada = linea.trim();
  if (!entrada) continue;

  const [cmd, ...resto] = entrada.split(/\s+/);
  const arg = resto.join(' ').trim();
  const comando = cmd.toLowerCase();

  try {
    if (comando === 'q' || comando === 'salir') break;
    if (comando === '?' || comando === 'ayuda') { ayuda(); continue; }
    if (comando === 'a' || comando === 'agregar') {
      if (!arg) { stdout.write('  Falta el texto: a enviar informe\n'); continue; }
      const t = agenda.crear(arg, 'hoy');
      stdout.write('  Agregada a hoy: #' + t.id + ' ' + t.texto + '\n');
    } else if (comando === 'm' || comando === 'manana' || comando === 'mañana') {
      if (!arg) { stdout.write('  Falta el texto: m revisar cotización\n'); continue; }
      const t = agenda.crear(arg, 'manana');
      stdout.write('  Agregada a mañana: #' + t.id + ' ' + t.texto + '\n');
    } else if (comando === 'h' || comando === 'hecho') {
      const t = agenda.buscar(arg);
      if (!t) { stdout.write('  No existe la tarea #' + arg + '\n'); continue; }
      agenda.marcar(t.id, !t.hecha);
      stdout.write('  Tarea #' + t.id + (t.hecha ? ' desmarcada' : ' marcada como hecha') + '\n');
    } else if (comando === 'x' || comando === 'borrar') {
      if (!agenda.quitar(arg)) { stdout.write('  No existe la tarea #' + arg + '\n'); continue; }
      stdout.write('  Tarea #' + arg + ' borrada\n');
    } else if (comando === 'l' || comando === 'listar') {
      // sólo redibuja
    } else {
      stdout.write('  No entiendo «' + cmd + '». Escribí ? para ver los comandos.\n');
      continue;
    }
  } catch (e) {
    stdout.write('  Error: ' + e.message + '\n');
    continue;
  }

  pintar();
}

rl.close();
agenda.cerrar();
stdout.write('Hasta luego.\n');
