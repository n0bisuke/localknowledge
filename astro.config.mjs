// @ts-check
import { defineConfig } from 'astro/config';

// GitHub Pages（https://n0bisuke.github.io/localknowledge/）で公開する前提の設定。
// 独自ドメインで公開する場合は site を変更し、base を削除する。
export default defineConfig({
  site: 'https://n0bisuke.github.io',
  base: '/localknowledge',
  trailingSlash: 'always',
});
