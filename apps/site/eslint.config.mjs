// Next.js 16 removed `next lint` and mandates ESLint flat config.
// `eslint-config-next` 16 exports flat-config-compatible arrays directly,
// so we import them without the FlatCompat bridge — which crashes ESLint 9
// with "Converting circular structure to JSON" when it tries to validate
// legacy config objects containing plugin references.
import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
];

export default eslintConfig;
