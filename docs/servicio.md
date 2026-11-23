# Referencia del servicio de avisos de mantenimiento

Referencia obtenida de `webapp/localService/mainService/metadata.xml` y de las pruebas HTTP realizadas contra el servicio real. Los nombres de propiedades, navegaciones, acciones y parámetros se escriben exactamente como figuran en los metadatos.

## 1. Datos generales

| Dato | Valor |
|---|---|
| URL | `/sap/opu/odata4/sap/zui_mnt_request_o4/srvd/sap/zui_mnt_request/0001/` |
| Mandante | 250 |
| Protocolo | OData V4, servicio RAP con borrador |
| Espacio de nombres | `com.sap.gateway.srvd.zui_mnt_request.v0001` (alias `SAP__self`) |
| Contenedor | `Container` |

### 1.1 Conjuntos de entidades

| Conjunto | Tipo de entidad | Clave | Alta | Modificación | Borrado | `$search` |
|---|---|---|---|---|---|---|
| `Requests` | `RequestsType` | `RequestUUID`, `IsActiveEntity` | Sí | Según `__EntityControl/Updatable` | Según `__EntityControl/Deletable` | Sí |
| `Tasks` | `TasksType` | `TaskUUID`, `IsActiveEntity` | Solo por `Requests(...)/_Task` | Según `__EntityControl/Updatable` | Según `__EntityControl/Deletable` | No |
| `Parts` | `PartsType` | `PartUUID`, `IsActiveEntity` | Solo por `Requests(...)/_Part` | Según `__EntityControl/Updatable` | Según `__EntityControl/Deletable` | No |
| `Attachments` | `AttachmentsType` | `AttachmentUUID`, `IsActiveEntity` | Solo por `Requests(...)/_Attachment` | Según `__EntityControl/Updatable` | Según `__EntityControl/Deletable` | No |
| `Plants` | `PlantsType` | `Plant` | No | No | No | Sí |
| `Equipments` | `EquipmentsType` | `Equipment` | No | No | No | Sí |
| `Products` | `ProductsType` | `Product` | No | No | No | Sí |
| `Statuses` | `StatusesType` | `Status` | No | No | No | No |
| `Priorities` | `PrioritiesType` | `Priority` | No | No | No | No |
| `RequestTypes` | `RequestTypesType` | `RequestType` | No | No | No | No |
| `RequestStats` | `RequestStatsType` | `Plant`, `Status`, `Priority` | No | No | No | No |

Los metadatos incluyen también el conjunto técnico `I_DraftAdministrativeData` (tipo `I_DraftAdministrativeDataType`), que no admite lectura directa.

### 1.2 Datos disponibles

| Conjunto | Contenido |
|---|---|
| `Requests` | 60 avisos, del `10000001` al `10000060`, en las plantas 2410, 1010, 1210, 1710 y 5510 (12 por planta) |
| `Tasks` | 180 operaciones |
| `Parts` | 90 repuestos, con los materiales `SP001` a `SP006` |
| `Attachments` | 10 imágenes SVG |
| `Plants` | 23 plantas |
| `Equipments` | Equipos vigentes; la planta 2410 tiene 93 |
| `Products` | 355 materiales |

## 2. Entidades

Convenciones de las tablas:

- **Longitud o precisión**: `MaxLength` para las cadenas; precisión y escala para los decimales; precisión para las fechas con hora.
- **Editable**: indica si la aplicación puede modificar la propiedad. "No" significa que la fija el servicio.
- **Anulable**: se indica en la nota. Las propiedades sin esa mención son no anulables (`Nullable="false"`).

### 2.1 Request (conjunto `Requests`, tipo `RequestsType`)

Aviso de mantenimiento. Raíz del borrador.

