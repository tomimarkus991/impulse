/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#0A84FF", // Directly set colors
        // background: "#1E1F1F",
        background: "#151514",
        text: "#E5E5E7",
        modal: "#222221",
      },
    },
  },
  plugins: [],
};
