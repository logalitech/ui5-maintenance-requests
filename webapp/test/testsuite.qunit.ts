import type { SuiteConfiguration } from "sap/ui/test/starter/config";

const suite: SuiteConfiguration = {
	name: "QUnit test suite for sapui5.maintenance",
	defaults: {
		qunit: {
			version: 2
		},
		ui5: {
			theme: "sap_horizon"
		},
		loader: {
			paths: {
				// The test pages are two levels below webapp (test/unit/, test/integration/)
				"sapui5/maintenance": "../../"
			}
		}
	},
	tests: {
		"unit/unitTests": {
			title: "Unit tests for sapui5.maintenance"
		},
		"integration/opaTests": {
			title: "Integration tests for sapui5.maintenance"
		}
	}
};

export default suite;