| Propiedad | Tipo Edm | Longitud o precisión | Editable | Nota |
|---|---|---|---|---|
| `RequestUUID` | `Edm.Guid` | | No | Clave. La asigna el servicio |
| `RequestID` | `Edm.String` | 8 | No | Número de aviso, solo dígitos. Se asigna al activar el borrador por primera vez, a partir de `10000001` |
| `Title` | `Edm.String` | 80 | Sí | Obligatorio |
| `Description` | `Edm.String` | 1000 | Sí | No admite ordenación. En `$filter` solo admite expresiones de búsqueda |
| `RequestType` | `Edm.String` | 2 | Sí | Obligatorio. Código de `RequestTypes`. Texto en `RequestTypeText` |
| `RequestTypeText` | `Edm.String` | 40 | No | Texto del tipo |
| `Priority` | `Edm.String` | 1 | Sí | Obligatorio. Código de `Priorities`. Texto en `PriorityText`. Si se crea vacía, el servicio pone `3` |
| `PriorityText` | `Edm.String` | 40 | No | Texto de la prioridad |
| `PriorityCriticality` | `Edm.Byte` | | No | Criticidad de la prioridad (apartado 8) |
| `Status` | `Edm.String` | 2 | No | Código de `Statuses`. Texto en `StatusText`. Cambia solo por acciones. Valor inicial `NW` |
| `StatusText` | `Edm.String` | 40 | No | Texto del estado |
| `StatusCriticality` | `Edm.Byte` | | No | Criticidad del estado (apartado 8) |
| `Plant` | `Edm.String` | 4 | Sí | Obligatorio. Código de `Plants`. Texto en `PlantName` |
| `PlantName` | `Edm.String` | 30 | No | Nombre de la planta |
| `Equipment` | `Edm.String` | 18 | Sí | Obligatorio. Código de `Equipments`. Debe pertenecer a la planta. Se devuelve sin ceros a la izquierda, por ejemplo `224100001`. Texto en `EquipmentName` |
| `EquipmentName` | `Edm.String` | 40 | No | Nombre del equipo |
| `FunctionalLocation` | `Edm.String` | 30 | No | Ubicación técnica del equipo |
| `ReportedBy` | `Edm.String` | 12 | No | Usuario que notifica. Al crear, el usuario de la sesión |
| `AssignedTo` | `Edm.String` | 40 | No | Técnico asignado. Lo fija la acción `assign` |
| `RequiredEndDate` | `Edm.Date` | | Sí | Anulable. Fecha límite. No puede ser anterior a la fecha de creación del aviso |
| `StartedAt` | `Edm.DateTimeOffset` | 7 | No | Anulable. Inicio del trabajo. Lo fija `startWork` |
| `CompletedAt` | `Edm.DateTimeOffset` | 7 | No | Anulable. Fin del trabajo. Lo fija `complete` |
| `DowntimeHours` | `Edm.Decimal` | 6, escala 1 | No | Horas de parada. Parámetro de `complete` |
| `ResolutionText` | `Edm.String` | 1000 | No | Resolución. Parámetro de `complete`. No admite ordenación. En `$filter` solo admite expresiones de búsqueda |
| `RejectionReason` | `Edm.String` | 255 | No | Motivo del rechazo. Parámetro de `reject` |
| `EstimatedCost` | `Edm.Decimal` | 15, escala variable | No | Coste estimado: suma de cantidad por precio de los repuestos. Importe en `CurrencyCode` |
| `CurrencyCode` | `Edm.String` | 5 | No | Moneda de `EstimatedCost`. El servicio pone `EUR` al crear. Los metadatos no la marcan como calculada; la aplicación no la modifica |
| `LocalCreatedBy` | `Edm.String` | 12 | No | Usuario de creación |
| `LocalCreatedAt` | `Edm.DateTimeOffset` | 7 | No | Anulable. Fecha de creación |
| `LocalLastChangedBy` | `Edm.String` | 12 | No | Usuario de la última modificación |
| `LocalLastChangedAt` | `Edm.DateTimeOffset` | 7 | No | Anulable. Fecha de la última modificación. Es el ETag de la entidad |
| `LastChangedAt` | `Edm.DateTimeOffset` | 7 | No | Anulable. Marca de tiempo global del aviso; el servicio la usa como ETag total del borrador |
| `HasDraftEntity` | `Edm.Boolean` | | No | Borrador (apartado 4) |
| `DraftEntityCreationDateTime` | `Edm.DateTimeOffset` | 7 | No | Anulable. Borrador (apartado 4) |
| `DraftEntityLastChangeDateTime` | `Edm.DateTimeOffset` | 7 | No | Anulable. Borrador (apartado 4) |
| `HasActiveEntity` | `Edm.Boolean` | | No | Borrador (apartado 4) |
| `IsActiveEntity` | `Edm.Boolean` | | No | Clave. Borrador (apartado 4) |
| `__CreateByAssociationControl` | `RequestsCbAControl` | | No | Anulable. Control dinámico (apartado 6) |
| `__EntityControl` | `EntityControl` | | No | Anulable. Control dinámico (apartado 6) |
| `__OperationControl` | `RequestsOperationControl` | | No | Anulable. Control dinámico (apartado 6) |
| `SAP__Messages` | `Collection(SAP__Message)` | | No | Mensajes del servicio ligados a la entidad (apartado 10) |

Navegaciones:

| Navegación | Destino | Cardinalidad | Nota |
|---|---|---|---|
| `_Task` | `TasksType` (conjunto `Tasks`) | Colección | Composición. Borrado en cascada |
| `_Part` | `PartsType` (conjunto `Parts`) | Colección | Composición. Borrado en cascada |
| `_Attachment` | `AttachmentsType` (conjunto `Attachments`) | Colección | Composición. Borrado en cascada |
| `_Plant` | `PlantsType` (conjunto `Plants`) | Una, anulable | Planta |
| `_Equipment` | `EquipmentsType` (conjunto `Equipments`) | Una, anulable | Equipo |
| `_Status` | `StatusesType` (conjunto `Statuses`) | Una, anulable | Estado |
| `_Priority` | `PrioritiesType` (conjunto `Priorities`) | Una, anulable | Prioridad |
| `_Type` | `RequestTypesType` (conjunto `RequestTypes`) | Una, anulable | Tipo de aviso |
| `SiblingEntity` | `RequestsType` (conjunto `Requests`) | Una, anulable | Borrador (apartado 4) |
| `DraftAdministrativeData` | `I_DraftAdministrativeDataType` | Una, anulable | Borrador (apartado 4) |

### 2.2 Task (conjunto `Tasks`, tipo `TasksType`)

Operación del aviso. Nodo del borrador: se activa con el aviso.

| Propiedad | Tipo Edm | Longitud o precisión | Editable | Nota |
|---|---|---|---|---|
| `TaskUUID` | `Edm.Guid` | | No | Clave. La asigna el servicio |
| `RequestUUID` | `Edm.Guid` | | No | Aviso al que pertenece |
| `TaskNumber` | `Edm.String` | 4 | Sí | Posición, solo dígitos. El servicio la devuelve sin ceros a la izquierda (`"10"`) |
| `Description` | `Edm.String` | 80 | Sí | Operación |
| `PlannedHours` | `Edm.Decimal` | 5, escala 1 | Sí | Horas previstas |
| `ActualHours` | `Edm.Decimal` | 5, escala 1 | Sí | Horas reales |
| `IsCompleted` | `Edm.Boolean` | | Sí | Terminada |
| `LocalLastChangedAt` | `Edm.DateTimeOffset` | 7 | No | Anulable. ETag de la entidad |
| `HasDraftEntity` | `Edm.Boolean` | | No | Borrador (apartado 4) |
| `DraftEntityCreationDateTime` | `Edm.DateTimeOffset` | 7 | No | Anulable. Borrador (apartado 4) |
| `DraftEntityLastChangeDateTime` | `Edm.DateTimeOffset` | 7 | No | Anulable. Borrador (apartado 4) |
| `HasActiveEntity` | `Edm.Boolean` | | No | Borrador (apartado 4) |
| `IsActiveEntity` | `Edm.Boolean` | | No | Clave. Borrador (apartado 4) |
| `__EntityControl` | `EntityControl` | | No | Anulable. Control dinámico (apartado 6) |
| `SAP__Messages` | `Collection(SAP__Message)` | | No | Mensajes del servicio ligados a la entidad |

