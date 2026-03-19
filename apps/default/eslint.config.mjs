import convexPlugin from "@convex-dev/eslint-plugin";
import tseslint from "typescript-eslint";

const APP_FILES = ["app/**/*.ts", "app/**/*.tsx", "components/**/*.ts", "components/**/*.tsx", "lib/**/*.ts", "lib/**/*.tsx"];

export default tseslint.config(
    { ignores: ["node_modules/**", "**/node_modules/**", "convex/_generated/**", ".expo/**", "dist/**", "metro.config.js"] },
    {
        files: APP_FILES,
        extends: [...tseslint.configs.recommended, ...convexPlugin.configs.recommended],
        rules: {
            "@typescript-eslint/no-unused-vars": ["error", {
                argsIgnorePattern: "^_",
                varsIgnorePattern: "^_",
                caughtErrorsIgnorePattern: "^_",
            }],
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unsafe-function-type": "off",
            "@typescript-eslint/ban-ts-comment": "off",
            "@typescript-eslint/no-require-imports": "off",
            "@typescript-eslint/no-empty-object-type": "off",
        },
    },
);
