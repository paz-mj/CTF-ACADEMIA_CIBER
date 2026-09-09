# Write-up CTF Introductorio - Academia de Ciberseguridad UCN

Este documento resume como correr, jugar y explicar el laboratorio CTF web de 5 niveles.

Publico objetivo: alumnos totalmente nuevos en ciberseguridad, sin experiencia tecnica previa. El objetivo no es "hackear" nada de verdad, sino perder el miedo a las herramientas de desarrollador del navegador y entender un puñado de conceptos basicos mediante acertijos cortos.

## 1) Como levantar el laboratorio

1. Abrir terminal en la carpeta del proyecto.
2. Instalar dependencias:

```bash
npm install
```

3. Iniciar servidor:

```bash
npm start
```

4. Abrir en navegador:

http://localhost:3000

## 2) Flujo general del CTF

- El alumno entra a la pagina principal y se registra con un nombre o apodo (formulario simple, sin contraseña).
- Al registrarse arranca su cronometro personal y queda guardado en una cookie (no puede acceder a ningun nivel sin registrarse primero).
- Debe resolver los niveles en orden.
- Cada nivel tiene un formulario para validar su flag.
- El servidor guarda progreso en cookie firmada y desbloquea el siguiente nivel.
- Si intentan saltar cambiando URL, el servidor responde Acceso bloqueado (403).
- Al validar la flag del nivel 5, se registra su tiempo de termino y se le redirige a la tabla de posiciones (/ranking).
- Cualquiera puede ver la tabla de posiciones en /ranking en cualquier momento (util para proyectarla en la sala).

## 3) Que ensena cada nivel

| Nivel | Tecnica | Herramienta del navegador |
|---|---|---|
| 1 | Ver codigo fuente de una pagina | Ctrl+U / "Ver codigo fuente" |
| 2 | Explorar subdirectorios editando la URL | Barra de direcciones |
| 3 | Leer la consola y decodificar Base64 | DevTools > Console |
| 4 | Inspeccionar cookies del sitio | DevTools > Application/Almacenamiento |
| 5 | Revisar cabeceras HTTP de la respuesta | DevTools > Network |

## 4) Resolucion por niveles

### Nivel 1 - Lo que no se ve a simple vista

Ruta:

- /nivel1/

Concepto a explicar en clase:

- Toda pagina web es, en el fondo, un archivo de texto (HTML) que el navegador interpreta.
- Se puede ver ese texto completo aunque no se muestre todo en pantalla.

Resolucion:

1. Clic derecho sobre la pagina > "Ver codigo fuente de la pagina" (o Ctrl+U).
2. Buscar con Ctrl+F la palabra ACADEMIA dentro del codigo.
3. La flag esta dentro de un comentario HTML (`<!-- ... -->`).

Flag:

- ACADEMIA{el_codigo_fuente_no_miente}

### Nivel 2 - No todas las puertas tienen cartel

Ruta:

- /nivel2/

Concepto a explicar en clase:

- Una web vive en carpetas y subcarpetas dentro del servidor.
- No todas las rutas tienen un link visible: algunas solo se llega a ellas escribiendo la direccion.

Resolucion:

1. En la barra de direcciones, agregar al final de la URL el nombre de una carpeta "escondida" clasica.
2. Llegar a /nivel2/oculto/clave.txt
3. Copiar la flag.

Flag:

- ACADEMIA{las_rutas_tambien_hablan}

### Nivel 3 - El codigo susurra

Ruta:

- /nivel3/

Concepto a explicar en clase:

- La consola del navegador (DevTools > Console) muestra mensajes que los sitios imprimen, normalmente solo utiles para quien programa.
- Base64 no es un cifrado: es solo una forma de representar texto. Se puede decodificar con `atob()` en la misma consola o con cualquier decodificador online.

Resolucion:

1. Abrir la consola del navegador (F12).
2. Recargar la pagina y leer el mensaje impreso.
3. Decodificar:

```
RmxhZzogQUNBREVNSUF7ZWxfY29kaWdvX3RhbWJpZW5fZXNfcGlzdGF9
```

4. Resultado:

Flag: ACADEMIA{el_codigo_tambien_es_pista}

### Nivel 4 - Una galletita con secretos

Ruta:

- /nivel4/

Concepto a explicar en clase:

- Las cookies son datos que el servidor guarda en el navegador del visitante (por ejemplo, para recordar el progreso del propio CTF).
- Se pueden inspeccionar desde DevTools sin instalar nada extra.

Resolucion:

1. Abrir DevTools (F12) > pestana Application (Chrome/Edge) o Almacenamiento (Firefox).
2. Ir a Cookies > seleccionar el sitio.
3. Buscar la cookie `pista_nivel4` y copiar su valor.
4. Decodificar ese valor en Base64 (por ejemplo con `atob('...')` en la consola).

Flag:

- ACADEMIA{las_cookies_guardan_secretos}

### Nivel 5 - La ultima llave viaja escondida

Ruta:

- /nivel5/

Concepto a explicar en clase:

- Cada respuesta HTTP trae, ademas del contenido visible, cabeceras (headers) con informacion adicional.
- Esas cabeceras se ven en DevTools > Network, seleccionando la peticion del documento.

Resolucion:

1. Abrir DevTools (F12) > pestana Network.
2. Recargar la pagina con esa pestana abierta.
3. Hacer clic en la primera peticion (el documento HTML).
4. Buscar en Response Headers la cabecera `X-Academia-Flag`.

Flag final:

- ACADEMIA{la_respuesta_viaja_escondida}

## 5) Nota tecnica de seguridad del laboratorio

- Este CTF es educativo y local.
- No busca simular un entorno real ofensivo, sino perder el miedo a las herramientas basicas del navegador.
- El bloqueo por nivel se hace en servidor para evitar bypass simple por URL.
- El progreso se guarda en cookie firmada para evitar manipulacion trivial.
- La cookie `pista_nivel4` y la cabecera `X-Academia-Flag` son parte intencional del acertijo de esos niveles, no son datos sensibles reales.
- La tabla de posiciones se guarda en memoria (no en una base de datos): si el servidor se reinicia durante la clase, se pierde. Para una sesion corta de un dia es suficiente.
- Los nombres se identifican por navegador (cookie), no hay contraseña. Si dos alumnos usan el mismo nombre, van a aparecer como dos filas distintas en la tabla.

## 6) Ayuda automatica y tabla de posiciones

- Cada nivel tiene una ayuda paso a paso escondida detras de un boton ("Mostrar ayuda paso a paso"). Si el alumno lleva 5 minutos o mas en el mismo nivel sin resolverlo, esa ayuda se despliega sola (control por navegador, usando localStorage, no requiere nada del servidor).
- Si un alumno recarga la pagina antes de los 5 minutos, el cronometro de la ayuda no se reinicia: sigue contando desde que entro por primera vez a ese nivel.
- La tabla de posiciones (/ranking) muestra solo a quienes ya completaron el nivel 5, ordenados del mas rapido al mas lento, calculando el tiempo desde que cada uno se registro hasta que valido la flag final.
- El boton "Reiniciar progreso" en la pagina principal borra por completo el registro del alumno (nombre, progreso y tiempo), asi puede volver a intentarlo desde cero si es necesario.

## 7) Sugerencia para clase

Secuencia recomendada (CTF cortito, pensado para una sesion de introduccion):

1. Presentar la idea: "hoy vamos a perder el miedo a las herramientas del navegador".
2. Resolver el nivel 1 en vivo, mostrando Ctrl+U.
3. Dejar el nivel 2 al grupo (dar el tip de "nombres clasicos de carpetas ocultas" si se traban).
4. Resolver el nivel 3 en conjunto, explicando que es Base64.
5. Dejar los niveles 4 y 5 como cierre/competencia corta, mostrando antes, una sola vez, como se abre DevTools.

Frase de inicio sugerida:

Hoy no venimos solo a mirar una pagina web: venimos a aprender a mirarla distinto. Todo lo que ves en un navegador tiene una capa que no se muestra a simple vista, y en ciberseguridad, aprender a mirar esa capa es el primer paso.
