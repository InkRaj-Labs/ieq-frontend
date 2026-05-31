const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

const nextConfig = {
  output: "standalone",
  images: { unoptimized: true },
};

module.exports = withPWA(nextConfig);
