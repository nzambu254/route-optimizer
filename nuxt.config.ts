// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: true, // Set to false if you don't need server-side rendering

  nitro: {
    compatibilityDate: '2025-07-15'
  },

  modules: [
    '@nuxtjs/supabase',
    '@nuxt/ui'
  ],

  supabase: {
    redirect: false
  },

  runtimeConfig: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_KEY,
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.NUXT_PUBLIC_SUPABASE_KEY
    }
  },

  components: {
    global: true,
    dirs: ['~/components']
  },

  build: {
    transpile: ['leaflet']
  },

  vite: {
    optimizeDeps: {
      include: ['leaflet']
    }
  },

  devtools: { enabled: true },

  typescript: {
    tsConfig: {
      compilerOptions: {
        paths: {
          '~/*': ['./*'],
          '@/*': ['./*'],
          '#imports': ['./.nuxt/imports.d.ts']
        }
      }
    }
  }
})
