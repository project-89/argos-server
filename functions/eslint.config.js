const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2018,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // Google style guide rules that we want to keep
      indent: ["error", 2],
      "linebreak-style": ["error", "unix"],
      quotes: ["error", "double", { allowTemplateLiterals: true }],
      semi: ["error", "always"],
      "no-unused-vars": ["warn"],
      "no-console": ["off"],
      "no-restricted-globals": ["error", "name", "length"],
      "prefer-arrow-callback": "error",
      "max-len": ["error", { code: 100 }],
      camelcase: ["error"],
      "comma-dangle": ["error", "always-multiline"],
      curly: ["error"],
      "no-trailing-spaces": ["error"],
    },
  },
  {
    files: ["**/*.spec.*"],
    languageOptions: {
      globals: {
        ...globals.mocha,
      },
    },
  },
];
