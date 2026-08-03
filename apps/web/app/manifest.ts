import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'JVerse EduKonekta',
    short_name: 'EduKonekta',
    description: 'School communication and student-support platform',
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f8ff',
    theme_color: '#092d83',
    icons: [{ src: '/pinkora-logo.png', sizes: '1024x1024', type: 'image/png' }],
  };
}
