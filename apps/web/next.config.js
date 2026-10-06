/** @type {import('next').NextConfig} */
const nextConfig = {
  // Eliminamos rewrites para evitar conflictos con el manejo de cookies (Set-Cookie)
  // en el proxy. La comunicación debe ser directa al backend.
};

module.exports = nextConfig;
