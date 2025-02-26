/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'marist': {
                    DEFAULT: '#12327A', // This is the main Marist blue from your website
                    dark: '#0A1E46',    // Darker shade for backgrounds
                    light: '#1E3A6B',   // Lighter shade for hover states
                    accent: '#2D4D85'   // Even lighter for accents
                }
            }
        },
    },
    
    plugins: [],
}
