import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  base: "/",
  build: {
    target: "es2020",
    minify: "esbuild",
    sourcemap: false,
    outDir: "dist",
    assetsDir: "assets",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          router: ["react-router-dom"],
          ui: [
            "@radix-ui/react-dialog",
            "@radix-ui/react-toast",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs"
          ],
          supabase: ["@supabase/supabase-js", "@supabase/auth-ui-react"],
          utils: ["date-fns", "clsx", "tailwind-merge"]
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
    open: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@tanstack/react-query",
      "@supabase/supabase-js",
      "sonner",
      "lucide-react",
      "date-fns"
    ],
  },
  define: {
    "process.env": process.env,
  },
});