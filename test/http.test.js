// Prueba de humo de la interfaz web: ejercita el recorrido completo por HTTP.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarServidor } from '../server.js';

const HOY = new Date(2026, 10, 14);

test('S3/S7: la web crea, lista, marca y borra tareas por HTTP', async () => {
  const { servidor, puerto, agenda } = await iniciarServidor({ puerto: 0, rutaDb: ':memory:', hoy: HOY });
  const base = 'http://127.0.0.1:' + puerto;
  const json = { 'content-type': 'application/json' };

  try {
    let r = await fetch(base + '/');
    assert.equal(r.status, 200);
    assert.match(await r.text(), /Agenda/);

    r = await fetch(base + '/api/tareas', {
      method: 'POST', headers: json, body: JSON.stringify({ texto: 'enviar informe', cuando: 'hoy' }),
    });
    assert.equal(r.status, 201);
    const creada = await r.json();

    r = await fetch(base + '/api/tareas');
    let v = await r.json();
    assert.equal(v.hoy.length, 1);
    assert.equal(v.resumen.hoyPendientes, 1);

    r = await fetch(base + '/api/tareas/' + creada.id, {
      method: 'PATCH', headers: json, body: JSON.stringify({ hecha: true }),
    });
    assert.equal(r.status, 200);

    r = await fetch(base + '/api/tareas');
    v = await r.json();
    assert.equal(v.hoy[0].hecha, true);

    r = await fetch(base + '/api/tareas', {
      method: 'POST', headers: json, body: JSON.stringify({ texto: '' }),
    });
    assert.equal(r.status, 400, 'sin texto tiene que rechazar');

    r = await fetch(base + '/api/tareas/' + creada.id, { method: 'DELETE' });
    assert.equal(r.status, 204);

    r = await fetch(base + '/api/tareas');
    v = await r.json();
    assert.equal(v.hoy.length, 0);
  } finally {
    servidor.close();
    agenda.cerrar();
  }
});
