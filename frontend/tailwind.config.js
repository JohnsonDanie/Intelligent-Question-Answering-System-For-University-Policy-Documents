/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                university: {
                    blue: "#003366",
                    lightBlue: "#e6f0ff",
                    darkBlue: "#002244",
                }
            }
        },
    },
    plugins: [],
}
