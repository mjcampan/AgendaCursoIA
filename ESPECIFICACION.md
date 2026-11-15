// Especificación de la agenda (SDD: especificar antes de construir)
//
// S1. Guarda tareas de HOY y de MAÑANA, sin conexión a internet.
// S2. Cada tarea tiene texto, fecha, estado (hecha / pendiente) y un id.
// S3. Las tareas se guardan en una base SQLite local llamada agenda.db.
// S4. Se puede marcar y desmarcar una tarea como hecha; el estado sobrevive
//     al cierre de la aplicación.
// S5. Las tareas se muestran separadas en «hoy» y «mañana».
// S6. Una tarea con fecha fuera de hoy/mañana no se pierde: aparece en
//     «otras fechas».
// S7. Hay dos formas de uso: terminal (npm start) y navegador en localhost
//     (npm run web, puerto 3000).
// S8. Hay un resumen con las tareas pendientes de hoy y de mañana.
// S9. Las pruebas se ejecutan con npm test y no necesitan internet.
//
// Fuera de alcance (a propósito, es una prueba de concepto):
// - usuarios, contraseñas y sincronización entre equipos;
// - recordatorios, notificaciones y repetición de tareas;
// - edición del texto de una tarea ya creada.
