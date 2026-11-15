// Dominio de la agenda + persistencia en SQLite (node:sqlite, sin dependencias).
// La fecha de referencia es inyectable para que las pruebas sean deterministas.
import { DatabaseSync } from 'node:sqlite';

const iso = (d) =>
  d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

const sumarDias = (d, n) => {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + n);
  return x;
};

const fila = (r) => ({ id: r.id, texto: r.texto, fecha: r.fecha, hecha: r.hecha === 1, creada: r.creada });

/**
 * Abre (o crea) la agenda.
 * @param {string} ruta  archivo SQLite, o ':memory:' para pruebas.
 * @param {Date|Function} [hoy]  fecha fija o función que devuelve la fecha actual.
 */
export function abrirAgenda(ruta = 'agenda.db', hoy) {
  const db = new DatabaseSync(ruta);
  db.exec(`
    CREATE TABLE IF NOT EXISTS tareas (
      id     INTEGER PRIMARY KEY AUTOINCREMENT,
      texto  TEXT    NOT NULL,
      fecha  TEXT    NOT NULL,
      hecha  INTEGER NOT NULL DEFAULT 0,
      creada TEXT    NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tareas_fecha ON tareas (fecha);
  `);

  const ahora = () => {
    if (hoy instanceof Date) return new Date(hoy.getTime());
    if (typeof hoy === 'function') return new Date(hoy());
    return new Date();
  };

  const resolverFecha = (cuando) => {
    const d = ahora();
    if (!cuando || cuando === 'hoy') return iso(d);
    if (cuando === 'manana' || cuando === 'mañana') return iso(sumarDias(d, 1));
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(cuando))) return String(cuando);
    throw new Error('Fecha no válida: use hoy, mañana o AAAA-MM-DD');
  };

  return {
    ruta,

    crear(texto, cuando = 'hoy') {
      const limpio = String(texto ?? '').trim();
      if (!limpio) throw new Error('La tarea necesita un texto');
      const fecha = resolverFecha(cuando);
      const info = db
        .prepare('INSERT INTO tareas (texto, fecha, hecha, creada) VALUES (?, ?, 0, ?)')
        .run(limpio, fecha, new Date().toISOString());
      return { id: Number(info.lastInsertRowid), texto: limpio, fecha, hecha: false };
    },

    listar() {
      const base = ahora();
      const fHoy = iso(base);
      const fManana = iso(sumarDias(base, 1));
      const porFecha = (f) =>
        db.prepare('SELECT * FROM tareas WHERE fecha = ? ORDER BY hecha ASC, id ASC').all(f).map(fila);
      return {
        hoy: porFecha(fHoy),
        manana: porFecha(fManana),
        otras: db
          .prepare('SELECT * FROM tareas WHERE fecha NOT IN (?, ?) ORDER BY fecha ASC, hecha ASC, id ASC')
          .all(fHoy, fManana)
          .map(fila),
      };
    },

    buscar(id) {
      const r = db.prepare('SELECT * FROM tareas WHERE id = ?').get(Number(id));
      return r ? fila(r) : null;
    },

    marcar(id, hecha = true) {
      const info = db.prepare('UPDATE tareas SET hecha = ? WHERE id = ?').run(hecha ? 1 : 0, Number(id));
      return info.changes > 0;
    },

    quitar(id) {
      const info = db.prepare('DELETE FROM tareas WHERE id = ?').run(Number(id));
      return info.changes > 0;
    },

    resumen() {
      const v = this.listar();
      const pendientes = (lista) => lista.filter((t) => !t.hecha).length;
      const hoyPendientes = pendientes(v.hoy);
      const mananaPendientes = pendientes(v.manana);
      const totalHechas = db.prepare('SELECT COUNT(*) AS c FROM tareas WHERE hecha = 1').get().c;
      return {
        hoyPendientes,
        mananaPendientes,
        totalPendientes: hoyPendientes + mananaPendientes,
        totalHechas: Number(totalHechas),
      };
    },

    cerrar() {
      db.close();
    },
  };
}
