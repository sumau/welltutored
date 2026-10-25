// Generates the React Query hooks in frontend/src/client/generated and the Zod
// schemas in backend/src/api/schemas/generated from backend/openapi.yaml. Why it
// lives here, and how to change the API, is in docs/api-contract.md.
import { defineConfig, InputTransformerFn } from "orval";
import path from "path";

const repositoryRoot = path.resolve(import.meta.dirname, "..", "..");
const spec = path.resolve(repositoryRoot, "backend", "openapi.yaml");
const apiClientReactSrc = path.resolve(repositoryRoot, "frontend", "src", "client");
const apiZodSrc = path.resolve(repositoryRoot, "backend", "src", "api", "schemas");

// Our exports make assumptions about the title of the API being "Api" (i.e. generated output is `api.ts`).
const titleTransformer: InputTransformerFn = (config) => {
  config.info.title = "Api";

  return config;
};

export default defineConfig({
  "api-client-react": {
    input: {
      target: spec,
      override: {
        transformer: titleTransformer,
      },
    },
    output: {
      // Orval's word for the folder the output goes in, not the Workspace in
      // GLOSSARY.md. The output itself is `target` inside it.
      workspace: apiClientReactSrc,
      target: "generated",
      client: "react-query",
      mode: "split",
      baseUrl: "/api",
      clean: true,
      override: {
        query: {
          version: 5,
        },
        fetch: {
          includeHttpResponseReturnType: false,
        },
        mutator: {
          path: path.resolve(apiClientReactSrc, "custom-fetch.ts"),
          name: "customFetch",
        },
      },
    },
  },
  zod: {
    input: {
      target: spec,
      override: {
        transformer: titleTransformer,
      },
    },
    output: {
      workspace: apiZodSrc,
      client: "zod",
      target: "generated",
      schemas: { path: "generated/types", type: "typescript" },
      mode: "split",
      clean: true,
      override: {
        zod: {
          coerce: {
            query: ['boolean', 'number', 'string'],
            param: ['boolean', 'number', 'string'],
            body: ['bigint', 'date'],
            response: ['bigint', 'date'],
          },
        },
        useDates: true,
        useBigInt: true,
      },
    },
  },
});
