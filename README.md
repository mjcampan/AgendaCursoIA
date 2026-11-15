# Demo de Agenda — Lab 02

Agenda personal local de **Mauricio Campaña** para el Módulo 1 del curso
«De Usuario a Orquestador». Funciona sin internet, por terminal y en el
navegador, con los datos en una base SQLite en este mismo equipo.

## Requisitos

- Node.js 22.5 o superior (usa `node:sqlite` y `node:test`, ambos incluidos).
- **No hay dependencias que instalar**: no existe `node_modules`.

Verificalo con:

```bash
node -v
```

## Los tres comandos

| Para qué | Comando | Qué hace |
|---|---|---|
| Abrir por terminal | `npm start` | Abre la agenda en la terminal, con comandos para agregar, marcar y borrar. |
| Abrir en el navegador | `npm run web` | Levanta la interfaz web en `http://localhost:3000`. |
| Verificar que funciona | `npm test` | Corre las 11 pruebas del proyecto, sin internet y sin tocar tus datos. |

Para cerrar la web: `Ctrl+C` en la terminal donde la abriste.

## Dónde quedan las tareas

En el archivo **`agenda.db`** de esta carpeta. Es una base SQLite con una sola
tabla:

> `agenda.db` no se sube al repositorio: está en `.gitignore` porque es un dato
> local, no código. Se crea sola la primera vez que abrís la agenda.

```sql
CREATE TABLE tareas (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  texto  TEXT    NOT NULL,
  fecha  TEXT    NOT NULL,   -- AAAA-MM-DD
  hecha  INTEGER NOT NULL DEFAULT 0,
  creada TEXT    NOT NULL
);
```

Para leerla desde afuera de la aplicación:

```bash
node -e "const {DatabaseSync}=require('node:sqlite');
const db=new DatabaseSync('agenda.db');
console.table(db.prepare('SELECT * FROM tareas').all())"
```

## Cómo está construido

Se siguió el flujo que pide el laboratorio: **especificación primero** (SDD) y
**pruebas antes del código** (TDD).

```
ESPECIFICACION.md     los requisitos S1..S9 y lo que queda fuera de alcance
agenda.js             dominio + SQLite: crear, listar, marcar, quitar, resumen
cli.js                interfaz de terminal
server.js             servidor HTTP local y API JSON
public/index.html     interfaz web (un solo archivo, sin librerías)
test/agenda.test.js   10 pruebas del dominio
test/http.test.js     1 prueba de humo de la API por HTTP
```

Las pruebas usan una fecha fija (14 de noviembre de 2026) y una base en
`:memory:` para no depender del día real ni ensuciar `agenda.db`.

## Comandos de la terminal

```
a <texto>   agregar una tarea para hoy
m <texto>   agregar una tarea para mañana
h <id>      marcar o desmarcar una tarea como hecha
x <id>      borrar una tarea
l           volver a listar
q           salir
```

## Alcance

Es una prueba de concepto. Quedan afuera, a propósito: usuarios y contraseñas,
sincronización entre equipos, recordatorios, repetición de tareas y edición del
texto de una tarea ya creada.
