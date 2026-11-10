// Tailwind scans index.html for the classes it uses and builds styles.css.
// Rebuild after changing classes:  npx tailwindcss@3 -i styles/input.css -o styles.css --minify
module.exports = {
  content: ["./index.html"],
  theme: { extend: {} },
  plugins: [],
};
