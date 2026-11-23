# Avisos de mantenimiento: aplicación SAPUI5 sobre OData V4

Proyecto de la clase 9 del **Máster en Fiori SAPUI5: Frontend Programming with AI** de Logali Tech.

Aplicación SAPUI5 freestyle en TypeScript (SAPUI5 1.148) para gestionar los avisos de mantenimiento de una planta industrial. Consume un servicio RAP OData V4 con borrador, publicado en SAP S/4HANA. La especificación del proyecto está en la carpeta `docs/`: requisitos (`brief.md`), arquitectura (`arquitectura.md`), referencia del servicio (`servicio.md`) e historias de usuario (`especificacion/HU-01.md` a `HU-08.md`).

## Ramas

Cada rama contiene el proyecto tal como queda al terminar una historia de usuario. El historial tiene un commit por cada prompt de cada historia, en el mismo orden que en la clase: `git log` muestra la secuencia y `git diff` lo que cambió en cada una.

| Rama | Historia | Contenido |
|---|---|---|
| `main` y `00-punto-de-partida` | Inicio | Proyecto base con la especificación. Es el punto de partida del laboratorio |
| `01-hu01-aplicacion-conectada` | HU-01 | Modelo OData V4, rutas y Flexible Column Layout |
| `02-hu02-lista-de-avisos` | HU-02 | Lista de avisos con búsqueda, filtros, ordenación y recuento |
| `03-hu03-detalle-del-aviso` | HU-03 | Página de objeto con operaciones, repuestos y adjuntos |
| `04-hu04-crear-y-editar-con-borrador` | HU-04 | Alta, edición, guardado y descarte con borrador |
| `05-hu05-adjuntos` | HU-05 | Ficheros e imágenes, con miniatura, descarga y cámara. Solución de la clase |
| `06-hu06-acciones-de-negocio` | HU-06 | Asignar, iniciar, completar y rechazar avisos (tarea) |
| `07-hu07-ayudas-de-busqueda` | HU-07 | Ayudas de búsqueda de planta, equipo y material (tarea) |
| `08-hu08-indicadores` | HU-08 | Cuadro de indicadores con una librería de gráficos externa. Solución de la tarea |

Los prompts de cada historia están en el laboratorio de la clase 9 (documento 9.3 del aula virtual) y el acceso al servicio, en el documento 9.9.

## Cómo empezar

```bash
git clone https://github.com/logalitech/ui5-maintenance-requests.git maintenance
cd maintenance
npm install
```

Al clonar, el repositorio queda en la rama `main`, que es el punto de partida (el mismo contenido que `00-punto-de-partida`). Cada historia se trabaja en una rama propia creada desde ella, como indica el laboratorio: por ejemplo, `git switch -c hu-01-arquitectura-base`.

Para trabajar con el servicio real:

1. `ui5.yaml` ya apunta al servicio del máster, `https://ui5-pm.logalitech.com`. No hay que cambiarlo.
2. Crear en la raíz del proyecto un fichero `.env` con el usuario y la contraseña del servicio, que figuran en el aula virtual (documentos 9.9 y 9.12). El fichero no se sube al repositorio: está en `.gitignore`.

   ```text
   FIORI_TOOLS_USER='usuario'
   FIORI_TOOLS_PASSWORD='contraseña'
   ```

3. Arrancar con `npm start`.

Las credenciales son exclusivas del alumnado del máster: no se escriben en el código, en los commits ni en ningún repositorio propio.

Sin acceso al servicio, `npm run start-mock` arranca la aplicación con el servidor simulado y los datos de `webapp/localService`.

## Comparar con la solución de cada historia

```bash
# Ficheros que cambian en una historia
git diff --stat origin/01-hu01-aplicacion-conectada origin/02-hu02-lista-de-avisos

# Commits de la clase, uno por instrucción
git log --oneline origin/00-punto-de-partida..origin/05-hu05-adjuntos

# Lo que cambió un solo prompt (cada uno tiene su etiqueta: hu-01, hu-02a, hu-02b, hu-02c...)
git diff --stat hu-02a hu-02b

# Abrir el proyecto en el estado de una historia, sin tocar la rama de trabajo
git switch --detach origin/03-hu03-detalle-del-aviso
```

Para volver a la rama de trabajo: `git switch -`.

## Notas

- En la rama `05-hu05-adjuntos`, una prueba unitaria usa `assert.rejects`, que no existe en la versión de QUnit del iniciador de pruebas de SAPUI5 1.148. Se corrige en la rama `08-hu08-indicadores`.
- Desde la rama `06-hu06-acciones-de-negocio`, tras ejecutar una acción de negocio la habilitación de los botones puede no actualizarse hasta volver a abrir el aviso (HU-06, criterio 2).
- Las acciones de negocio cambian el estado del aviso de forma definitiva y el sistema es compartido: se prueban con avisos creados por uno mismo o con el servidor simulado.
- Todo el alumnado accede al servicio con el mismo usuario, así que para el sistema todos los borradores son del mismo usuario y no hay bloqueo entre participantes. Cada participante edita solo los avisos que ha creado (documento 9.9, apartado 6).
- Los adjuntos solo se pueden probar con el servicio real: el servidor simulado no admite contenido binario.

## Comprobaciones

```bash
npm run ts-typecheck
npm run lint
npx @ui5/linter
```
