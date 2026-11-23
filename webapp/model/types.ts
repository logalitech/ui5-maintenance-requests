/**
 * Entity types of the maintenance request service (OData V4, RAP with draft).
 * Source: webapp/localService/mainService/metadata.xml
 * Schema namespace: com.sap.gateway.srvd.zui_mnt_request.v0001
 *
 * Conventions:
 * - Edm.String, Edm.Guid, Edm.Date and Edm.DateTimeOffset are typed as string.
 * - Edm.Decimal, Edm.Int32 and Edm.Byte are typed as number.
 * - Edm.Boolean is typed as boolean.
 * - A property that is nullable in the metadata is typed as "T | null".
 * - Navigation properties are optional: they are only present when expanded.
 */

/** Complex type EntityControl (property __EntityControl). */
export interface EntityControl {
    Deletable: boolean;
    Updatable: boolean;
}

/** Complex type RequestsOperationControl (property __OperationControl): one flag per bound action. */
export interface RequestOperationControl {
    assign: boolean;
    complete: boolean;
    Edit: boolean;
    reject: boolean;
    startWork: boolean;
}

/** Complex type RequestsCbAControl (property __CreateByAssociationControl): creation of child entities. */
export interface RequestCreateByAssociationControl {
    _Attachment: boolean;
    _Part: boolean;
    _Task: boolean;
}

/** Complex type SAP__Message (property SAP__Messages). */
export interface SapMessage {
    code: string;
    message: string;
    target: string | null;
    additionalTargets: string[];
    transition: boolean;
    numericSeverity: number;
    longtextUrl: string | null;
}

/** Entity type I_DraftAdministrativeDataType (navigation DraftAdministrativeData). */
export interface DraftAdministrativeData {
    DraftUUID: string;
    DraftEntityType: string;
    CreationDateTime: string | null;
    CreatedByUser: string;
    LastChangeDateTime: string | null;
    LastChangedByUser: string;
    DraftAccessType: string;
    ProcessingStartDateTime: string | null;
    InProcessByUser: string;
    DraftIsKeptByUser: boolean;
    EnqueueStartDateTime: string | null;
    DraftIsCreatedByMe: boolean;
    DraftIsLastChangedByMe: boolean;
    DraftIsProcessedByMe: boolean;
    CreatedByUserDescription: string;
    LastChangedByUserDescription: string;
    InProcessByUserDescription: string;
}

/** Entity set Requests (RequestsType). Key: RequestUUID, IsActiveEntity. */
export interface Request {
    RequestUUID: string;
    RequestID: string;
    Title: string;
    Description: string;
    RequestType: string;
    RequestTypeText: string;
    Priority: string;
    PriorityText: string;
    PriorityCriticality: number;
    Status: string;
    StatusText: string;
    StatusCriticality: number;
    Plant: string;
    PlantName: string;
    Equipment: string;
    EquipmentName: string;
    FunctionalLocation: string;
    ReportedBy: string;
    AssignedTo: string;
    /** Edm.Date */
    RequiredEndDate: string | null;
    StartedAt: string | null;
    CompletedAt: string | null;
    DowntimeHours: number;
    ResolutionText: string;
    RejectionReason: string;
    /** Amount in CurrencyCode */
    EstimatedCost: number;
    CurrencyCode: string;
    LocalCreatedBy: string;
    LocalCreatedAt: string | null;
    LocalLastChangedBy: string;
    /** ETag of the entity */
    LocalLastChangedAt: string | null;
    LastChangedAt: string | null;
    // Draft properties
    HasDraftEntity: boolean;
    DraftEntityCreationDateTime: string | null;
    DraftEntityLastChangeDateTime: string | null;
    HasActiveEntity: boolean;
    IsActiveEntity: boolean;
    // Dynamic control and messages
    __CreateByAssociationControl: RequestCreateByAssociationControl | null;
    __EntityControl: EntityControl | null;
    __OperationControl: RequestOperationControl | null;
    SAP__Messages: SapMessage[];
    // Navigation properties
    DraftAdministrativeData?: DraftAdministrativeData | null;
    SiblingEntity?: Request | null;
    _Attachment?: Attachment[];
    _Equipment?: Equipment | null;
    _Part?: Part[];
    _Plant?: Plant | null;
    _Priority?: Priority | null;
    _Status?: Status | null;
    _Task?: Task[];
    _Type?: RequestType | null;
}

