import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        leaf: "#285943",
        moss: "#6f8f52",
        clay: "#b45f3c",
        paper: "#faf8f3",
        ink: "#18211d"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(24, 33, 29, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
