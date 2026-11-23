// Mock logic of the Parts entity set: the estimated cost of the request is the sum
// of quantity by unit price of its parts, and the product name comes from Products.

async function recalculate(contributor, part, odataRequest, removedPartUUID) {
	const requestInterface = await contributor.base.getEntityInterface("Requests");
	if (!requestInterface || !part) {
		return;
	}
	const parts = (await contributor.base.getAllEntries(odataRequest)).filter(
		(row) => row.RequestUUID === part.RequestUUID && row.IsActiveEntity === part.IsActiveEntity && row.PartUUID !== removedPartUUID
	);
	const total = parts.reduce((sum, row) => sum + (Number(row.Quantity) || 0) * (Number(row.UnitPrice) || 0), 0);
	const keys = { RequestUUID: part.RequestUUID, IsActiveEntity: part.IsActiveEntity };
	const [request] = await requestInterface.fetchEntries(keys, odataRequest);
	if (request) {
		await requestInterface.updateEntry(keys, { ...request, EstimatedCost: Math.round(total * 100) / 100 }, odataRequest);
	}
}

async function deriveProduct(contributor, part, odataRequest) {
	const productInterface = await contributor.base.getEntityInterface("Products");
	const products = productInterface ? await productInterface.getAllEntries(odataRequest) : [];
	const product = products.find((row) => row.Product === part.Product);
	part.ProductName = product ? product.ProductName : "";
}

module.exports = {
	async onBeforeAddEntry(keys, data, odataRequest) {
		data.CurrencyCode = data.CurrencyCode || "EUR";
		await deriveProduct(this, data, odataRequest);
	},
	async onBeforeUpdateEntry(keys, data, odataRequest) {
		await deriveProduct(this, data, odataRequest);
	},
	async onAfterAddEntry(keys, data, odataRequest) {
		await recalculate(this, data, odataRequest);
	},
	async onAfterUpdateEntry(keys, data, odataRequest) {
		await recalculate(this, data, odataRequest);
	},
	async removeEntry(keys, odataRequest) {
		const [part] = await this.base.fetchEntries(keys, odataRequest);
		await this.base.removeEntry(keys, odataRequest);
		await recalculate(this, part, odataRequest, part ? part.PartUUID : undefined);
	}
};
