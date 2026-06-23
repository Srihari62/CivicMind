/**
 * @file prettier.config.mjs
 * @description Prettier code formatter configuration for the CivicMind platform.
 * Establishes consistent code formatting guidelines and integrates the Tailwind CSS v4 class sorting plugin.
 */

/** @type {import('prettier').Config} */
const config = {
  // Use semi-colons at the end of statements
  semi: true,
  // Use single quotes instead of double quotes
  singleQuote: true,
  // Indent with 2 spaces
  tabWidth: 2,
  // Ensure trailing commas are added wherever valid in ES5 (objects, arrays, etc.)
  trailingComma: 'es5',
  // Limit line width to 100 characters for improved readability
  printWidth: 100,
  // Automatically sort Tailwind CSS classes inside classNames
  plugins: ['prettier-plugin-tailwindcss'],
};

export default config;
