const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// Fungsi untuk membaca data dari file JSON
function readJSONFile(filePath) {
  try {
    const fullPath = path.join(__dirname, '..', filePath);
    if (!fs.existsSync(fullPath)) {
      console.warn(`File not found: ${fullPath}`);
      return [];
    }
    const data = fs.readFileSync(fullPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return [];
  }
}

// Fungsi untuk membuat slug dari judul
function createSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim();
}

// Fungsi untuk format tanggal
function formatDate(dateString) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('id-ID', options);
}

// Fungsi untuk format harga
function formatPrice(price) {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Fungsi untuk membuat meta tags
function createMetaTags(title, description, image, url, type = 'website') {
  return `
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta name="keywords" content="${title}, berita, teknologi, keuangan, fotografi, produktivitas, FORUMID">
    <meta name="author" content="FORUMID">
    
    <!-- Open Graph Meta Tags -->
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${image}">
    <meta property="og:url" content="${url}">
    <meta property="og:type" content="${type}">
    
    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${image}">
    
    <!-- Canonical URL -->
    <link rel="canonical" href="${url}">
  `;
}

// Fungsi untuk membuat structured data (JSON-LD)
function createStructuredData(type, data) {
  let structuredData = {};
  
  if (type === 'article') {
    structuredData = {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      "headline": data.title,
      "image": [data.image],
      "datePublished": data.date,
      "dateModified": data.date,
      "author": {
        "@type": "Person",
        "name": data.author.name
      },
      "publisher": {
        "@type": "Organization",
        "name": "FORUMID",
        "logo": {
          "@type": "ImageObject",
          "url": "https://forumid.github.io/logo.png"
        }
      },
      "description": data.excerpt,
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": data.url
      }
    };
  } else if (type === 'website') {
    structuredData = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "FORUMID",
      "description": "Portal berita terkini menyajikan informasi teknologi, keuangan, fotografi, produkivitas dan lainnya.",
      "url": "https://forumid.github.io",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://forumid.github.io/search?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    };
  }
  
  return `<script type="application/ld+json">${JSON.stringify(structuredData, null, 2)}</script>`;
}

// Fungsi untuk membuat halaman artikel
function generateArticlePage(post, authors, categories, template, outputDir) {
  const slug = createSlug(post.title);
  const author = authors.find(a => a.id === post.author) || { name: "Unknown", bio: "", avatar: "https://picsum.photos/seed/unknown/120/120.jpg" };
  const category = categories.find(c => c.id === post.category) || { name: "Unknown" };
  
  const $ = cheerio.load(template);
  
  // Update meta tags
  $('head').prepend(createMetaTags(
    `${post.title} - FORUMID`,
    post.excerpt,
    post.image,
    `https://forumid.github.io/${slug}.html`,
    'article'
  ));
  
  // Update structured data
  $('head').append(createStructuredData('article', {
    title: post.title,
    excerpt: post.excerpt,
    image: post.image,
    date: post.date,
    author: author,
    url: `https://forumid.github.io/${slug}.html`
  }));
  
  // Update konten halaman
  $('#page-container').html(`
    <div class="single-news-container">
      <article class="single-news">
        <div class="single-news-image-container">
          <img src="${post.image}" alt="${post.title}" class="single-news-image">
          <div class="single-news-category">${category.name}</div>
        </div>
        
        <div class="single-news-content">
          <h1>${post.title}</h1>
          <div class="news-meta">
            <div class="news-date">
              <i class="fas fa-calendar"></i>
              <span>${formatDate(post.date)}</span>
            </div>
            <div class="news-author">
              <i class="fas fa-user"></i>
              <span>${author.name}</span>
            </div>
            <div class="news-read-time">
              <i class="fas fa-clock"></i>
              <span>${post.readTime}</span>
            </div>
          </div>
          ${post.content}
        </div>
      </article>
      
      <aside class="news-sidebar">
        <div class="author-card">
          <img src="${author.avatar}" alt="${author.name}" class="author-avatar">
          <h3 class="author-name">${author.name}</h3>
          <p class="author-bio">${author.bio}</p>
          
          <div class="author-meta">
            <div class="author-meta-item">
              <i class="fas fa-envelope"></i>
              <span>${author.email || 'unknown@example.com'}</span>
            </div>
            ${author.whatsapp ? `
            <div class="author-meta-item">
              <i class="fab fa-whatsapp"></i>
              <span>${author.whatsapp}</span>
            </div>
            ` : ''}
          </div>
        </div>
        
        <div class="related-news">
          <h3 class="sidebar-title">
            <i class="fas fa-newspaper"></i>
            Berita Terkait
          </h3>
          <div class="related-news-list">
            <!-- Related articles would be dynamically loaded -->
          </div>
        </div>
      </aside>
    </div>
  `);
  
  // Simpan halaman statis
  const outputPath = path.join(outputDir, `${slug}.html`);
  fs.writeFileSync(outputPath, $.html());
  
  console.log(`Generated article page: ${slug}.html`);
  return { slug, title: post.title, date: post.date };
}

