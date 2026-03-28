<template>
  <router-view></router-view>
</template>

<style>
/* Import Font Modern dari Google */
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap");

/* Variabel Warna Global */
:root {
  --primary: #4f46e5; /* Warna Ungu/Biru Indigo Modern */
  --primary-hover: #4338ca;
  --bg-color: #f3f4f6;
  --text-dark: #111827;
  --text-muted: #6b7280;
  --border-color: #e5e7eb;
}

body {
  margin: 0;
  font-family: "Inter", sans-serif;
  background-color: var(--bg-color);
  color: var(--text-dark);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Reset Box Sizing */
*,
*::before,
*::after {
  box-sizing: border-box;
}
</style>