Navegaciones: `_Request` (`RequestsType`, una, no anulable, ligada por `RequestUUID`), `SiblingEntity` (`TasksType`, una, anulable) y `DraftAdministrativeData` (`I_DraftAdministrativeDataType`, una, anulable).

### 2.3 Part (conjunto `Parts`, tipo `PartsType`)

Repuesto del aviso. Nodo del borrador: se activa con el aviso.

| Propiedad | Tipo Edm | Longitud o precisión | Editable | Nota |
|---|---|---|---|---|
| `PartUUID` | `Edm.Guid` | | No | Clave. La asigna el servicio |
| `RequestUUID` | `Edm.Guid` | | No | Aviso al que pertenece |
| `Product` | `Edm.String` | 18 | Sí | Material. Código de `Products`. Texto en `ProductName` |
| `ProductName` | `Edm.String` | 40 | No | Nombre del material |
| `Quantity` | `Edm.Decimal` | 13, escala 3 | Sí | Cantidad, en la unidad `QuantityUnit`. Debe ser mayor que cero. Admite números JSON |
| `QuantityUnit` | `Edm.String` | 3 | Sí | Unidad de medida, con el código interno de la unidad (`ST`), el mismo que `BaseUnit` de `Products`. La lista de códigos de unidades que publica el servicio no está completa en todos los idiomas (en español contiene una sola entrada) y usa como clave el código externo: la unidad puede no figurar en ella |
| `UnitPrice` | `Edm.Decimal` | 15, escala variable | Sí | Precio unitario. Importe en `CurrencyCode`. Admite números JSON |
| `CurrencyCode` | `Edm.String` | 5 | Sí | Moneda de `UnitPrice` |
| `LocalLastChangedAt` | `Edm.DateTimeOffset` | 7 | No | Anulable. ETag de la entidad |
| `HasDraftEntity` | `Edm.Boolean` | | No | Borrador (apartado 4) |
| `DraftEntityCreationDateTime` | `Edm.DateTimeOffset` | 7 | No | Anulable. Borrador (apartado 4) |
| `DraftEntityLastChangeDateTime` | `Edm.DateTimeOffset` | 7 | No | Anulable. Borrador (apartado 4) |
| `HasActiveEntity` | `Edm.Boolean` | | No | Borrador (apartado 4) |
| `IsActiveEntity` | `Edm.Boolean` | | No | Clave. Borrador (apartado 4) |
| `__EntityControl` | `EntityControl` | | No | Anulable. Control dinámico (apartado 6) |
| `SAP__Messages` | `Collection(SAP__Message)` | | No | Mensajes del servicio ligados a la entidad |

Navegaciones: `_Request` (`RequestsType`, una, no anulable, ligada por `RequestUUID`), `_Product` (`ProductsType`, una, anulable), `SiblingEntity` (`PartsType`, una, anulable) y `DraftAdministrativeData` (`I_DraftAdministrativeDataType`, una, anulable).

Ejemplo de alta verificado, sobre el borrador de un aviso:

```text
POST Requests(RequestUUID=<uuid>,IsActiveEntity=false)/_Part
{"Product":"SP001","Quantity":2,"QuantityUnit":"ST","UnitPrice":12.5,"CurrencyCode":"EUR"}
```

### 2.4 Attachment (conjunto `Attachments`, tipo `AttachmentsType`)

Adjunto del aviso. Nodo del borrador: se activa con el aviso. El flujo de subida y lectura está en el apartado 7.

| Propiedad | Tipo Edm | Longitud o precisión | Editable | Nota |
|---|---|---|---|---|
| `AttachmentUUID` | `Edm.Guid` | | No | Clave. La asigna el servicio |
| `RequestUUID` | `Edm.Guid` | | No | Aviso al que pertenece |
| `FileName` | `Edm.String` | 255 | Sí | Nombre del fichero. La subida del contenido lo sustituye por el de la cabecera `Content-Disposition` |
| `MimeType` | `Edm.String` | 128 | Sí | Tipo de contenido. La subida del contenido lo sustituye por el de la cabecera `Content-Type` |
| `Attachment` | `Edm.Stream` | | Sí, con `PUT` | Anulable. Contenido binario. Su tipo está en `MimeType` y su nombre en `FileName` |
| `AttComment` | `Edm.String` | 80 | Sí | Comentario |
| `LocalCreatedBy` | `Edm.String` | 12 | No | Usuario de creación |
| `LocalCreatedAt` | `Edm.DateTimeOffset` | 7 | No | Anulable. Fecha de creación |
| `LocalLastChangedAt` | `Edm.DateTimeOffset` | 7 | No | Anulable. ETag de la entidad |
| `HasDraftEntity` | `Edm.Boolean` | | No | Borrador (apartado 4) |
| `DraftEntityCreationDateTime` | `Edm.DateTimeOffset` | 7 | No | Anulable. Borrador (apartado 4) |
| `DraftEntityLastChangeDateTime` | `Edm.DateTimeOffset` | 7 | No | Anulable. Borrador (apartado 4) |
| `HasActiveEntity` | `Edm.Boolean` | | No | Borrador (apartado 4) |
| `IsActiveEntity` | `Edm.Boolean` | | No | Clave. Borrador (apartado 4) |
| `__EntityControl` | `EntityControl` | | No | Anulable. Control dinámico (apartado 6) |
| `SAP__Messages` | `Collection(SAP__Message)` | | No | Mensajes del servicio ligados a la entidad |

Navegaciones: `_Request` (`RequestsType`, una, no anulable, ligada por `RequestUUID`), `SiblingEntity` (`AttachmentsType`, una, anulable) y `DraftAdministrativeData` (`I_DraftAdministrativeDataType`, una, anulable).

### 2.5 Plant (conjunto `Plants`, tipo `PlantsType`)

Plantas con equipos. Solo lectura. Sin navegaciones.

