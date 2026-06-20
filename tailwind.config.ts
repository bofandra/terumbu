import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          50: "#eefafa",
          100: "#d5f1ef",
          300: "#78cfc7",
          500: "#188f8a",
          700: "#0b5d64",
          900: "#07343f"
        },
        coral: {
          100: "#ffe2d7",
          300: "#ff9d83",
          500: "#f45d48",
          700: "#b9362d"
        },
        kelp: {
          100: "#dcefd8",
          500: "#4a8f57",
          700: "#285a37"
        },
        sand: {
          50: "#fbf7ef",
          100: "#f4ead7",
          300: "#d8be86"
        }
      },
      boxShadow: {
        soft: "0 18px 60px rgba(7, 52, 63, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;

