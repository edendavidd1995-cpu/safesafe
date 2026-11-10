const base = process.env.PAGES_BASE || '';
/** @type {import('next').NextConfig} */
export default {
  output: 'export',
  basePath: base,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE: base },
};
