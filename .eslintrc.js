module.exports = {
  extends: 'airbnb',
  installedESLint: true,
  plugins: [],
  globals: {},
  rules: {
    'arrow-body-style': ['error', 'always'],
    'brace-style': ['error', 'stroustrup'],
    'comma-dangle': ['error', {
      arrays: 'only-multiline',
      objects: 'only-multiline',
      imports: 'only-multiline',
      exports: 'only-multiline',
      functions: 'never',
    }],
    'no-param-reassign': ['error', {
      props: false,
    }],
    'no-underscore-dangle': ['error', {
      allow: ['__origin_encoding__'],
    }],
    'no-use-before-define': ['error', {
      functions: false,
    }],
    'prefer-const': ['off'],
    'space-before-function-paren': ['error', {
      anonymous: 'always',
      named: 'never',
      asyncArrow: 'ignore',
    }],
  },
};