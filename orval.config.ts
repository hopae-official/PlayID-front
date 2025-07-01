import { defineConfig } from "orval";

export default defineConfig({
  hopae: {
    input: { target: "https://studio-hopae.doslash.io/api-json" },
    output: {
      target: "./src/queries/index.ts",
      schemas: "./src/queries/model",
      mock: false,
      override: {
        mutator: {
          path: "src/lib/axios.ts",
          name: "customInstance",
        },
      },
      clean: true,
    },
  },
});