| Propiedad | Tipo Edm | Longitud o precisión | Editable | Nota |
|---|---|---|---|---|
| `Plant` | `Edm.String` | 4 | No | Clave. Texto en `PlantName` |
| `PlantName` | `Edm.String` | 30 | No | Nombre de la planta |
| `EquipmentCount` | `Edm.Int32` | | No | Número de equipos de la planta |

### 2.6 Equipment (conjunto `Equipments`, tipo `EquipmentsType`)

Equipos vigentes. Solo lectura. Sin navegaciones.

| Propiedad | Tipo Edm | Longitud o precisión | Editable | Nota |
|---|---|---|---|---|
| `Equipment` | `Edm.String` | 18 | No | Clave. Sin ceros a la izquierda. Texto en `EquipmentName` |
| `EquipmentName` | `Edm.String` | 40 | No | Nombre del equipo: el del idioma de la sesión y, si no existe, el inglés. Es el que se muestra |
| `Plant` | `Edm.String` | 4 | No | Planta de mantenimiento del equipo |
| `FunctionalLocation` | `Edm.String` | 30 | No | Ubicación técnica |
| `TechnicalObjectType` | `Edm.String` | 10 | No | Tipo de objeto técnico |
| `EquipmentNameInLanguage` | `Edm.String` | 40 | No | Nombre en el idioma de la sesión; vacío si no existe. Columna de búsqueda: no se muestra |
| `EquipmentNameInEnglish` | `Edm.String` | 40 | No | Nombre en inglés. Columna de búsqueda: no se muestra |

### 2.7 Product (conjunto `Products`, tipo `ProductsType`)

Materiales. Solo lectura. Sin navegaciones.

| Propiedad | Tipo Edm | Longitud o precisión | Editable | Nota |
|---|---|---|---|---|
| `Product` | `Edm.String` | 18 | No | Clave. Texto en `ProductName` |
| `ProductName` | `Edm.String` | 40 | No | Nombre del material: el del idioma de la sesión y, si no existe, el inglés. Es el que se muestra |
| `ProductType` | `Edm.String` | 4 | No | Tipo de material |
| `BaseUnit` | `Edm.String` | 3 | No | Unidad de medida base, con el código interno de la unidad (`ST` para los repuestos `SP001` a `SP006`). Es el valor que se copia en `QuantityUnit` de un repuesto |
| `ProductNameInLanguage` | `Edm.String` | 40 | No | Nombre en el idioma de la sesión; vacío si no existe. Columna de búsqueda: no se muestra |
| `ProductNameInEnglish` | `Edm.String` | 40 | No | Nombre en inglés. Columna de búsqueda: no se muestra |

### 2.8 Status (conjunto `Statuses`, tipo `StatusesType`)

Lista de estados. Solo lectura. Sin navegaciones.

| Propiedad | Tipo Edm | Longitud o precisión | Editable | Nota |
|---|---|---|---|---|
| `Status` | `Edm.String` | 2 | No | Clave. Texto en `StatusText` |
| `StatusText` | `Edm.String` | 40 | No | Texto del estado |
| `Criticality` | `Edm.Byte` | | No | Criticidad (apartado 8) |
| `SortOrder` | `Edm.Byte` | | No | Orden de presentación |

### 2.9 Priority (conjunto `Priorities`, tipo `PrioritiesType`)

Lista de prioridades. Solo lectura. Sin navegaciones.

| Propiedad | Tipo Edm | Longitud o precisión | Editable | Nota |
|---|---|---|---|---|
| `Priority` | `Edm.String` | 1 | No | Clave. Texto en `PriorityText` |
| `PriorityText` | `Edm.String` | 40 | No | Texto de la prioridad |
| `Criticality` | `Edm.Byte` | | No | Criticidad (apartado 8) |
| `SortOrder` | `Edm.Byte` | | No | Orden de presentación |

### 2.10 RequestType (conjunto `RequestTypes`, tipo `RequestTypesType`)

Lista de tipos de aviso. Solo lectura. Sin navegaciones.

| Propiedad | Tipo Edm | Longitud o precisión | Editable | Nota |
|---|---|---|---|---|
| `RequestType` | `Edm.String` | 2 | No | Clave. Texto en `RequestTypeText` |
| `RequestTypeText` | `Edm.String` | 40 | No | Texto del tipo |
| `Criticality` | `Edm.Byte` | | No | Criticidad (apartado 8) |
| `SortOrder` | `Edm.Byte` | | No | Orden de presentación |

### 2.11 RequestStat (conjunto `RequestStats`, tipo `RequestStatsType`)

Recuento de avisos activos. Solo lectura. Sin navegaciones.

| Propiedad | Tipo Edm | Longitud o precisión | Editable | Nota |
|---|---|---|---|---|
| `Plant` | `Edm.String` | 4 | No | Clave. Código de planta |
| `Status` | `Edm.String` | 2 | No | Clave. Código de estado |
| `Priority` | `Edm.String` | 1 | No | Clave. Código de prioridad |
| `RequestCount` | `Edm.Int32` | | No | Número de avisos de esa combinación |

El conjunto devuelve una fila por combinación de planta, estado y prioridad. Los totales por estado, por prioridad o por planta se suman en la aplicación. La suma de `RequestCount` de todas las filas es 60, igual que `Requests/$count`. La entidad contiene solo códigos: los textos se obtienen de `Statuses`, `Priorities` y `Plants`.

## 3. Formato de las claves

| Conjunto | Formato | Ejemplo |
|---|---|---|
| `Requests` | `Requests(RequestUUID=<uuid>,IsActiveEntity=<true o false>)` | Ver los ejemplos de URL |
| `Tasks` | `Tasks(TaskUUID=<uuid>,IsActiveEntity=<true o false>)` | |
| `Parts` | `Parts(PartUUID=<uuid>,IsActiveEntity=<true o false>)` | |
| `Attachments` | `Attachments(AttachmentUUID=<uuid>,IsActiveEntity=<true o false>)` | |
| `Plants` | `Plants('<planta>')` | `Plants('2410')` |
| `Equipments` | `Equipments('<equipo>')` | `Equipments('224100001')` |
| `Products` | `Products('<material>')` | `Products('SP001')` |
| `Statuses` | `Statuses('<estado>')` | `Statuses('NW')` |
| `Priorities` | `Priorities('<prioridad>')` | `Priorities('1')` |
| `RequestTypes` | `RequestTypes('<tipo>')` | `RequestTypes('CO')` |
| `RequestStats` | `RequestStats(Plant='<planta>',Status='<estado>',Priority='<prioridad>')` | `RequestStats(Plant='2410',Status='NW',Priority='1')` |

