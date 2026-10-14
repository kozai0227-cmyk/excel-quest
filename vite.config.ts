import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { webPages } from './scripts/webPages'

export default defineConfig({
  // webPages：Web 版に 関数の 解説ページと サイトマップを 足す（アプリ版では 作らない）
  plugins: [react(), webPages()],
})