// Fungsi untuk membuat halaman kategori
function generateCategoryPage(category, posts, authors, template, outputDir) {
  const slug = createSlug(category.name);
  const categoryPosts = posts.filter(p => p.category === category.id);
  
  const $ = cheerio.load(template);
  
  // Update meta tags
  $('head').prepend(createMetaTags(
    `${category.name} - FORUMID`,
    category.excerpt,
    category.image,
    `https://forumid.github.io/category/${slug}.html`,
    'website'
  ));
  
  // Update konten halaman
  $('#page-container').html(`
    <div class="category-page">
      <div class="category-banner">
        <div class="category-banner-content">
          <div class="category-banner-image">
            <img src="${category.image}" alt="${category.name}">
          </div>
          <div class="category-banner-details">
            <h2 class="category-banner-title">${category.name}</h2>
            <p class="category-banner-description">${category.excerpt}</p>
            <div class="category-banner-stats">
              <div class="stat-item">
                <i class="fas fa-newspaper"></i>
                <span>${categoryPosts.length} Berita</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="news-grid">
        ${categoryPosts.map(post => {
          const author = authors.find(a => a.id === post.author) || { name: "Unknown" };
          const postSlug = createSlug(post.title);
          return `
            <article class="news-card">
              <div class="news-image-container">
                <img src="${post.image}" alt="${post.title}" class="news-image">
                <div class="news-category-overlay">${category.name}</div>
              </div>
              <div class="news-content">
                <div class="news-category">${category.name}</div>
                <h3 class="news-title">
                  <a href="${postSlug}.html">${post.title}</a>
                </h3>
                <p class="news-excerpt">${post.excerpt}</p>
                <div class="news-meta">
                  <div class="news-date">
                    <i class="fas fa-calendar"></i>
                    <span>${formatDate(post.date)}</span>
                  </div>
                  <div class="news-author">
                    <i class="fas fa-user"></i>
                    <span>${author.name}</span>
                  </div>
                </div>
              </div>
            </article>
          `;
        }).join('')}
      </div>
    </div>
  `);
  
  // Simpan halaman statis
  const outputPath = path.join(outputDir, `category-${slug}.html`);
  fs.writeFileSync(outputPath, $.html());
  
  console.log(`Generated category page: category-${slug}.html`);
  return { slug: `category-${slug}`, title: category.name };
}

