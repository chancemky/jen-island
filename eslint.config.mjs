import globals from "globals";
export default [{ files: ["**/*.js"], languageOptions: { ecmaVersion: 2024, sourceType: "module", globals: { ...globals.browser, Capacitor: "readonly" } }, rules: { "no-undef": "error" } }];
