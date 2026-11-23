// Mock logic of the Requests entity set for the SAP Fiori tools mock server.
// It reproduces what the RAP service does on its own: default values, texts,
// dynamic control, the validation of the equipment and the business actions.

const MOCK_USER = "MOCK_USER";

function controlOf(request) {
	const status = request.Status;
	const open = status === "NW" || status === "AS" || status === "IP";
	return {
		__OperationControl: {
			assign: status === "NW" || status === "AS",
			startWork: status === "AS",
			complete: status === "IP",
			reject: status === "NW" || status === "AS",
			Edit: open
		},
		__EntityControl: {
			Deletable: status === "NW" && request.LocalCreatedBy === MOCK_USER,
			Updatable: open
		},
		__CreateByAssociationControl: { _Attachment: open, _Part: open, _Task: open }
	};
}

async function rowsOf(contributor, entitySet, odataRequest) {
	const entityInterface = await contributor.base.getEntityInterface(entitySet);
	return entityInterface ? entityInterface.getAllEntries(odataRequest) : [];
}

// Texts and criticality that the service reads through associations
async function deriveTexts(contributor, request, odataRequest) {
	const [statuses, priorities, types, plants, equipments] = await Promise.all(
		["Statuses", "Priorities", "RequestTypes", "Plants", "Equipments"].map((name) => rowsOf(contributor, name, odataRequest))
	);
	const status = statuses.find((row) => row.Status === request.Status);
	const priority = priorities.find((row) => row.Priority === request.Priority);
	const type = types.find((row) => row.RequestType === request.RequestType);
	const plant = plants.find((row) => row.Plant === request.Plant);
	const equipment = equipments.find((row) => row.Equipment === request.Equipment);
	request.StatusText = status ? status.StatusText : "";
	request.StatusCriticality = status ? status.Criticality : 0;
	request.PriorityText = priority ? priority.PriorityText : "";
	request.PriorityCriticality = priority ? priority.Criticality : 0;
	request.RequestTypeText = type ? type.RequestTypeText : "";
	request.PlantName = plant ? plant.PlantName : "";
	request.EquipmentName = equipment ? equipment.EquipmentName : "";
	request.FunctionalLocation = equipment ? equipment.FunctionalLocation : "";
	return equipment;
}

module.exports = {
	// Default values of a new request, like the determination of the service
	async onBeforeAddEntry(keys, data, odataRequest) {
		if (!data.Status) {
			const now = new Date().toISOString();
			Object.assign(data, {
				Status: "NW",
				Priority: data.Priority || "3",
				CurrencyCode: data.CurrencyCode || "EUR",
				EstimatedCost: data.EstimatedCost || 0,
				ReportedBy: MOCK_USER,
				LocalCreatedBy: MOCK_USER,
				LocalCreatedAt: now,
				LocalLastChangedBy: MOCK_USER,
				LocalLastChangedAt: now,
				LastChangedAt: now
			});
		}
		await deriveTexts(this, data, odataRequest);
	},

	async onBeforeUpdateEntry(keys, data, odataRequest) {
		await deriveTexts(this, data, odataRequest);
	},

	// Dynamic control depends on the status of each request
	async onAfterRead(data) {
		for (const request of Array.isArray(data) ? data : [data]) {
			if (request && request.Status !== undefined) {
				Object.assign(request, controlOf(request));
			}
		}
		return data;
	},

	// Validations of the service when the draft is activated
	async onBeforeAction(actionDefinition, actionData, keys, odataRequest) {
		if (actionDefinition.name === "Edit") {
			const [active] = await this.base.fetchEntries(keys, odataRequest);
			if (active && !controlOf(active).__OperationControl.Edit) {
				this.throwError("Operation is not enabled", 422, { error: { code: "RAP_RUNTIME/025", message: "Operation is not enabled" } });
			}
		}
		if (actionDefinition.name === "Activate") {
			const [request] = await this.base.fetchEntries(keys, odataRequest);
			const equipments = await rowsOf(this, "Equipments", odataRequest);
			const equipment = request && equipments.find((row) => row.Equipment === request.Equipment);
			const mandatory = [
				["Title", "El título es obligatorio"],
				["RequestType", "El tipo de aviso es obligatorio"],
				["Priority", "La prioridad es obligatoria"],
				["Plant", "La planta es obligatoria"],
				["Equipment", "El equipo es obligatorio"]
			];
			const errors = mandatory
				.filter(([property]) => request && !request[property])
				.map(([property, message]) => ({ code: "SABP_BEHV/100", message, target: `$Parameter/_it/${property}` }));
			if (request && request.Plant && request.Equipment && (!equipment || equipment.Plant !== request.Plant)) {
				errors.push({
					code: "SABP_BEHV/100",
					message: `El equipo no pertenece a la planta ${request.Plant}`,
					target: "$Parameter/_it/Equipment"
				});
			}
			if (errors.length > 0) {
				const [first, ...details] = errors;
				this.throwError(first.message, 400, { error: { ...first, details } });
			}
		}
		return actionData;
	},

	// Business actions: they only change the status and the fields of each transition
	async executeAction(actionDefinition, actionData, keys, odataRequest) {
		const [request] = await this.base.fetchEntries(keys, odataRequest);
		if (!request) {
			this.throwError("Aviso no encontrado", 404);
		}
		const control = controlOf(request).__OperationControl;
		if (control[actionDefinition.name] === false) {
			this.throwError("Operation is not enabled", 422, { error: { code: "RAP_RUNTIME/025", message: "Operation is not enabled" } });
		}
		const now = new Date().toISOString();
		const changes = {};
		switch (actionDefinition.name) {
			case "assign":
				if (!actionData.AssignedTo) {
					this.throwError("Indique el técnico al que se asigna el aviso", 400);
				}
				Object.assign(changes, { Status: "AS", AssignedTo: actionData.AssignedTo });
				break;
			case "startWork":
				Object.assign(changes, { Status: "IP", StartedAt: now });
				break;
			case "complete":
				if (!actionData.ResolutionText) {
					this.throwError("Indique la resolución del aviso", 400);
				}
				Object.assign(changes, {
					Status: "CO",
					CompletedAt: now,
					ResolutionText: actionData.ResolutionText,
					DowntimeHours: actionData.DowntimeHours || 0
				});
				break;
			case "reject":
				if (!actionData.RejectionReason) {
					this.throwError("Indique el motivo del rechazo", 400);
				}
				Object.assign(changes, { Status: "RJ", RejectionReason: actionData.RejectionReason });
				break;
			default:
				return undefined;
		}
		const updated = { ...request, ...changes, LocalLastChangedAt: now, LastChangedAt: now };
		await deriveTexts(this, updated, odataRequest);
		await this.base.updateEntry(keys, updated, odataRequest);
		return { ...updated, ...controlOf(updated) };
	},

	// The service assigns the request number when the draft is activated
	async onAfterAction(actionDefinition, actionData, keys, responseData, odataRequest) {
		if (actionDefinition.name === "Activate" && responseData && !responseData.RequestID) {
			const requests = await this.base.getAllEntries(odataRequest);
			const last = requests.reduce((max, row) => Math.max(max, Number(row.RequestID) || 0), 10000000);
			responseData.RequestID = String(last + 1);
			await this.base.updateEntry({ ...keys, IsActiveEntity: true }, responseData, odataRequest);
		}
		return responseData;
	}
};
