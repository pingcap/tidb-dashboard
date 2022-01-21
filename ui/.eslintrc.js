module.exports = {
  extends: ['react-app'],
  ignorePatterns: ['lib/client/api/*.ts'],
  rules: {
    'react/react-in-jsx-scope': 'error',
    'jsx-a11y/anchor-is-valid': 'off',
  },
}
