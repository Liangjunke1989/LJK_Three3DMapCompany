import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import path from "path"

function resolve(url) {
  return path.resolve(__dirname, url)
}
// https://vitejs.dev/config/
export default defineConfig({
  assetsInclude: ["**/*.glb", "**/*.gltf", "**/*.fbx", "**/*.hdr", "**/*.json", "**/*.mp4", "**/*.mov"],
  resolve: {
    alias: {
      "@": resolve("./src"),
      "~@": resolve("./src"),
    },
    // 省略文件后缀
    extensions: [".mjs", ".js", ".jsx", ".json"],
  },

  plugins: [vue()],
})
