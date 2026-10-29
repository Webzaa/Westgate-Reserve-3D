import path from "node:path";
import { defineConfig, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const isProduction = mode === "production";

  const config: UserConfig = {
    // Production:
    //
    // Development:
    // http://localhost:3000/
    base: "/Westagate3Dv31/",

    plugins: [
      react(),
      tailwindcss(),
    ],

    resolve: {
      alias: [
        {
          find: "@",
          replacement: path.resolve(__dirname, "./src"),
        },
        {
          find: /^lucide-react$/,
          replacement: path.resolve(
            __dirname,
            "./src/lib/lucide-react.tsx",
          ),
        },
        {
          find: "lucide-react-upstream",
          replacement: path.resolve(
            __dirname,
            "./node_modules/lucide-react",
          ),
        },
        {
          find: /^recharts$/,
          replacement: path.resolve(
            __dirname,
            "./src/lib/recharts.tsx",
          ),
        },
        {
          find: "recharts-upstream",
          replacement: path.resolve(
            __dirname,
            "./node_modules/recharts",
          ),
        },
      ],
    },

    optimizeDeps: {
      include: [
        "@base-ui/react/button",
        "@base-ui/react/checkbox",
        "@base-ui/react/dialog",
        "@base-ui/react/input",
        "@base-ui/react/menu",
        "@base-ui/react/merge-props",
        "@base-ui/react/popover",
        "@base-ui/react/select",
        "@base-ui/react/tabs",
        "@base-ui/react/use-render",
        "@tanstack/react-query",
        "class-variance-authority",
        "clsx",
        "date-fns",
        "@icons-pack/react-simple-icons",
        "lucide-react-upstream",
        "motion/react",
        "next-themes",
        "react",
        "react-day-picker",
        "react-dom/client",
        "react-is",
        "react-router-dom",
        "recharts-upstream",
        "sonner",
        "tailwind-merge",
      ],
    },

    server: {
      host: true,
      port: 3000,
      allowedHosts: true,
      cors: true,
      hmr: true,
      watch: {
        usePolling: true,
        interval: 300,
      },
      proxy: {
        "/api": {
          target: "http://localhost:8001",
          changeOrigin: true,
        },
      },
    },

    build: {
      target: "es2020",
      sourcemap: false,
      cssCodeSplit: true,
    },

    preview: {
      host: true,
      port: 4173,
    },
  };

  return config;
});
