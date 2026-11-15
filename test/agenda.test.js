// Pruebas de la agenda: se escriben ANTES de implementar (TDD).
// Fecha fija para que el resultado no dependa del día en que se ejecuten.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { abrirAgenda } from '../agenda.js';

const HOY = new Date(2026, 10, 14); // sábado 14 de noviembre de 2026, hora local

describe('agenda: guardar y listar', () => {
  test('S1/S5: una tarea de hoy aparece en «hoy» y no en «mañana»', () => {
    const a = abrirAgenda(':memory:', HOY);
    const t = a.crear('enviar informe', 'hoy');

    assert.equal(t.texto, 'enviar informe');
    assert.equal(t.fecha, '2026-11-14');
    assert.equal(t.hecha, false);

    const v = a.listar();
    assert.equal(v.hoy.length, 1);
    assert.equal(v.hoy[0].texto, 'enviar informe');
    assert.equal(v.manana.length, 0);
    a.cerrar();
  });

  test('S1/S5: una tarea de mañana aparece en «mañana» con la fecha de mañana', () => {
    const a = abrirAgenda(':memory:', HOY);
    const t = a.crear('revisar cotización', 'manana');

    assert.equal(t.fecha, '2026-11-15');
    const v = a.listar();
    assert.equal(v.manana.length, 1);
    assert.equal(v.hoy.length, 0);
    a.cerrar();
  });

  test('sin tareas devuelve las tres listas vacías', () => {
    const a = abrirAgenda(':memory:', HOY);
    const v = a.listar();
    assert.deepEqual([v.hoy.length, v.manana.length, v.otras.length], [0, 0, 0]);
    a.cerrar();
  });

  test('S6: una tarea de otra fecha no se pierde, va a «otras»', () => {
    const a = abrirAgenda(':memory:', HOY);
    a.crear('pagar luz', '2026-12-01');
    const v = a.listar();
    assert.equal(v.hoy.length, 0);
    assert.equal(v.otras.length, 1);
    assert.equal(v.otras[0].texto, 'pagar luz');
    a.cerrar();
  });

  test('rechaza una tarea sin texto', () => {
    const a = abrirAgenda(':memory:', HOY);
    assert.throws(() => a.crear('   ', 'hoy'), /texto/);
    a.cerrar();
  });
});

describe('agenda: marcar como hecha', () => {
  test('S4: marcar y desmarcar cambia el estado', () => {
    const a = abrirAgenda(':memory:', HOY);
    const t = a.crear('llamar al cliente', 'hoy');

    a.marcar(t.id, true);
    assert.equal(a.listar().hoy[0].hecha, true);

    a.marcar(t.id, false);
    assert.equal(a.listar().hoy[0].hecha, false);
    a.cerrar();
  });

  test('S4: el estado sobrevive al cerrar y reabrir la base', () => {
    const dir = mkdtempSync(join(tmpdir(), 'agenda-'));
    const ruta = join(dir, 'agenda.db');
    try {
      const a = abrirAgenda(ruta, HOY);
      const t = a.crear('enviar informe', 'hoy');
      a.marcar(t.id, true);
      a.cerrar();

      const b = abrirAgenda(ruta, HOY);
      const v = b.listar();
      assert.equal(v.hoy.length, 1, 'la tarea tiene que seguir ahí');
      assert.equal(v.hoy[0].hecha, true, 'el estado tiene que sobrevivir');
      b.cerrar();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('marcar un id que no existe no rompe', () => {
    const a = abrirAgenda(':memory:', HOY);
    assert.equal(a.marcar(999, true), false);
    a.cerrar();
  });
});

describe('agenda: borrar y resumen', () => {
  test('quitar elimina la tarea', () => {
    const a = abrirAgenda(':memory:', HOY);
    const t = a.crear('tarea temporal', 'hoy');
    assert.equal(a.quitar(t.id), true);
    assert.equal(a.listar().hoy.length, 0);
    a.cerrar();
  });

  test('S8: el resumen cuenta pendientes de hoy y de mañana', () => {
    const a = abrirAgenda(':memory:', HOY);
    const t1 = a.crear('enviar informe', 'hoy');
    a.crear('llamar al cliente', 'hoy');
    a.crear('revisar cotización', 'manana');

    let r = a.resumen();
    assert.equal(r.hoyPendientes, 2);
    assert.equal(r.mananaPendientes, 1);
    assert.equal(r.totalPendientes, 3);
    assert.equal(r.totalHechas, 0);

    a.marcar(t1.id, true);
    r = a.resumen();
    assert.equal(r.hoyPendientes, 1);
    assert.equal(r.totalHechas, 1);
    assert.equal(r.totalPendientes, 2);
    a.cerrar();
  });
});