Los valores `Edm.Guid` se escriben sin comillas. Los valores `Edm.Boolean` se escriben `true` o `false`, sin comillas.

Ejemplo de URL de una entidad activa (aviso `10000001` de los datos simulados):

```text
/sap/opu/odata4/sap/zui_mnt_request_o4/srvd/sap/zui_mnt_request/0001/Requests(RequestUUID=bc24114a-d99a-1fd1-b9ab-01c15b754b65,IsActiveEntity=true)
```

Ejemplo de URL del borrador del mismo aviso:

```text
/sap/opu/odata4/sap/zui_mnt_request_o4/srvd/sap/zui_mnt_request/0001/Requests(RequestUUID=bc24114a-d99a-1fd1-b9ab-01c15b754b65,IsActiveEntity=false)
```

La entidad activa y su borrador comparten `RequestUUID`; solo cambia `IsActiveEntity`. Las entidades hijas se leen por su propio conjunto o por la navegación del aviso, por ejemplo `Requests(RequestUUID=<uuid>,IsActiveEntity=false)/_Task`.

## 4. Borrador

`Requests` es la raíz del borrador. `Tasks`, `Parts` y `Attachments` son nodos del borrador y se activan a través de `Requests`.

### 4.1 Propiedades y navegaciones

| Elemento | Tipo | Significado |
|---|---|---|
| `IsActiveEntity` | `Edm.Boolean`, parte de la clave | `true` en la entidad activa; `false` en el borrador |
| `HasActiveEntity` | `Edm.Boolean` | En un borrador, indica si existe la entidad activa correspondiente. Es `false` en el borrador de un aviso nuevo |
| `HasDraftEntity` | `Edm.Boolean` | En una entidad activa, indica si existe un borrador de ella |
| `DraftEntityCreationDateTime` | `Edm.DateTimeOffset` | Fecha de creación del borrador |
| `DraftEntityLastChangeDateTime` | `Edm.DateTimeOffset` | Fecha de la última modificación del borrador |
| `SiblingEntity` | Navegación al mismo tipo | Del borrador a su entidad activa y de la entidad activa a su borrador. Se usa en el filtro de la lista |
| `DraftAdministrativeData` | Navegación a `I_DraftAdministrativeDataType` | Datos administrativos del borrador |

Propiedades de `I_DraftAdministrativeDataType`: `DraftUUID`, `DraftEntityType`, `CreationDateTime`, `CreatedByUser`, `LastChangeDateTime`, `LastChangedByUser`, `DraftAccessType`, `ProcessingStartDateTime`, `InProcessByUser`, `DraftIsKeptByUser`, `EnqueueStartDateTime`, `DraftIsCreatedByMe`, `DraftIsLastChangedByMe`, `DraftIsProcessedByMe`, `CreatedByUserDescription`, `LastChangedByUserDescription` e `InProcessByUserDescription`.

Filtro de la lista, que devuelve los avisos activos y los borradores del usuario, sin duplicados (verificado: 60 resultados con los datos iniciales):

```text
$filter=IsActiveEntity eq false or SiblingEntity/IsActiveEntity eq null
```

### 4.2 Acciones del borrador

Todas están ligadas a `RequestsType` (parámetro de enlace `_it`) y se invocan con `POST` sobre la instancia, con el nombre completo de la acción.

| Acción | Nombre completo | Se invoca sobre | Parámetros | Resultado |
|---|---|---|---|---|
| `Edit` | `com.sap.gateway.srvd.zui_mnt_request.v0001.Edit` | Entidad activa | `PreserveChanges` (`Edm.Boolean`, no anulable) | `RequestsType`: el borrador |
| `Activate` | `com.sap.gateway.srvd.zui_mnt_request.v0001.Activate` | Borrador | Ninguno | `RequestsType`: la entidad activa. Código `201` |
| `Discard` | `com.sap.gateway.srvd.zui_mnt_request.v0001.Discard` | Borrador | Ninguno | Sin resultado. Código `204` |
| `Prepare` | `com.sap.gateway.srvd.zui_mnt_request.v0001.Prepare` | Borrador | Ninguno | Sin resultado |
| `Resume` | `com.sap.gateway.srvd.zui_mnt_request.v0001.Resume` | Borrador | Ninguno | Sin resultado |

Los metadatos declaran `Prepare`, `Edit`, `Discard` y `Activate` en la anotación `Common.DraftRoot` del conjunto `Requests`.

Ejemplos de invocación:

```text
POST Requests(RequestUUID=<uuid>,IsActiveEntity=true)/com.sap.gateway.srvd.zui_mnt_request.v0001.Edit
{"PreserveChanges":true}

POST Requests(RequestUUID=<uuid>,IsActiveEntity=false)/com.sap.gateway.srvd.zui_mnt_request.v0001.Activate
{}
```

### 4.3 Comportamiento verificado

| Operación | Resultado |
|---|---|
| `POST Requests` con los datos del aviso | `201`. El servicio crea directamente un borrador: `IsActiveEntity` es `false`, `Status` es `NW` y `CurrencyCode` es `EUR` |
| `POST .../_Task`, `POST .../_Part` y `POST .../_Attachment` sobre el borrador | `201` |
| `Activate` | `201` (no `200`). `IsActiveEntity` pasa a `true` y `RequestID` queda informado |
| `Activate` con una validación fallida | `400`, con el mensaje ligado al campo (apartado 10) |
| `Edit` sobre un aviso completado (`CO`) | `422`: la operación está deshabilitada (apartado 6) |
| `Discard` | `204` |
| `DELETE` sobre un borrador raíz | `422`: "Delete on draft root instance not allowed. Use discard." |
| `DELETE` sobre la entidad activa | `204` |
| `DELETE` sobre la entidad activa con un borrador abierto | `423` |

