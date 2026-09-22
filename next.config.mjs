/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mobile / local network dev access for 10.236.239.132
  experimental: {
    serverActions: {
      allowedOrigins: [
        '10.236.239.132',
        '10.236.239.132:3000',
        'localhost:3000',
      ],
    },
  },
};

export default nextConfig;
