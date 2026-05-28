/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#EDE9E2",
        bg2: "#E5E0D8",
        card: "#F7F4EF",
        card2: "#EFEBE3",
        text1: "#1C1A16",
        text2: "#6B6355",
        text3: "#A89E90",
        accent: "#C4784A",
        accentLight: "#F5E5D8",
        green: "#4A7460",
        greenLight: "#DFF0E8",
        amber: "#B8882A",
        amberLight: "#F5EDDA",
        red: "#A84040",
        redLight: "#F5E0E0",
        sage: "#4E6E58",
        sageLight: "#E0EBE4",
        dusk: "#5A5070",
        duskLight: "#E8E5F0",
      },
      borderRadius: {
        md: "14px",
        lg: "20px",
        hero: "22px",
        pill: "30px",
      },
      fontFamily: {
        heading: ["Lora_400Regular"],
        body: ["DMSans_400Regular"],
        bodyMedium: ["DMSans_500Medium"],
        bodySemi: ["DMSans_600SemiBold"],
      },
    },
  },
  plugins: [],
};
