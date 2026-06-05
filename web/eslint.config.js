import antfu from '@antfu/eslint-config'

export default antfu({
  react: true,
  typescript: {
    overrides: {
      'eslint-comments/no-unlimited-disable': 'off',
    },
  },
  markdown: false,
})
