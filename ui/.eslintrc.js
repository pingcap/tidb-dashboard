module.exports = {
  extends: ['react-app', 'plugin:cypress/recommended'],
  ignorePatterns: ['lib/client/api/*.ts'],
  rules: {
    'react/react-in-jsx-scope': 'error',
    'jsx-a11y/anchor-is-valid': 'off',
    'jsx-a11y/alt-text': 'off',
    'import/no-anonymous-default-export': 'off',
    'react-hooks/exhaustive-deps': [
      'warn',
      {
        additionalHooks:
          '^use(Async|AsyncFn|AsyncRetry|UpdateEffect|IsomorphicLayoutEffect|DeepCompareEffect|ShallowCompareEffect)$',
      },
    ],
    'no-script-url': 'off',
  },
}
