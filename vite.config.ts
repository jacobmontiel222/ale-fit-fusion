import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  // ⬇️ Cambia según tu caso:
  base: '/ale-fit-fusion/', // o '/' si es user/org pages
  plugins: [react()],
})