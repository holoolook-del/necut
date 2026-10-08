/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/necut/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      // manifest 아이콘을 프리캐시에 자동 추가하면 globPatterns 결과와 같은 URL이 다른 revision으로
      // 중복돼 workbox가 'add-to-cache-list-conflicting-entries'로 통째로 실패한다 → 끈다(아이콘은 glob이 담당)
      includeManifestIcons: false,
      manifest: {
        name: '민화네컷 — 내 사진이 민화가 되는 네컷',
        short_name: '민화네컷',
        description: '사진 4장을 민화풍으로 변환해 네컷 스트립으로',
        lang: 'ko',
        theme_color: '#f5eedd',
        background_color: '#f5eedd',
        display: 'standalone',
        start_url: '.',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'assets/icon.png', sizes: '1024x1024', type: 'image/png', purpose: 'any' },
          { src: 'assets/icon.png', sizes: '1024x1024', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2,json,wav}'],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