/** Entity set Tasks (TasksType). Key: TaskUUID, IsActiveEntity. */
export interface Task {
    TaskUUID: string;
    RequestUUID: string;
    TaskNumber: string;
    Description: string;
    PlannedHours: number;
    ActualHours: number;
    IsCompleted: boolean;
    /** ETag of the entity */
    LocalLastChangedAt: string | null;
    // Draft properties
    HasDraftEntity: boolean;
    DraftEntityCreationDateTime: string | null;
    DraftEntityLastChangeDateTime: string | null;
    HasActiveEntity: boolean;
    IsActiveEntity: boolean;
    // Dynamic control and messages
    __EntityControl: EntityControl | null;
    SAP__Messages: SapMessage[];
    // Navigation properties
    DraftAdministrativeData?: DraftAdministrativeData | null;
    SiblingEntity?: Task | null;
    _Request?: Request;
}

/** Entity set Parts (PartsType). Key: PartUUID, IsActiveEntity. */
export interface Part {
    PartUUID: string;
    RequestUUID: string;
    Product: string;
    ProductName: string;
    /** Quantity in QuantityUnit */
    Quantity: number;
    QuantityUnit: string;
    /** Amount in CurrencyCode */
    UnitPrice: number;
    CurrencyCode: string;
    /** ETag of the entity */
    LocalLastChangedAt: string | null;
    // Draft properties
    HasDraftEntity: boolean;
    DraftEntityCreationDateTime: string | null;
    DraftEntityLastChangeDateTime: string | null;
    HasActiveEntity: boolean;
    IsActiveEntity: boolean;
    // Dynamic control and messages
    __EntityControl: EntityControl | null;
    SAP__Messages: SapMessage[];
    // Navigation properties
    DraftAdministrativeData?: DraftAdministrativeData | null;
    SiblingEntity?: Part | null;
    _Product?: Product | null;
    _Request?: Request;
}

/** Entity set Attachments (AttachmentsType). Key: AttachmentUUID, IsActiveEntity. */
export interface Attachment {
    AttachmentUUID: string;
    RequestUUID: string;
    FileName: string;
    /** Media type of the stream property */
    MimeType: string;
    /** Edm.Stream: the binary content is read and written through its own URL, not in the entity payload */
    Attachment: string | null;
    AttComment: string;
    LocalCreatedBy: string;
    LocalCreatedAt: string | null;
    /** ETag of the entity */
    LocalLastChangedAt: string | null;
    // Draft properties
    HasDraftEntity: boolean;
    DraftEntityCreationDateTime: string | null;
    DraftEntityLastChangeDateTime: string | null;
    HasActiveEntity: boolean;
    IsActiveEntity: boolean;
    // Dynamic control and messages
    __EntityControl: EntityControl | null;
    SAP__Messages: SapMessage[];
    // Navigation properties
    DraftAdministrativeData?: DraftAdministrativeData | null;
    SiblingEntity?: Attachment | null;
    _Request?: Request;
}

/** Entity set Plants (PlantsType). Key: Plant. */
export interface Plant {
    Plant: string;
    PlantName: string;
    EquipmentCount: number;
}

/** Entity set Equipments (EquipmentsType). Key: Equipment. */
export interface Equipment {
    Equipment: string;
    EquipmentName: string;
    Plant: string;
    FunctionalLocation: string;
    TechnicalObjectType: string;
    /** Search columns: name in the session language (may be empty) and in English. */
    EquipmentNameInLanguage: string;
    EquipmentNameInEnglish: string;
}

/** Entity set Products (ProductsType). Key: Product. */
export interface Product {
    Product: string;
    ProductName: string;
    ProductType: string;
    /** Internal unit code, for example ST. */
    BaseUnit: string;
    /** Search columns: name in the session language (may be empty) and in English. */
    ProductNameInLanguage: string;
    ProductNameInEnglish: string;
}

/** Entity set Statuses (StatusesType). Key: Status. */
export interface Status {
    Status: string;
    StatusText: string;
    Criticality: number;
    SortOrder: number;
}

/** Entity set Priorities (PrioritiesType). Key: Priority. */
export interface Priority {
    Priority: string;
    PriorityText: string;
    Criticality: number;
    SortOrder: number;
}

/** Entity set RequestTypes (RequestTypesType). Key: RequestType. */
export interface RequestType {
    RequestType: string;
    RequestTypeText: string;
    Criticality: number;
    SortOrder: number;
}

/** Entity set RequestStats (RequestStatsType). Key: Plant, Status, Priority. */
export interface RequestStat {
    Plant: string;
    Status: string;
    Priority: string;
    RequestCount: number;
}
