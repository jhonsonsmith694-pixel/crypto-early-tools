/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';
module.exports = {
  output: 'export',
  basePath: isProd ? '/crypto-early-tools' : '',
  assetPrefix: isProd ? '/crypto-early-tools/' : '',
  images: { unoptimized: true },
};