Las modificaciones del borrador se envían con `PATCH` sobre la instancia con `IsActiveEntity=false`. `Prepare` ejecuta las validaciones del aviso y la de cantidad de los repuestos sin activar el borrador.

Validaciones que se ejecutan al activar:

| Validación | Campo | Mensaje |
|---|---|---|
| Campos obligatorios | `Title` | "El título es obligatorio" |
| Campos obligatorios | `RequestType` | "El tipo de aviso es obligatorio" |
| Campos obligatorios | `Priority` | "La prioridad es obligatoria" |
| Campos obligatorios | `Plant` | "La planta es obligatoria" |
| Campos obligatorios | `Equipment` | "El equipo es obligatorio" |
| El equipo pertenece a la planta | `Equipment` | "El equipo no pertenece a la planta 2410" (con la planta del aviso) |
| Fecha límite | `RequiredEndDate` | "La fecha límite no puede ser anterior a la fecha de creación" |
| Cantidad del repuesto | `Quantity` de `Parts` | "La cantidad debe ser mayor que cero" |

## 5. Acciones de negocio

Están ligadas a `RequestsType` (parámetro de enlace `_it`) y se invocan con `POST` sobre la entidad activa, con el nombre completo y la cabecera `If-Match`. Todas devuelven la entidad actualizada (`RequestsType`) con el código `200`.

| Acción | Nombre completo | Parámetros | Habilitada en | Efecto |
|---|---|---|---|---|
| `assign` | `com.sap.gateway.srvd.zui_mnt_request.v0001.assign` | `AssignedTo` (`Edm.String`, 40, obligatorio) | `NW`, `AS` | `Status` pasa a `AS`; `AssignedTo` toma el valor del parámetro |
| `startWork` | `com.sap.gateway.srvd.zui_mnt_request.v0001.startWork` | Ninguno | `AS` | `Status` pasa a `IP`; se informa `StartedAt` |
| `complete` | `com.sap.gateway.srvd.zui_mnt_request.v0001.complete` | `ResolutionText` (`Edm.String`, 1000, obligatorio) y `DowntimeHours` (`Edm.Decimal`, precisión 6, escala 1) | `IP` | `Status` pasa a `CO`; se informan `CompletedAt`, `ResolutionText` y `DowntimeHours` |
| `reject` | `com.sap.gateway.srvd.zui_mnt_request.v0001.reject` | `RejectionReason` (`Edm.String`, 255, obligatorio) | `NW`, `AS` | `Status` pasa a `RJ`; se informa `RejectionReason` |

Los cuatro parámetros son no anulables en los metadatos. Si un parámetro obligatorio llega vacío, el servicio rechaza la acción con un mensaje: "Indique el técnico al que se asigna el aviso", "Indique la resolución del aviso" o "Indique el motivo del rechazo".

Ejemplos de invocación verificados:

```text
POST Requests(RequestUUID=<uuid>,IsActiveEntity=true)/com.sap.gateway.srvd.zui_mnt_request.v0001.assign
{"AssignedTo":"Técnico de prueba"}

POST Requests(RequestUUID=<uuid>,IsActiveEntity=true)/com.sap.gateway.srvd.zui_mnt_request.v0001.startWork
{}

POST Requests(RequestUUID=<uuid>,IsActiveEntity=true)/com.sap.gateway.srvd.zui_mnt_request.v0001.complete
{"ResolutionText":"Junta sustituida","DowntimeHours":1.5}
```

Una acción invocada en un estado en el que no está habilitada devuelve `422` (apartado 10).

## 6. Control dinámico

El servicio publica en cada entidad qué operaciones están disponibles para esa instancia. La aplicación liga a estas propiedades la habilitación de sus botones y no replica las reglas de estado.

### 6.1 `__OperationControl`

Propiedad de `RequestsType`, de tipo complejo `RequestsOperationControl`. Contiene un booleano por acción:

| Propiedad | Tipo | `true` cuando |
|---|---|---|
| `assign` | `Edm.Boolean` | El estado es `NW` o `AS` |
| `startWork` | `Edm.Boolean` | El estado es `AS` |
| `complete` | `Edm.Boolean` | El estado es `IP` |
| `reject` | `Edm.Boolean` | El estado es `NW` o `AS` |
| `Edit` | `Edm.Boolean` | El estado es `NW`, `AS` o `IP` |

Los metadatos enlazan cada acción con su propiedad mediante la anotación `Core.OperationAvailable`, con la ruta `_it/__OperationControl/<acción>`.

### 6.2 `__EntityControl`

Propiedad de `RequestsType`, `TasksType`, `PartsType` y `AttachmentsType`, de tipo complejo `EntityControl`:

| Propiedad | Tipo | Significado en `Requests` |
|---|---|---|
| `Updatable` | `Edm.Boolean` | La instancia se puede modificar: estados `NW`, `AS` e `IP` |
| `Deletable` | `Edm.Boolean` | La instancia se puede borrar: solo en estado `NW` y por el usuario que la creó |

Los metadatos enlazan estas propiedades con las restricciones de modificación y de borrado de cada conjunto (`Capabilities.UpdateRestrictions` y `Capabilities.DeleteRestrictions`).

### 6.3 `__CreateByAssociationControl`

Propiedad de `RequestsType`, de tipo complejo `RequestsCbAControl`. Indica si se pueden crear entidades hijas por cada navegación:

| Propiedad | Tipo | `true` cuando |
|---|---|---|
| `_Task` | `Edm.Boolean` | El estado es `NW`, `AS` o `IP` |
| `_Part` | `Edm.Boolean` | El estado es `NW`, `AS` o `IP` |
| `_Attachment` | `Edm.Boolean` | El estado es `NW`, `AS` o `IP` |

### 6.4 Lectura y restricciones

Las propiedades de control se piden con `$select`, por ejemplo `$select=Status,__OperationControl,__EntityControl`. No admiten filtro ni ordenación.

