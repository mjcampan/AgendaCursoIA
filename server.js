// Interfaz web local: `npm run web`  ->  http://localhost:3000
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { abrirAgenda } from './agenda.js';

const AQUI = dirname(fileURLToPath(import.meta.url));

function responder(res, codigo, cuerpo, tipo = 'application/json; charset=utf-8') {
  res.writeHead(codigo, { 'content-type': tipo, 'cache-control': 'no-store' });
  res.end(typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo));
}

async function leerCuerpo(req, limite = 64 * 1024) {
  let total = 0;
  const partes = [];
  for await (const trozo of req) {
    total += trozo.length;
    if (total > limite) throw new Error('El cuerpo de la petición es demasiado grande');
    partes.push(trozo);
  }
  if (!partes.length) return {};
  return JSON.parse(Buffer.concat(partes).toString('utf8'));
}

async function manejar(req, res, agenda) {
  const ruta = new URL(req.url, 'http://localhost').pathname;

  try {
    if (req.method === 'GET' && (ruta === '/' || ruta === '/index.html')) {
      const html = await readFile(join(AQUI, 'public', 'index.html'), 'utf8');
      return responder(res, 200, html, 'text/html; charset=utf-8');
    }

    if (ruta === '/api/tareas') {
      if (req.method === 'GET') {
        return responder(res, 200, { ...agenda.listar(), resumen: agenda.resumen() });
      }
      if (req.method === 'POST') {
        const cuerpo = await leerCuerpo(req);
        try {
          return responder(res, 201, agenda.crear(cuerpo.texto, cuerpo.cuando));
        } catch (e) {
          return responder(res, 400, { error: e.message });
        }
      }
      return responder(res, 405, { error: 'Método no permitido' });
    }

    const coincidencia = ruta.match(/^\/api\/tareas\/(\d+)$/);
    if (coincidencia) {
      const id = Number(coincidencia[1]);
      if (req.method === 'PATCH') {
        const cuerpo = await leerCuerpo(req);
        if (!agenda.marcar(id, Boolean(cuerpo.hecha))) return responder(res, 404, { error: 'No existe' });
        return responder(res, 200, agenda.buscar(id));
      }
      if (req.method === 'DELETE') {
        if (!agenda.quitar(id)) return responder(res, 404, { error: 'No existe' });
        res.writeHead(204);
        return res.end();
      }
      return responder(res, 405, { error: 'Método no permitido' });
    }

    return responder(res, 404, { error: 'No encontrado' });
  } catch (e) {
    return responder(res, 500, { error: e.message });
  }
}

export async function iniciarServidor(opciones = {}) {
  const agenda = abrirAgenda(opciones.rutaDb || 'agenda.db', opciones.hoy);
  const servidor = http.createServer((req, res) => manejar(req, res, agenda));
  const puerto = opciones.puerto ?? 3000;

  await new Promise((listo, fallo) => {
    servidor.once('error', fallo);
    servidor.listen(puerto, '127.0.0.1', listo);
  });

  return { servidor, puerto: servidor.address().port, agenda };
}

const esPrincipal = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (esPrincipal) {
  const { puerto, agenda } = await iniciarServidor({ puerto: Number(process.env.PORT) || 3000 });
  console.log('\n  Agenda de Mauricio — interfaz web');
  console.log('  Abrí http://localhost:' + puerto + ' en el navegador');
  console.log('  Los datos se guardan en ' + agenda.ruta + '\n');
  console.log('  Ctrl+C para cerrar.\n');

  const cerrar = () => {
    console.log('\n  Cerrando la agenda.');
    agenda.cerrar();
    process.exit(0);
  };
  process.on('SIGINT', cerrar);
  process.on('SIGTERM', cerrar);
}
