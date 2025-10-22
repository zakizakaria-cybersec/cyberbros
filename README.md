# CyberBros - Professional Cybersecurity Website

A modern, professional Astro.js website for cybersecurity services, built based on the Global Financial Starter Multilingual Template.

## 🚀 Features

- **Modern Design**: Clean, professional design with gradient accents and smooth animations
- **Responsive**: Fully responsive design that works on all devices
- **SEO Optimized**: Built-in SEO support with meta tags and sitemap generation
- **Multilingual Ready**: i18n support for English, Spanish, and French
- **Fast Performance**: Static site generation for optimal loading speeds
- **Accessible**: Semantic HTML and ARIA labels for better accessibility

## 📋 Sections

1. **Hero Section**: Eye-catching introduction with call-to-action buttons
2. **Services**: 6 comprehensive cybersecurity services
3. **Features**: Key differentiators and benefits
4. **Testimonials**: Client success stories
5. **Contact Form**: Lead capture with service selection
6. **Footer**: Company information and navigation links

## 🛠️ Tech Stack

- **Astro** v5.14.8 - Static Site Generator
- **React** v19.2.0 - UI Components
- **Tailwind CSS** v3.4.0 - Utility-first CSS
- **TypeScript** - Type safety

## 📦 Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🌐 Development

The site will be available at `http://localhost:4321/` when running the dev server.

### Project Structure

```
/
├── public/          # Static assets
├── src/
│   ├── components/  # Reusable Astro components
│   ├── layouts/     # Page layouts
│   ├── pages/       # Page routes
│   └── styles/      # Global styles
├── astro.config.mjs # Astro configuration
├── tailwind.config.mjs # Tailwind configuration
└── tsconfig.json    # TypeScript configuration
```

## 🚢 Deployment

This site can be deployed to any static hosting platform:

- **Netlify**: Connect your repository and deploy automatically
- **Vercel**: Import project and deploy with one click
- **GitHub Pages**: Use GitHub Actions for automatic deployment
- **Cloudflare Pages**: Fast global CDN deployment

## 📝 Customization

### Update Content

- **Services**: Edit `src/components/Services.astro`
- **Features**: Edit `src/components/Features.astro`
- **Testimonials**: Edit `src/components/Testimonials.astro`
- **Contact Info**: Edit `src/components/Contact.astro` and `src/components/Footer.astro`

### Styling

- **Colors**: Modify `tailwind.config.mjs` to change primary/secondary colors
- **Fonts**: Update font imports in `src/layouts/BaseLayout.astro`
- **Global Styles**: Edit `src/styles/global.css`

## 📄 License

ISC

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
