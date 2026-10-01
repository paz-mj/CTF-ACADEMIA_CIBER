# CTF Introductorio – Academia de Ciberseguridad UCN

Laboratorio CTF web de 5 niveles, creado para el primer evento interno de la **Academia de Ciberseguridad UCN**. Está pensado para estudiantes sin experiencia previa: el objetivo es perder el miedo a las herramientas del navegador y entender conceptos básicos de seguridad web resolviendo desafíos cortos.

## Niveles

| Nivel | Técnica | Herramienta |
|---|---|---|
| 1 | Revisar el código fuente | Ver código fuente |
| 2 | Explorar subdirectorios | Barra de direcciones |
| 3 | Leer la consola y decodificar Base64 | DevTools › Console |
| 4 | Inspeccionar cookies | DevTools › Application |
| 5 | Revisar cabeceras HTTP | DevTools › Network |

## Funcionamiento

- Registro con nombre o apodo y cronómetro individual.
- Progreso guardado en una cookie firmada: no se puede saltar niveles editando la URL (responde 403).
- Tabla de posiciones en `/ranking`, pensada para proyectarse en la sala.

La resolución completa y cómo explicar cada nivel en clase están en [WRITEUP.md](WRITEUP.md).

## Ejecutar en local

```bash
npm install
npm start
# http://localhost:3000
```

Incluye `render.yaml` para desplegar en Render. Variable de entorno: `CTF_SECRET`.

## Tecnologías

Node.js · Express