// Fungsi untuk membuat halaman penulis
function generateAuthorPage(author, posts, categories, template, outputDir) {
  const authorPosts = posts.filter(p => p.author === author.id);
  
  const $ = cheerio.load(template);
  
  // Update meta tags
  $('head').prepend(createMetaTags(
    `${author.name} - FORUMID`,
    author.bio,
    author.avatar,
    `https://forumid.github.io/author/${author.id}.html`,
    'profile'
  ));
  
  // Update konten halaman
  $('#page-container').html(`
    <div class="author-page">
      <div class="author-header">
        <img src="${author.avatar}" alt="${author.name}" class="author-avatar">
        <h2 class="author-name">${author.name}</h2>
        <p class="author-bio">${author.bio}</p>
        <div class="author-stats">
          <div class="author-stat">
            <div class="author-stat-number">${authorPosts.length}</div>
            <div class="author-stat-label">Artikel</div>
          </div>
        </div>
      </div>
      
      <div class="author-posts">
        <h3>Artikel oleh ${author.name}</h3>
        <div class="news-grid">
          ${authorPosts.map(post => {
            const category = categories.find(c => c.id === post.category) || { name: "Unknown" };
            const postSlug = createSlug(post.title);
            return `
              <article class="news-card">
                <div class="news-image-container">
                  <img src="${post.image}" alt="${post.title}" class="news-image">
                  <div class="news-category-overlay">${category.name}</div>
                </div>
                <div class="news-content">
                  <div class="news-category">${category.name}</div>
                  <h3 class="news-title">
                    <a href="${postSlug}.html">${post.title}</a>
                  </h3>
                  <p class="news-excerpt">${post.excerpt}</p>
                  <div class="news-meta">
                    <div class="news-date">
                      <i class="fas fa-calendar"></i>
                      <span>${formatDate(post.date)}</span>
                    </div>
                  </div>
                </div>
              </article>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `);
  
  // Simpan halaman statis
  const outputPath = path.join(outputDir, `author-${author.id}.html`);
  fs.writeFileSync(outputPath, $.html());
  
  console.log(`Generated author page: author-${author.id}.html`);
  return { slug: `author-${author.id}`, title: author.name };
}

// Fungsi untuk membuat halaman toko
function generateShopPage(products, categories, template, outputDir) {
  const activeProducts = products.filter(p => p.is_active);
  
  const $ = cheerio.load(template);
  
  // Update meta tags
  $('head').prepend(createMetaTags(
    'Toko Digital - FORUMID',
    'Temukan produk digital berkualitas seperti template, UI kit, dan ebook untuk meningkatkan produktivitas Anda.',
    'https://picsum.photos/seed/shop/1200/630.jpg',
    'https://forumid.github.io/shop.html',
    'website'
  ));
  
  // Update konten halaman
  $('#page-container').html(`
    <div class="shop-page">
      <div class="shop-header">
        <h2 class="shop-title">
          <i class="fas fa-shopping-bag"></i>
          Toko Digital
        </h2>
      </div>
      
      <div class="shop-products">
        ${activeProducts.map(product => {
          const category = categories.find(c => c.id === product.category_id) || { name: "Unknown" };
          const productSlug = createSlug(product.title);
          return `
            <div class="shop-product">
              <div class="shop-product-image">
                <img src="${product.thumbnail_url}" alt="${product.title}">
                <div class="shop-product-badge">Digital</div>
              </div>
              <div class="shop-product-content">
                <div class="shop-product-category">${category.name}</div>
                <h3 class="shop-product-title">
                  <a href="product-${productSlug}.html">${product.title}</a>
                </h3>
                <p class="shop-product-description">${product.description}</p>
                <div class="shop-product-footer">
                  <div class="shop-product-price">Rp${formatPrice(product.price)}</div>
                  <div class="shop-product-actions">
                    <a href="${product.file_url}" target="_blank" class="shop-product-btn shop-product-btn-secondary">
                      <i class="fas fa-eye"></i>
                      Preview
                    </a>
                    <a href="https://wa.me/6285867271777?text=Saya%20tertarik%20dengan%20produk%20${encodeURIComponent(product.title)}" target="_blank" class="shop-product-btn shop-product-btn-primary">
                      <i class="fas fa-shopping-cart"></i>
                      Beli
                    </a>
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `);
  
  // Simpan halaman statis
  const outputPath = path.join(outputDir, 'shop.html');
  fs.writeFileSync(outputPath, $.html());
  
  console.log('Generated shop page: shop.html');
  return { slug: 'shop', title: 'Toko Digital' };
}

// Fungsi untuk membuat halaman produk
function generateProductPage(product, categories, template, outputDir) {
  const slug = createSlug(product.title);
  const category = categories.find(c => c.id === product.category_id) || { name: "Unknown" };
  
  const $ = cheerio.load(template);
  
  // Update meta tags
  $('head').prepend(createMetaTags(
    `${product.title} - FORUMID`,
    product.description,
    product.thumbnail_url,
    `https://forumid.github.io/product-${slug}.html`,
    'product'
  ));
  
  // Update konten halaman
  $('#page-container').html(`
    <div class="single-product-container">
      <div class="single-product-image">
        <img src="${product.thumbnail_url}" alt="${product.title}">
      </div>
      <div class="single-product-details">
        <div class="single-product-category">${category.name}</div>
        <h1 class="single-product-title">${product.title}</h1>
        <div class="single-product-description">${product.description}</div>
        <div class="single-product-price">Rp${formatPrice(product.price)}</div>
        <div class="single-product-actions">
          <a href="${product.file_url}" target="_blank" class="single-product-btn single-product-btn-secondary">
            <i class="fas fa-eye"></i>
            Lihat Demo
          </a>
          <a href="https://wa.me/6285867271777?text=Saya%20tertarik%20dengan%20produk%20${encodeURIComponent(product.title)}" target="_blank" class="single-product-btn single-product-btn-primary">
            <i class="fas fa-shopping-cart"></i>
            Beli Sekarang
          </a>
        </div>
      </div>
    </div>
  `);
  
  // Simpan halaman statis
  const outputPath = path.join(outputDir, `product-${slug}.html`);
  fs.writeFileSync(outputPath, $.html());
  
  console.log(`Generated product page: product-${slug}.html`);
  return { slug: `product-${slug}`, title: product.title };
}

// Fungsi untuk membuat halaman indeks
function generateIndexPage(posts, authors, categories, template, outputDir) {
  const $ = cheerio.load(template);
  
  // Update meta tags
  $('head').prepend(createMetaTags(
    'FORUMID - Berita Terkini dan Terpercaya',
    'Portal berita terkini menyajikan informasi teknologi, keuangan, fotografi, produkivitas dan lainnya. Dapatkan berita terpercaya dan update harian di sini.',
    'https://picsum.photos/seed/news-home/1200/630.jpg',
    'https://forumid.github.io/',
    'website'
  ));
  
  // Update structured data
  $('head').append(createStructuredData('website', {}));
  
  // Ambil 6 artikel terbaru
  const latestPosts = posts
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6);
  
  // Update konten halaman
  $('#page-container').html(`
    <div class="main-content">
      <div class="content-left">
        <div class="featured-news">
          ${latestPosts.length > 0 ? `
          <div class="featured-news-main">
            <img src="${latestPosts[0].image}" alt="${latestPosts[0].title}">
            <div class="featured-news-content">
              <div class="featured-news-category">${categories.find(c => c.id === latestPosts[0].category)?.name || 'Unknown'}</div>
              <h1 class="featured-news-title">
                <a href="${createSlug(latestPosts[0].title)}.html">${latestPosts[0].title}</a>
              </h1>
              <p class="featured-news-excerpt">${latestPosts[0].excerpt}</p>
              <div class="featured-news-meta">
                <span><i class="fas fa-calendar"></i> ${formatDate(latestPosts[0].date)}</span>
                <span><i class="fas fa-user"></i> ${authors.find(a => a.id === latestPosts[0].author)?.name || 'Unknown'}</span>
                <span><i class="fas fa-clock"></i> ${latestPosts[0].readTime}</span>
              </div>
            </div>
          </div>
          ` : ''}
          
          <div class="featured-news-secondary">
            ${latestPosts.slice(1, 3).map(post => {
              const postSlug = createSlug(post.title);
              return `
              <div class="featured-news-item">
                <a href="${postSlug}.html">
                  <img src="${post.image}" alt="${post.title}">
                  <div class="featured-news-item-content">
                    <h3 class="featured-news-item-title">${post.title}</h3>
                    <div class="featured-news-item-meta">${formatDate(post.date)}</div>
                  </div>
                </a>
              </div>
            `;
            }).join('')}
          </div>
        </div>
        
        <div class="latest-news">
          <div class="section-header">
            <h2 class="section-title">
              <i class="fas fa-newspaper"></i>
              Berita Terkini
            </h2>
          </div>
          
          <div class="news-grid">
            ${latestPosts.slice(3).map(post => {
              const category = categories.find(c => c.id === post.category) || { name: "Unknown" };
              const author = authors.find(a => a.id === post.author) || { name: "Unknown" };
              const postSlug = createSlug(post.title);
              return `
                <article class="news-card">
                  <div class="news-image-container">
                    <img src="${post.image}" alt="${post.title}" class="news-image">
                    <div class="news-category-overlay">${category.name}</div>
                  </div>
                  <div class="news-content">
                    <div class="news-category">${category.name}</div>
                    <h3 class="news-title">
                      <a href="${postSlug}.html">${post.title}</a>
                    </h3>
                    <p class="news-excerpt">${post.excerpt}</p>
                    <div class="news-meta">
                      <div class="news-date">
                        <i class="fas fa-calendar"></i>
                        <span>${formatDate(post.date)}</span>
                      </div>
                      <div class="news-author">
                        <i class="fas fa-user"></i>
                        <span>${author.name}</span>
                      </div>
                    </div>
                  </div>
                </article>
              `;
            }).join('')}
          </div>
        </div>
      </div>
      
      <div class="sidebar">
        <div class="sidebar-section">
          <h3 class="sidebar-title">
            <i class="fas fa-fire"></i>
            Berita Trending
          </h3>
          <ul class="trending-news-list">
            ${posts.slice(0, 5).map((post, index) => {
              const postSlug = createSlug(post.title);
              return `
              <li class="trending-news-item">
                <div class="trending-number">${index + 1}</div>
                <div class="trending-content">
                  <h4 class="trending-title">
                    <a href="${postSlug}.html">${post.title}</a>
                  </h4>
                  <div class="trending-meta">${formatDate(post.date)}</div>
                </div>
              </li>
            `;
            }).join('')}
          </ul>
        </div>
      </div>
    </div>
  `);
  
  // Simpan halaman indeks
  const indexPath = path.join(outputDir, 'index.html');
  fs.writeFileSync(indexPath, $.html());
  
  console.log('Generated index page');
}

// Fungsi untuk membuat sitemap
function generateSitemap(pages, outputDir) {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://forumid.github.io/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  ${pages.map(page => `
  <url>
    <loc>https://forumid.github.io/${page.slug}.html</loc>
    <lastmod>${page.date ? new Date(page.date).toISOString() : new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('')}
</urlset>`;
  
  const sitemapPath = path.join(outputDir, 'sitemap.xml');
  fs.writeFileSync(sitemapPath, sitemap);
  
  console.log('Generated sitemap.xml');
}

// Fungsi utama
async function generateStaticPages() {
  console.log('Starting static page generation...');
  
  // Baca template HTML
  const templatePath = path.join(__dirname, '..', 'index.html');
  if (!fs.existsSync(templatePath)) {
    console.error('Template file not found:', templatePath);
    process.exit(1);
  }
  const template = fs.readFileSync(templatePath, 'utf8');
  
  // Buat folder output
  const outputDir = path.join(__dirname, '..', 'dist');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Baca data dari file JSON
  console.log('Reading data files...');
  const posts = [
    ...readJSONFile('Teknologi.json'),
    ...readJSONFile('Keuangan.json'),
    ...readJSONFile('Fotografi.json'),
    ...readJSONFile('Produktivitas.json'),
    ...readJSONFile('Soal.json')
  ];
  
  const authors = readJSONFile('penulis.json');
  const categories = readJSONFile('categories.json');
  const products = readJSONFile('toko.json');
  
  console.log(`Found ${posts.length} posts, ${authors.length} authors, ${categories.length} categories, ${products.length} products`);
  
  // Salin file aset
  console.log('Copying assets...');
  const assets = ['style.css', 'script.js', 'favicon.ico'];
  assets.forEach(asset => {
    const assetPath = path.join(__dirname, '..', asset);
    if (fs.existsSync(assetPath)) {
      fs.copyFileSync(assetPath, path.join(outputDir, asset));
      console.log(`Copied ${asset}`);
    }
  });
  
  // Generate halaman
  const pages = [];
  
  // Generate halaman indeks
  console.log('Generating index page...');
  generateIndexPage(posts, authors, categories, template, outputDir);
  
  // Generate halaman artikel
  console.log('Generating article pages...');
  posts.forEach(post => {
    const page = generateArticlePage(post, authors, categories, template, outputDir);
    pages.push(page);
  });
  
  // Generate halaman kategori
  console.log('Generating category pages...');
  categories.forEach(category => {
    const page = generateCategoryPage(category, posts, authors, template, outputDir);
    pages.push(page);
  });
  
  // Generate halaman penulis
  console.log('Generating author pages...');
  authors.forEach(author => {
    const page = generateAuthorPage(author, posts, categories, template, outputDir);
    pages.push(page);
  });
  
  // Generate halaman toko
  console.log('Generating shop page...');
  const shopPage = generateShopPage(products, categories, template, outputDir);
  pages.push(shopPage);
  
  // Generate halaman produk
  console.log('Generating product pages...');
  products.filter(p => p.is_active).forEach(product => {
    const page = generateProductPage(product, categories, template, outputDir);
    pages.push(page);
  });
  
  // Generate sitemap
  console.log('Generating sitemap...');
  generateSitemap(pages, outputDir);
  
  console.log('Static page generation completed!');
  console.log(`Total pages generated: ${pages.length + 1}`); // +1 for index
}

// Jalankan fungsi
generateStaticPages().catch(error => {
  console.error('Error generating static pages:', error);
  process.exit(1);
});
