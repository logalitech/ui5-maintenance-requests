import fioriTools from '@sap-ux/eslint-plugin-fiori-tools';

export default [
    {
        // build output of npm run build and mock server data and logic (Node.js modules): not application source
        ignores: ['dist/**', 'webapp/localService/**']
    },
    ...fioriTools.configs.recommended,
    {
        // tsc already checks these names; no-undef does not see merged declarations such as $ProductRatingSettings
        files: ['webapp/**/*.ts'],
        ignores: ['**/*.d.ts'],
        rules: {
            'no-undef': 'off',
            // interfaces such as Request (model/types.ts) share their name with a browser global; tsc resolves them
            'no-redeclare': 'off'
        }
    }
];
