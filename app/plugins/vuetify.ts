import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

export default defineNuxtPlugin((nuxtApp) => {
  const vuetify = createVuetify({
    components,
    directives,
    theme: {
      defaultTheme: 'light',
      themes: {
        light: {
          colors: {
            primary: '#667eea',
            secondary: '#764ba2',
            accent: '#82B1FF',
            error: '#FF5252',
            warning: '#FFC107',
            info: '#2196F3',
            success: '#4CAF50',
          },
        },
      },
    },
  })

  nuxtApp.vueApp.use(vuetify)
})