Valores verificados en un aviso recién activado (estado `NW`): `assign` y `reject` habilitadas; `startWork` y `complete` deshabilitadas.

Los 60 avisos iniciales los creó un usuario técnico: para el resto de usuarios su `Deletable` es `false`. Un aviso creado desde la aplicación lo puede borrar su creador mientras esté en estado `NW`.

## 7. Adjuntos

### 7.1 Propiedad de flujo

El contenido binario es la propiedad `Attachment` (`Edm.Stream`) de `AttachmentsType`. Los metadatos indican que su tipo de contenido está en `MimeType` (anotación `Core.MediaType`) y su nombre de fichero en `FileName` (anotación `Core.ContentDisposition`).

URL del contenido:

```text
Attachments(AttachmentUUID=<uuid>,IsActiveEntity=<true o false>)/Attachment
```

### 7.2 Secuencia de creación y subida

La subida son dos llamadas, en este orden, sobre el borrador del aviso:

1. Crear la entidad `Attachment` por la navegación del aviso:

   ```text
   POST Requests(RequestUUID=<uuid>,IsActiveEntity=false)/_Attachment
   {"FileName":"pixel.png","MimeType":"image/png","AttComment":"Prueba"}
   ```

   Respuesta `201`, con el `AttachmentUUID` asignado.

2. Enviar el contenido con `PUT` a la propiedad de flujo de la entidad creada:

   ```text
   PUT Attachments(AttachmentUUID=<uuid>,IsActiveEntity=false)/Attachment
   ```

   Respuesta `204`.

Tras activar el aviso, el adjunto se lee con `IsActiveEntity=true`.

### 7.3 Cabeceras del `PUT`

| Cabecera | Valor | Efecto |
|---|---|---|
| `X-CSRF-Token` | Token CSRF de la sesión | Necesario, como en cualquier petición de modificación |
| `If-Match` | ETag del adjunto | Obligatoria: sin ella, el servicio responde `428`. Se admite el ETag del contexto del adjunto y también `*`. Con un ETag antiguo, `412` |
| `Content-Type` | Tipo del fichero, por ejemplo `image/png` | El servicio fija `MimeType` con este valor |
| `Content-Disposition` | `attachment; filename="<nombre>"` | El servicio fija `FileName` con ese nombre. Sin esta cabecera, `FileName` queda vacío aunque se hubiera informado al crear la entidad |

La cabecera `Slug` se ignora.

### 7.4 Lectura y borrado

| Operación | Resultado |
|---|---|
| `GET .../Attachment` | `200`. Devuelve el contenido con su `Content-Type` y con `Content-Disposition: inline; filename="<FileName>"` |
| Lectura de la entidad | La entidad lleva la anotación de instancia `Attachment@odata.mediaContentType` |
| `DELETE .../Attachment` | `204`. Vacía el contenido, `MimeType` y `FileName` sin borrar la entidad |

El adjunto completo se borra con `DELETE` sobre la entidad `Attachments(...)`, cuando `__EntityControl/Deletable` lo permite.

Se ha verificado la subida y la lectura idéntica de un fichero de 3 MB.

## 8. Códigos

Escala de criticidad que usa el servicio: `0` neutro, `1` negativo, `2` crítico, `3` positivo, `5` información.

### 8.1 Estados (`Statuses`)

| `Status` | `StatusText` | `Criticality` | `SortOrder` |
|---|---|---|---|
| `NW` | Nuevo | 0 | 1 |
| `AS` | Asignado | 5 | 2 |
| `IP` | En curso | 2 | 3 |
| `CO` | Completado | 3 | 4 |
| `RJ` | Rechazado | 1 | 5 |

### 8.2 Prioridades (`Priorities`)

| `Priority` | `PriorityText` | `Criticality` | `SortOrder` |
|---|---|---|---|
| `1` | Muy alta | 1 | 1 |
| `2` | Alta | 2 | 2 |
| `3` | Media | 0 | 3 |
| `4` | Baja | 0 | 4 |

### 8.3 Tipos de aviso (`RequestTypes`)

| `RequestType` | `RequestTypeText` | `Criticality` | `SortOrder` |
|---|---|---|---|
| `CO` | Correctivo | 0 | 1 |
| `PR` | Preventivo | 0 | 2 |
| `IN` | Inspección | 0 | 3 |
| `ME` | Mejora | 0 | 4 |

En `Requests`, la criticidad llega ya resuelta en `StatusCriticality` y `PriorityCriticality`, y los textos en `StatusText`, `PriorityText` y `RequestTypeText`.

## 9. Búsqueda, filtros y recuento

### 9.1 Búsqueda

| Conjunto | `$search` | Campos en los que busca |
|---|---|---|
| `Requests` | Sí | `RequestID` (coincidencia exacta) y `Title` (búsqueda difusa: sin tildes y sin distinguir mayúsculas) |
| `Plants` | Sí | `Plant` (coincidencia exacta) y `PlantName` (búsqueda difusa) |
| `Equipments` | Sí | `Equipment` (coincidencia exacta) y el nombre, en el idioma de la sesión y en inglés (búsqueda difusa) |
| `Products` | Sí | `Product` (coincidencia exacta) y el nombre, en el idioma de la sesión y en inglés (búsqueda difusa) |
| Resto | No | |

`$search=bomba` sobre `Requests` devuelve 5 avisos con los datos iniciales. Las expresiones de búsqueda no admiten `AND`, `NOT` ni agrupación con paréntesis.

### 9.2 Filtros y ordenación

- Operadores y funciones admitidos en `$filter`: `eq`, `ne`, `gt`, `ge`, `lt`, `le`, `and`, `or`, `contains`, `startswith`, `endswith`, `any` y `all`.
- En `Requests`, `Description` y `ResolutionText` no admiten ordenación y en `$filter` solo admiten expresiones de búsqueda.
- Las propiedades de control (`__EntityControl`, `__OperationControl` y `__CreateByAssociationControl`) no admiten filtro ni ordenación.
- `DraftEntityCreationDateTime` y `DraftEntityLastChangeDateTime` solo admiten un intervalo como filtro.

