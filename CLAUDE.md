## Proyecto

Aplicación SAPUI5 "Avisos de mantenimiento" (id sapui5.maintenance), freestyle, en TypeScript, sobre un servicio RAP OData V4 con borrador. La especificación está en docs/: lee docs/brief.md, docs/arquitectura.md y la historia que se te pida en docs/especificacion/ antes de escribir código.

## Guidelines for UI5

Use the `get_guidelines` tool of the UI5 MCP server to retrieve the latest coding standards and best practices for UI5 development. Antes de usar una API de SAPUI5 que no sea trivial, consúltala con `get_api_reference`: la versión del proyecto es la 1.148 y no se usan API obsoletas.

## Convenciones

- TypeScript estricto, sin `any`. Los tipos de las entidades del servicio están en webapp/model/types.ts.
- Todos los controladores extienden webapp/controller/BaseController.ts.
- El acceso a datos se hace con bindings y contextos del modelo OData V4. No se usa fetch ni XMLHttpRequest, salvo en webapp/service/AttachmentService.ts para el contenido binario.
- La lógica del borrador vive en webapp/service/DraftService.ts; los controladores no construyen nombres de acciones.
- Ningún texto visible en vistas ni controladores: todo va a i18n, en inglés (i18n.properties) y en español (i18n_es.properties), con su comentario de tipo de texto.
- Vistas en XML. Fragmentos cargados con loadFragment, una sola vez.
- Formateadores en webapp/model/formatter.ts. Constantes de estados y prioridades en webapp/model/constants.ts.
- No se modifican webapp/localService/mainService/metadata.xml ni los ficheros de docs/.

## Comprobaciones obligatorias al terminar

npm run ts-typecheck, npm run lint y npx @ui5/linter, sin errores. No arranques ningún servidor.
