import js from '@eslint/js';
import globals from 'globals';
export default [
  {ignores:['node_modules/**','dist/**','vendor/**','data/**']},
  js.configs.recommended,
  {files:['**/*.js','**/*.mjs'],languageOptions:{ecmaVersion:'latest',sourceType:'module',globals:{...globals.node,...globals.browser}},rules:{'no-unused-vars':['error',{argsIgnorePattern:'^_',varsIgnorePattern:'^_'}],'no-constant-condition':'error'}}
];
