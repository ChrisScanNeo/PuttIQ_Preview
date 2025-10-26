# PuttIQ Marketing Website

Professional marketing website for the PuttIQ golf putting rhythm trainer app.

## Overview

This website showcases the PuttIQ app with a beautiful golf-themed design featuring:
- 🌿 Grass background textures
- ⛳ Golf-inspired color palette (greens, beige, white)
- 📱 Fully responsive design (mobile, tablet, desktop)
- 🎨 Tailwind CSS for modern styling
- ⚡ Fast loading and optimized performance

## Structure

```
website/
├── index.html          # Main landing page
├── privacy.html        # Privacy policy
├── support.html        # Support & FAQ
├── css/
│   ├── input.css       # Tailwind source
│   └── styles.css      # Compiled CSS
├── images/
│   ├── logo.jpg        # PuttIQ logo
│   ├── grass-bg.jpeg   # Grass background
│   └── app-icon.png    # App icon
├── package.json        # Node dependencies
├── tailwind.config.js  # Tailwind config
└── README.md          # This file
```

## Development

### Prerequisites
- Node.js 18+ installed
- npm or yarn

### Setup
```bash
cd website
npm install
```

### Build CSS
```bash
# Build once
npm run build:css

# Watch for changes (during development)
npm run watch:css
```

### Local Testing
```bash
# Option 1: Python's HTTP server (recommended)
npm run serve
# Then open http://localhost:8000

# Option 2: Open directly in browser
open index.html
```

## Deployment

### Option 1: GitHub Pages (Recommended - Free & Easy)

1. **Prepare the repository:**
   ```bash
   # Commit your changes
   git add website/
   git commit -m "Add PuttIQ marketing website"
   git push origin main
   ```

2. **Enable GitHub Pages:**
   - Go to your repository on GitHub
   - Click **Settings** → **Pages**
   - Under **Source**, select **Deploy from a branch**
   - Select branch: `main`
   - Select folder: `/website`
   - Click **Save**

3. **Access your site:**
   - Your website will be live at: `https://[username].github.io/[repo-name]/`
   - Wait 2-3 minutes for initial deployment

4. **Custom domain (optional):**
   - Add a `CNAME` file to `/website/` with your domain
   - Update DNS settings with your domain provider
   - See: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site

---

### Option 2: Netlify (Free Tier, Custom Domain Included)

1. **Sign up for Netlify:**
   - Go to https://netlify.com
   - Sign up with GitHub (easiest)

2. **Deploy via drag & drop:**
   - Click **Add new site** → **Deploy manually**
   - Drag the `/website` folder into the upload area
   - Your site will be live in seconds!

3. **Deploy via Git (automatic updates):**
   - Click **Add new site** → **Import from Git**
   - Connect your GitHub repository
   - Set **Base directory** to: `website`
   - Set **Publish directory** to: `.`
   - Click **Deploy site**

4. **Custom domain:**
   - Click **Domain settings** → **Add custom domain**
   - Follow Netlify's DNS instructions
   - SSL certificate is automatically provisioned

---

### Option 3: Vercel (Free Tier, Optimized for Performance)

1. **Sign up for Vercel:**
   - Go to https://vercel.com
   - Sign up with GitHub

2. **Deploy:**
   - Click **Add New** → **Project**
   - Import your GitHub repository
   - Set **Root Directory** to: `website`
   - Click **Deploy**

3. **Custom domain:**
   - Go to **Settings** → **Domains**
   - Add your custom domain
   - Follow Vercel's DNS instructions

---

### Option 4: AWS S3 + CloudFront (Production-Grade)

1. **Create S3 Bucket:**
   ```bash
   aws s3 mb s3://puttiq-website
   aws s3 sync . s3://puttiq-website --exclude "node_modules/*" --exclude ".git/*"
   ```

2. **Enable static website hosting:**
   - Go to S3 → Bucket → Properties
   - Enable **Static website hosting**
   - Set **Index document** to `index.html`

3. **Configure CloudFront (optional but recommended):**
   - Create a CloudFront distribution
   - Set origin to your S3 bucket
   - Enable HTTPS
   - Add custom domain (if desired)

---

## Updating Content

### Change App Store Link
Edit `index.html` and `support.html`:
```html
<!-- Update this URL -->
<a href="https://apps.apple.com/app/puttiq" target="_blank">
```

### Change Support Email
Edit `support.html`:
```html
<!-- Update this email -->
<a href="mailto:support@puttiq.com">
```

### Update Colors
Edit `tailwind.config.js`:
```js
colors: {
  'golf-green': {
    500: '#4a7c2d', // Change this to your preferred green
    // ... other shades
  }
}
```
Then rebuild:
```bash
npm run build:css
```

### Add New Pages
1. Create new HTML file in `/website/`
2. Copy header/footer from existing pages
3. Add link in navigation and footer
4. Rebuild CSS if needed

## SEO Optimization

### Current Meta Tags
- Title tags on all pages
- Description meta tags
- Viewport meta for mobile
- Open Graph tags (recommended to add)

### Recommended Additions
Add to `<head>` of each page:

```html
<!-- Open Graph / Social Media -->
<meta property="og:type" content="website">
<meta property="og:url" content="https://yourdomain.com/">
<meta property="og:title" content="PuttIQ - Master Your Putting Rhythm">
<meta property="og:description" content="Visual rhythm training meets precision timing feedback">
<meta property="og:image" content="https://yourdomain.com/images/og-image.jpg">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:url" content="https://yourdomain.com/">
<meta name="twitter:title" content="PuttIQ - Master Your Putting Rhythm">
<meta name="twitter:description" content="Visual rhythm training meets precision timing feedback">
<meta name="twitter:image" content="https://yourdomain.com/images/og-image.jpg">
```

### Google Analytics (Optional)
Add before `</head>`:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

## Performance Tips

1. **Optimize images:**
   ```bash
   # Install imagemagick
   brew install imagemagick

   # Optimize grass background
   convert grass-bg.jpeg -quality 85 -strip grass-bg.jpeg
   ```

2. **Enable gzip compression** (automatic on most hosts)

3. **Add caching headers** (if using S3 or custom server)

4. **Use a CDN** (CloudFront, Cloudflare, etc.)

## Browser Support

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ iOS Safari 14+
- ✅ Chrome Android 90+

## Maintenance

### Regular Updates
- Update copyright year in footer (currently 2025)
- Update app version mentions if needed
- Check all external links monthly
- Update privacy policy as needed

### Monitoring
- Check website uptime (use UptimeRobot or similar)
- Monitor analytics for user behavior
- Test on real devices regularly

## Troubleshooting

### CSS not loading?
```bash
# Rebuild CSS
npm run build:css

# Check output
cat css/styles.css
```

### Images not showing?
- Check file paths are relative: `./images/logo.jpg`
- Verify images exist in `/images/` folder
- Check file extensions match (case-sensitive on some hosts)

### Deploy not updating?
- Clear browser cache (Cmd+Shift+R on Mac)
- Check if CDN needs cache purging
- Verify Git push completed successfully

## Support

For questions about the website:
- Create an issue in the repository
- Email: support@puttiq.com

## License

© 2025 PuttIQ. All rights reserved.