Ejemplos verificados:

| Consulta | Resultado |
|---|---|
| `Equipments?$filter=Plant eq '2410'&$count=true` | 93 equipos |
| `Requests?$filter=IsActiveEntity eq false or SiblingEntity/IsActiveEntity eq null&$count=true` | 60 avisos |
| `Requests?$top=3&$select=RequestID,Title,StatusText,PriorityText,PlantName,EquipmentName,EstimatedCost&$orderby=RequestID` | Tres avisos con todos los textos informados |

### 9.3 Recuento

| Consulta | Resultado con los datos iniciales |
|---|---|
| `Requests/$count` | 60 |
| `Requests?$count=true` | Recuento en la propiedad `@odata.count` de la respuesta, calculado con los filtros y la búsqueda aplicados |
| `Plants?$count=true` | 23 |
| `Attachments/$count` | 10 |

## 10. Errores y mensajes

### 10.1 Códigos HTTP observados

| Código | Situación |
|---|---|
| `200` | Lectura correcta. Acciones de negocio `assign`, `startWork`, `complete` y `reject` |
| `201` | Creación del borrador, creación de operaciones, repuestos y adjuntos, y acción `Activate` |
| `204` | `PUT` del contenido del adjunto, acción `Discard`, `DELETE` de la entidad activa y `DELETE` del contenido del adjunto |
| `400` | Validación fallida al activar. Código de error `SABP_BEHV/100`, texto en `error.message` y campo afectado en `error.target`, por ejemplo `$Parameter/_it/Equipment` |
| `412` | `PUT` del contenido con un ETag antiguo en `If-Match` |
| `422` | Operación deshabilitada por el control dinámico: código de error `RAP_RUNTIME/025`, "Operation is not enabled". También `DELETE` sobre un borrador raíz |
| `423` | `DELETE` de la entidad activa con un borrador abierto |
| `428` | `PUT` del contenido sin la cabecera `If-Match` |

### 10.2 Mensajes ligados a la entidad

`RequestsType`, `TasksType`, `PartsType` y `AttachmentsType` tienen la propiedad `SAP__Messages`, que los metadatos declaran como origen de los mensajes de la entidad (anotación `Common.Messages`). Es una colección del tipo complejo `SAP__Message`:

| Propiedad | Tipo | Nota |
|---|---|---|
| `code` | `Edm.String` | Código del mensaje |
| `message` | `Edm.String` | Texto |
| `target` | `Edm.String` | Anulable. Ruta de la propiedad afectada |
| `additionalTargets` | `Collection(Edm.String)` | Otras propiedades afectadas |
| `transition` | `Edm.Boolean` | Indica si el mensaje es transitorio |
| `numericSeverity` | `Edm.Byte` | Gravedad |
| `longtextUrl` | `Edm.String` | Anulable. URL del texto largo |

Los mensajes de validación están en español y van ligados al campo que los origina (apartado 4.3).

### 10.3 Concurrencia

`Requests`, `Tasks`, `Parts` y `Attachments` usan `LocalLastChangedAt` como ETag (anotación `Core.OptimisticConcurrency`). En las pruebas, las modificaciones, los borrados y las acciones se enviaron con la cabecera `If-Match`; en la subida del contenido de un adjunto la cabecera es obligatoria (apartado 7.3).

## 11. Efectos laterales

Los metadatos contienen siete anotaciones `Common.SideEffects`. Indican qué datos debe pedir de nuevo la aplicación después de un cambio.

| Destino de la anotación | Calificador | Origen | Datos afectados |
|---|---|---|---|
| `RequestsType` | `SAP__Field_Plant` | Propiedad `Plant` | Propiedad `Equipment` |
| `PartsType` | `SAP__Field_Quantity` | Propiedad `Quantity` | `_Request/EstimatedCost` |
| `PartsType` | `SAP__Field_UnitPrice` | Propiedad `UnitPrice` | `_Request/EstimatedCost` |
| Acción `assign` | `SAP__Action_assign` | La acción | La entidad sobre la que se invoca |
| Acción `startWork` | `SAP__Action_startWork` | La acción | La entidad sobre la que se invoca |
| Acción `complete` | `SAP__Action_complete` | La acción | La entidad sobre la que se invoca |
| Acción `reject` | `SAP__Action_reject` | La acción | La entidad sobre la que se invoca |

El servicio recalcula `EstimatedCost` al crear, modificar o borrar un repuesto. Verificado: 25 con un repuesto (2 por 12,50); 55 al añadir un segundo (3 por 10); 25 al borrar el segundo. Los metadatos solo declaran el efecto lateral para los cambios de `Quantity` y de `UnitPrice`: tras el alta o el borrado de un repuesto, la aplicación también debe pedir de nuevo `EstimatedCost`.

## 12. Ayudas de búsqueda

Los metadatos declaran las ayudas con la anotación `Common.ValueListReferences`, que remite a un documento de metadatos propio de cada ayuda. La definición de la lista de valores no está incluida en `metadata.xml`.

| Propiedad | Referencia | Conjunto equivalente del servicio | Nota |
|---|---|---|---|
| `RequestsType/RequestType` | `zi_mnt_typevh` | `RequestTypes` | Lleva también `Common.ValueListWithFixedValues` |
| `RequestsType/Priority` | `zi_mnt_priorityvh` | `Priorities` | Lleva también `Common.ValueListWithFixedValues` |
| `RequestsType/Plant` | `zi_mnt_plantvh` | `Plants` | |
| `RequestsType/Equipment` | `zi_mnt_equipmentvh` | `Equipments` | La definición del servicio declara la dependencia con la planta: la ayuda del equipo se filtra por `Plant` |
| `PartsType/Product` | `zi_mnt_productvh` | `Products` | |

Los conjuntos `Plants`, `Equipments`, `Products`, `Statuses`, `Priorities` y `RequestTypes` del propio servicio contienen los mismos datos y se pueden consultar directamente con `$filter` y, en los tres primeros, con `$search`.
