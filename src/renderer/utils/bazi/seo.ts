
export const updateSEOMeta = (title: string, keywords: string, description: string, url?: string, image?: string) => {
    // #ifdef H5
    if (typeof document === 'undefined') return;

    const finalUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
    const finalImage = image || `${typeof window !== 'undefined' ? window.location.origin : ''}/static/logo.png`;

    document.title = title;

    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', description);

    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
        metaKeywords = document.createElement('meta');
        metaKeywords.setAttribute('name', 'keywords');
        document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', keywords);

    // Open Graph
    const setOgTag = (property: string, content: string) => {
        // Optimization: Update existing tag in-place to maintain DOM stability for Safari
        let tag = document.querySelector(`meta[property="${property}"]`);
        if (!tag) {
            tag = document.createElement('meta');
            tag.setAttribute('property', property);
            document.head.appendChild(tag);
        }
        tag.setAttribute('content', content);
    };

    setOgTag('og:title', title);
    setOgTag('og:description', description);
    setOgTag('og:url', finalUrl);
    setOgTag('og:type', 'website');
    setOgTag('og:image', finalImage);

    // Microdata (itemprop) - 微信等爬虫优先读取
    const setItempropTag = (itemprop: string, content: string) => {
        const tags = document.querySelectorAll(`meta[itemprop="${itemprop}"]`);
        tags.forEach(t => t.remove());

        const tag = document.createElement('meta');
        tag.setAttribute('itemprop', itemprop);
        tag.setAttribute('content', content);
        document.head.appendChild(tag);
    };

    setItempropTag('name', title);
    setItempropTag('description', description);
    setItempropTag('image', finalImage);

    // 标准 HTML 分享图标
    const existingLinkImages = document.querySelectorAll('link[rel="image_src"]');
    existingLinkImages.forEach(l => l.remove());

    let linkImage = document.createElement('link');
    linkImage.setAttribute('rel', 'image_src');
    linkImage.setAttribute('href', finalImage);
    document.head.appendChild(linkImage);

    // Apple Touch Icon
    // Optimization: Update existing tag instead of remove-and-create to prevent "Compass" flash
    let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (!appleIcon) {
        appleIcon = document.createElement('link');
        appleIcon.setAttribute('rel', 'apple-touch-icon');
        document.head.appendChild(appleIcon);
    }
    appleIcon.setAttribute('href', finalImage);
    appleIcon.setAttribute('sizes', '180x180');

    // 标准 Favicon (新增修复)
    const existingFavicons = document.querySelectorAll('link[rel="icon"]');
    existingFavicons.forEach(i => i.remove());

    // 添加 type 属性帮助 Safari 识别图片格式
    const getImageType = (url: string) => {
        if (url.includes('.jpeg') || url.includes('.jpg')) return 'image/jpeg';
        if (url.includes('.png')) return 'image/png';
        return 'image/png';
    };

    let favicon = document.createElement('link');
    favicon.setAttribute('rel', 'icon');
    favicon.setAttribute('href', finalImage);
    favicon.setAttribute('type', getImageType(finalImage));
    favicon.setAttribute('sizes', '32x32');
    document.head.appendChild(favicon);

    // 添加更大尺寸的图标供 Safari 分享使用
    let faviconLarge = document.createElement('link');
    faviconLarge.setAttribute('rel', 'icon');
    faviconLarge.setAttribute('href', finalImage);
    faviconLarge.setAttribute('type', getImageType(finalImage));
    faviconLarge.setAttribute('sizes', '192x192');
    document.head.appendChild(faviconLarge);

    // Canonical URL
    const existingCanonicals = document.querySelectorAll('link[rel="canonical"]');
    existingCanonicals.forEach(c => c.remove());

    let canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    canonical.setAttribute('href', finalUrl);
    document.head.appendChild(canonical);

    // JSON-LD
    let script = document.querySelector('#ld-json');
    if (!script) {
        script = document.createElement('script');
        script.id = 'ld-json';
        script.setAttribute('type', 'application/ld+json');
        document.head.appendChild(script);
    }
    const schema = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": title,
        "description": description,
        "url": finalUrl,
        "isPartOf": {
            "@type": "WebApplication",
            "name": "不准APP",
            "applicationCategory": "LifestyleApplication",
            "operatingSystem": "All"
        }
    };
    script.textContent = JSON.stringify(schema);
    // #endif

    // #ifndef H5
    // Non-H5: no-op
    // #endif
};
