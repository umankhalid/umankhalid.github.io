/**
 * Academic Portfolio JavaScript - Fully JSON Data-Driven with Enhanced Features
 * Template: Saddiq Ur Rehman (MIT License, see LICENSE)
 * Site content: Uman Khalid
 * Description: Interactive functionality with custom logos, certificate images, publication numbering
 */

// ==========================================================================
// Theme Toggle Functionality
// ==========================================================================

/**
 * Update the visual state of the theme toggle
 */
function updateThemeToggle(theme) {
    const themeButton = document.getElementById('theme-toggle-btn');
    if (themeButton) {
        themeButton.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
        themeButton.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
        themeButton.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    }
}

/**
 * Keep the fixed header styling in sync with the current theme and scroll state
 */
function updateHeaderThemeStyle() {
    const header = document.querySelector('.header-wrapper');
    if (!header) return;

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    if (scrollTop > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
}

/**
 * Toggle between light and dark themes
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    updateThemeToggle(newTheme);
    updateHeaderThemeStyle();

    // Save theme preference
    localStorage.setItem('preferred-theme', newTheme);

    console.log(`🎨 Theme switched to: ${newTheme}`);
}

/**
 * Initialize theme from user preference or system preference
 */
function initializeTheme() {
    // Check for saved theme preference or default to 'light'
    const savedTheme = localStorage.getItem('preferred-theme');

    // Always default to light mode unless user has explicitly saved a preference
    const theme = savedTheme || 'light';

    // Apply theme with smooth transition
    document.documentElement.style.transition = 'background-color 0.3s ease, color 0.3s ease';
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeToggle(theme);
    updateHeaderThemeStyle();

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('preferred-theme')) {
            const newTheme = e.matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            updateThemeToggle(newTheme);
            updateHeaderThemeStyle();
        }
    });
}

// ==========================================================================
// Mobile Menu Toggle Function
// ==========================================================================

/**
 * Toggle mobile navigation menu
 */
function toggleMobileMenu() {
    const navMenu = document.querySelector('.nav-menu');
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    
    if (navMenu && menuToggle) {
        navMenu.classList.toggle('active');
        const isOpen = navMenu.classList.contains('active');
        menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        
        // Update icon
        const icon = menuToggle.querySelector('i');
        if (icon) {
            icon.className = isOpen ? 'fas fa-times' : 'fas fa-bars';
        }
        
        // Prevent body scroll when menu is open
        document.body.style.overflow = isOpen ? 'hidden' : '';
    }
}

/**
 * Close mobile menu when clicking outside
 */
function closeMobileMenuOnClickOutside(event) {
    const navMenu = document.querySelector('.nav-menu');
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    
    if (navMenu && menuToggle && navMenu.classList.contains('active')) {
        if (!navMenu.contains(event.target) && !menuToggle.contains(event.target)) {
            navMenu.classList.remove('active');
            menuToggle.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
            
            const icon = menuToggle.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-bars';
            }
        }
    }
}

/**
 * Close mobile menu when a nav button is clicked
 */
function closeMobileMenuOnNavClick() {
    const navMenu = document.querySelector('.nav-menu');
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    
    if (navMenu && menuToggle && navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
        
        const icon = menuToggle.querySelector('i');
        if (icon) {
            icon.className = 'fas fa-bars';
        }
    }
}

// ==========================================================================
// Tab Navigation Functions
// ==========================================================================

/**
 * Initialize tab from URL hash on page load
 */
function initializeTabFromUrl() {
    const hash = location.hash.replace('#', '') || 'home';
    
    if (VALID_TABS.includes(hash)) {
        showTab(hash);
    } else {
        showTab('home');
    }
}

/**
 * Register static page controls that are present in index.html
 */
function initializeStaticEventHandlers() {
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', toggleMobileMenu);
    }

    const themeButton = document.getElementById('theme-toggle-btn');
    if (themeButton) {
        themeButton.addEventListener('click', toggleTheme);
    }

    // Note: [data-tab] clicks are handled via delegation in handleDelegatedActionClick
    // so dynamically rendered triggers (highlight cards, news links) work too.

    document.querySelectorAll('[data-pub]').forEach(button => {
        button.addEventListener('click', () => {
            showPublications(button.dataset.pub);
            scrollToPublicationListTop();
        });
    });

    const scrollButton = document.getElementById('scrollToTop');
    if (scrollButton) {
        scrollButton.addEventListener('click', scrollToTop);
    }

    document.addEventListener('click', handleDelegatedActionClick);
    document.addEventListener('keydown', handleDelegatedActionKeydown);
}

function handleDelegatedActionClick(event) {
    if (!(event.target instanceof Element)) return;

    // Any click outside the open visitor popover dismisses it
    if (!event.target.closest('.flag-counter-wrap')) {
        toggleFlagCounterPopover(false);
    }

    const newsToggleAll = event.target.closest('[data-news-toggle-all]');
    if (newsToggleAll) {
        event.preventDefault();
        toggleAllNewsCards(newsToggleAll);
        return;
    }

    const newsToggle = event.target.closest('[data-news-toggle]');
    if (newsToggle) {
        event.preventDefault();
        toggleNewsCard(newsToggle);
        return;
    }

    const tabTrigger = event.target.closest('[data-tab]');
    if (tabTrigger) {
        event.preventDefault();
        showTab(tabTrigger.dataset.tab);
        return;
    }

    const flagCounterToggle = event.target.closest('[data-flag-counter-toggle]');
    if (flagCounterToggle) {
        event.preventDefault();
        toggleFlagCounterPopover();
        return;
    }

    const flagCounterClose = event.target.closest('[data-flag-counter-close]');
    if (flagCounterClose) {
        event.preventDefault();
        toggleFlagCounterPopover(false);
        return;
    }

    const closeModalTrigger = event.target.closest('[data-close-modal]');
    if (closeModalTrigger) {
        event.preventDefault();
        closeModal(closeModalTrigger.dataset.closeModal);
        return;
    }

    const closeZoomTrigger = event.target.closest('[data-close-zoom]');
    if (closeZoomTrigger) {
        event.preventDefault();
        closeImageZoom();
        return;
    }

    const imageZoomTrigger = event.target.closest('[data-image-zoom-src]');
    if (imageZoomTrigger) {
        event.preventDefault();
        openImageZoom(imageZoomTrigger.dataset.imageZoomSrc, imageZoomTrigger.dataset.imageZoomAlt || imageZoomTrigger.alt || '');
        return;
    }

    const awardTrigger = event.target.closest('[data-award-id]');
    if (awardTrigger) {
        event.preventDefault();
        openAwardCertificate(awardTrigger.dataset.awardId);
        return;
    }

    const projectTrigger = event.target.closest('[data-project-id]');
    if (projectTrigger) {
        event.preventDefault();
        openProjectModal(projectTrigger.dataset.projectId);
        return;
    }

    const seminarTrigger = event.target.closest('[data-seminar-id]');
    if (seminarTrigger) {
        event.preventDefault();
        openSeminarModal(seminarTrigger.dataset.seminarId);
        return;
    }

    const certificateTrigger = event.target.closest('[data-certificate-id]');
    if (certificateTrigger) {
        event.preventDefault();
        openCertificateModal(certificateTrigger.dataset.certificateId);
    }
}

function handleDelegatedActionKeydown(event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (!(event.target instanceof Element)) return;

    const actionTrigger = event.target.closest('[data-close-modal], [data-close-zoom], [data-image-zoom-src], [data-award-id], [data-project-id], [data-certificate-id], [data-seminar-id]');
    if (!actionTrigger) return;

    event.preventDefault();
    actionTrigger.click();
}

/**
 * Escape a string for safe use inside HTML attributes / text.
 */
function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Convert a news type into a CSS-safe modifier class (e.g. "Software Release" -> "software-release").
 */
function newsTypeClass(type) {
    return (type || '').toLowerCase().replace(/\s+/g, '-');
}

// How many of the latest news entries are shown as home-page highlight cards;
// everything after them is listed in the home News accordion.
const HIGHLIGHT_COUNT = 4;

/**
 * News entries, newest first. Dates are "YYYY/MM" or "YYYY"; a bare year sorts
 * after the dated months of that year, and ties keep their order in news.json.
 */
function sortedNews() {
    const key = item => {
        const [year, month] = String(item.date || '').split('/');
        return (Number(year) || 0) * 100 + (Number(month) || 0);
    };
    return (Array.isArray(newsData) ? newsData : [])
        .map((item, index) => ({ item, index }))
        .sort((a, b) => key(b.item) - key(a.item) || a.index - b.index)
        .map(entry => entry.item);
}

/**
 * Render the home News accordion: every news entry after the highlights.
 */
function renderNewsList() {
    const accordion = document.getElementById('news-accordion');
    if (!accordion) return;

    const items = sortedNews().slice(HIGHLIGHT_COUNT);
    const section = document.getElementById('home-news');
    if (section) section.hidden = items.length === 0;

    accordion.innerHTML = items.map((item, index) => {
        const typeClass = newsTypeClass(item.type);
        const panelId = `news-detail-${item.id ?? index}`;
        const summary = item.summary ? `<span class="news-card-summary">${escapeHtml(item.summary)}</span>` : '';

        // Software items can reuse the picture + description from the Software tab.
        const software = item.softwareId ? getSoftwareInfo(item.softwareId) : { detail: '', image: null, alt: '' };

        let mediaImages = Array.isArray(item.images) ? item.images.slice() : [];
        if (mediaImages.length === 0 && software.image) {
            mediaImages = [{ src: software.image, alt: software.alt }];
        }

        // A live LinkedIn post embed (from the post's "Embed this post" URL) takes
        // precedence over static images; it renders the real post, image and all.
        const embed = item.embedUrl
            ? `<div class="news-embed">
                <iframe src="${escapeHtml(item.embedUrl)}" title="Embedded LinkedIn post"
                    frameborder="0" allowfullscreen loading="lazy"></iframe>
               </div>`
            : '';

        const images = (!embed && mediaImages.length)
            ? `<div class="news-media-grid">
                ${mediaImages.map(img => `
                    <figure class="news-media">
                        <img src="${escapeHtml(img.src)}" alt="${escapeHtml(img.alt)}" loading="lazy">
                        ${img.caption ? `<figcaption>${escapeHtml(img.caption)}</figcaption>` : ''}
                    </figure>
                `).join('')}
            </div>`
            : '';

        const detailBody = item.details || software.detail || '';
        const detailsText = detailBody ? `<p class="news-detail-text">${escapeHtml(detailBody)}</p>` : '';

        const { attrs: linkAttrs, cta } = resolveHighlightLink(item);
        const isExternal = /^https?:/i.test(item.link || '');
        const link = linkAttrs
            ? `<a class="news-detail-link" ${linkAttrs}>
                <i class="fas ${isExternal ? 'fa-external-link-alt' : 'fa-arrow-right'}"></i> ${escapeHtml(cta)}
            </a>`
            : '';

        return `
            <article class="news-card news-type-${typeClass}">
                <button type="button" class="news-toggle" data-news-toggle aria-expanded="false" aria-controls="${panelId}">
                    <span class="news-date">${escapeHtml(item.date)}</span>
                    <i class="${escapeHtml(item.icon)} news-icon"></i>
                    <span class="news-card-heading">
                        <span class="news-card-title"><strong>${escapeHtml(item.type)}:</strong> ${escapeHtml(item.title)}</span>
                        ${summary}
                    </span>
                    <i class="fas fa-chevron-down news-chevron" aria-hidden="true"></i>
                </button>
                <div class="news-detail" id="${panelId}" role="region">
                    <div class="news-detail-inner">
                        ${detailsText}
                        ${embed}
                        ${images}
                        ${link}
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

/**
 * Toggle a single news card open/closed.
 * @param {HTMLElement} toggleBtn - The clicked .news-toggle button
 */
function toggleNewsCard(toggleBtn) {
    const card = toggleBtn.closest('.news-card');
    if (!card) return;
    const isOpen = card.classList.toggle('open');
    toggleBtn.setAttribute('aria-expanded', String(isOpen));
}

/**
 * Expand or collapse all news cards and sync the master toggle label.
 * @param {HTMLElement} toggleAllBtn - The .news-toggle-all button
 */
function toggleAllNewsCards(toggleAllBtn) {
    const accordion = document.getElementById('news-accordion');
    if (!accordion) return;

    const expand = toggleAllBtn.getAttribute('aria-expanded') !== 'true';
    accordion.querySelectorAll('.news-card').forEach(card => {
        card.classList.toggle('open', expand);
        const btn = card.querySelector('.news-toggle');
        if (btn) btn.setAttribute('aria-expanded', String(expand));
    });

    toggleAllBtn.setAttribute('aria-expanded', String(expand));
    toggleAllBtn.innerHTML = expand
        ? '<i class="fas fa-chevron-up"></i> Collapse all'
        : '<i class="fas fa-chevron-down"></i> Show all';
}

/**
 * Look up a software tool from softwareData by id.
 * @param {string} id - The research theme id (e.g. "quantum-sensing")
 */
function getSoftwareTool(id) {
    return (Array.isArray(softwareData) ? softwareData : []).find(t => t.id === id) || null;
}

/**
 * Pull the preview image and description for a software tool by id.
 * Lets highlights/news reuse the picture + text of a theme in data/research.json.
 * @param {string} id - The research theme id (e.g. "quantum-sensing")
 * @returns {{detail: string, image: string|null, alt: string}}
 */
function getSoftwareInfo(id) {
    const tool = getSoftwareTool(id);
    if (!tool) return { detail: '', image: null, alt: '' };
    return {
        detail: tool.description || '',
        image: tool.previewImage || null,
        alt: tool.title || ''
    };
}

// Where a news entry links when it sets no "link" of its own, by its "type".
const NEWS_TYPE_LINKS = {
    Publication: ['#publications', 'View Publications'],
    Patent: ['#publications', 'View Patents'],
    Award: ['#certifications', 'View Awards'],
    Talk: ['#activities', 'View Activities'],
    Recognition: ['#experience', 'View Experience'],
    PhD: ['#education', 'View Education']
};

/**
 * Build the href/target attributes and CTA label for a highlight/news link.
 * Supports external URLs (http...) and internal tab links (#research); an
 * entry without a link falls back to the tab for its type, or to no link.
 */
function resolveHighlightLink(item) {
    if (item.link && /^https?:/i.test(item.link)) {
        return { attrs: `href="${escapeHtml(item.link)}" target="_blank" rel="noopener"`, cta: item.linkLabel || 'Learn more' };
    }
    const [href, label] = item.link && item.link.startsWith('#')
        ? [item.link, item.linkLabel || 'View']
        : NEWS_TYPE_LINKS[item.type] || [];
    if (!href) return { attrs: '', cta: '' };
    return { attrs: `href="${escapeHtml(href)}" data-tab="${escapeHtml(href.slice(1))}"`, cta: label };
}

/**
 * Render the home Highlights cards: the HIGHLIGHT_COUNT latest news entries.
 * Software items (with a softwareId) reuse the picture and description from
 * data/research.json.
 */
function renderHighlights() {
    const container = document.getElementById('highlights-container');
    if (!container) return;

    const items = sortedNews().slice(0, HIGHLIGHT_COUNT);
    if (items.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = items.map(item => {
        const typeClass = newsTypeClass(item.type);
        const software = item.softwareId ? getSoftwareInfo(item.softwareId) : { detail: '', image: null, alt: '' };

        const detail = item.summary || item.details || software.detail || '';
        const firstImage = Array.isArray(item.images) && item.images[0];
        const imgSrc = (firstImage && firstImage.src) || software.image || '';
        const imgAlt = (firstImage && firstImage.alt) || software.alt || item.title || '';

        const { attrs, cta } = resolveHighlightLink(item);

        const image = imgSrc
            ? `<span class="highlight-thumb">
                <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(imgAlt)}" loading="lazy">
               </span>`
            : '';

        return `
            <${attrs ? 'a' : 'div'} class="highlight-card news-type-${typeClass}" ${attrs}>
                ${image}
                <span class="highlight-body">
                    <span class="highlight-type">
                        <i class="${escapeHtml(item.icon || 'fas fa-newspaper')} news-icon"></i> ${escapeHtml(item.type)}
                        <span class="highlight-date">${escapeHtml(item.date)}</span>
                    </span>
                    <span class="highlight-card-title">${escapeHtml(item.title)}</span>
                    ${detail ? `<span class="highlight-card-detail">${escapeHtml(detail)}</span>` : ''}
                    ${cta ? `<span class="highlight-cta">${escapeHtml(cta)} <i class="fas fa-arrow-right"></i></span>` : ''}
                </span>
            </${attrs ? 'a' : 'div'}>
        `;
    }).join('');
}

// ==========================================================================
// Award Certificate Functions
// ==========================================================================

/**
 * Open award certificate modal with detailed information
 * @param {string} awardId - ID of the award
 */
function openAwardCertificate(awardId) {
    const modal = document.getElementById('awardCertificateModal');
    const content = document.getElementById('awardCertificateModalContent');
    
    // Award certificate data, keyed by an award element's data-award-id.
    // Add an entry (title, issuer, event, years, image, description, details,
    // verification) to make an award card open its certificate.
    const awardCertificates = {};
    
    const award = awardCertificates[awardId];
    if (!award) return;
    
    content.innerHTML = `
        <h2 style="color: var(--text-primary); margin-bottom: 20px; text-align: center;">
            <i class="fas fa-medal" style="color: #f39c12; margin-right: 10px;"></i>
            ${award.title}
        </h2>
        
        <div style="text-align: center; margin: 30px 0;">
            <div class="award-certificate-image-frame" style="position: relative; display: inline-block;">
                <img src="${award.image}" alt="${award.title}" class="modal-award-image"
                     data-image-zoom-src="${award.image}" data-image-zoom-alt="${award.title}"
                     data-fallback-icon="fas fa-scroll">
                <div style="position: absolute; bottom: -10px; right: -10px; 
                           background: var(--secondary-color); color: white; border-radius: 50%; 
                           width: 40px; height: 40px; display: flex; align-items: center; 
                           justify-content: center; box-shadow: 0 4px 12px rgba(var(--secondary-color-rgb),0.4);">
                    <i class="fas fa-search-plus"></i>
                </div>
            </div>
            <p style="font-size: 0.9em; color: var(--text-muted); margin-top: 15px; font-style: italic;">
                <i class="fas fa-mouse-pointer"></i> Click image to view full size
            </p>
        </div>
        
        <div style="background: var(--bg-tertiary); 
                    padding: 25px; border-radius: var(--radius-md); margin: 25px 0; 
                    border: 1px solid var(--border-color);">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
                        gap: 15px; margin-bottom: 15px;">
                <div>
                    <strong style="color: var(--text-primary);">Issued by:</strong><br>
                    <span style="color: var(--text-secondary);">${award.issuer}</span>
                </div>
                <div>
                    <strong style="color: var(--text-primary);">Event:</strong><br>
                    <span style="color: var(--text-secondary);">${award.event}</span>
                </div>
                <div>
                    <strong style="color: var(--text-primary);">Years:</strong><br>
                    <span style="color: var(--text-secondary);">${award.years.join(', ')}</span>
                </div>
            </div>
            <div>
                <strong style="color: var(--text-primary);">Description:</strong><br>
                <p style="margin: 10px 0 0 0; color: var(--text-secondary); line-height: 1.6;">${award.description}</p>
            </div>
        </div>
        
        ${award.details ? `
            <div style="margin: 25px 0;">
                <h4 style="color: var(--text-primary); margin-bottom: 15px; font-size: 1.2em;">
                    <i class="fas fa-star"></i> Achievement Highlights
                </h4>
                <ul style="list-style: none; padding: 0;">
                    ${award.details.map(detail => `
                        <li style="margin-bottom: 12px; padding: 12px 15px; 
                                   background: var(--bg-tertiary); 
                                   border-left: 4px solid var(--secondary-color); border-radius: var(--radius-xs);">
                            <i class="fas fa-check-circle" style="color: var(--success-color); margin-right: 10px;"></i>
                            ${detail}
                        </li>
                    `).join('')}
                </ul>
            </div>
        ` : ''}
        
        <div style="text-align: center; margin-top: 30px; padding: 20px; 
                    background: var(--bg-tertiary); border-radius: var(--radius-md); 
                    border: 1px solid var(--success-color);">
            <i class="fas fa-shield-alt" style="color: var(--success-color); font-size: 1.5em; margin-bottom: 10px;"></i>
            <p style="margin: 0; color: var(--success-color); font-weight: 600;">
                ${award.verification}
            </p>
        </div>
    `;
    attachImageFallbacks(content);
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// ==========================================================================
// Global Variables and Configuration
// ==========================================================================

const CONFIG = {
    animationDuration: 350,
    scrollOffset: 100,
    headerHeight: 80,
    staggerDelay: 60,
    observerThreshold: 0.1,
    debounceDelay: 150
};

const VALID_TABS = ['home', 'education', 'experience', 'publications', 'projects', 'skills', 'research', 'certifications', 'activities', 'contact'];

// Measure the fixed header and expose it as --header-height so the page content
// (tab covers) starts exactly where the header ends, with no gap in between.
function syncHeaderHeight() {
    const header = document.querySelector('.header-wrapper');
    if (!header) return;

    const height = header.offsetHeight;
    if (!height) return;

    CONFIG.headerHeight = height;
    document.documentElement.style.setProperty('--header-height', `${height}px`);
}

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Utility function for throttling
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

function attachImageFallbacks(root = document) {
    root.querySelectorAll('img[data-fallback-icon]').forEach(img => {
        img.addEventListener('error', () => {
            const fallbackIcon = img.dataset.fallbackIcon || 'fas fa-image';
            const icon = document.createElement('i');

            icon.className = `${fallbackIcon} skill-logo-icon`;
            icon.setAttribute('aria-hidden', 'true');
            img.replaceWith(icon);
        }, { once: true });
    });
}

function isImageIcon(icon) {
    return /^https?:\/\//i.test(icon) || /\.(?:svg|png|jpe?g|webp)(?:$|\?)/i.test(icon);
}

function renderSkillIcon(skill) {
    if (!skill.icon) return '';

    if (isImageIcon(skill.icon)) {
        return `<img src="${skill.icon}" alt="${skill.name} logo" class="skill-logo" loading="lazy" data-fallback-icon="fas fa-tools">`;
    }

    return `<i class="${skill.icon} skill-logo-icon" aria-hidden="true"></i>`;
}

// Data containers - will be populated from JSON files
let experienceData = [];
// Shared organization records (data/experience.json -> "organizations"), keyed
// by the "group" id an experience item points at. Roles held at the same
// organization are rendered as one card with a timeline of roles inside it.
let experienceOrganizations = {};
// Teaching (data/experience.json -> "teaching"), shown in its own section
// under the timeline.
let teachingData = null;
let publicationsData = {};
let projectsData = [];
let certificatesData = {};
let seminarsData = [];
let skillsData = {};
let newsData = [];
let softwareData = [];
let collaborationsData = null;
let scholarData = null;

// ==========================================================================
// Data Loading Functions
// ==========================================================================

/**
 * Load all data from JSON files
 */
async function loadDataFromJSON() {
    const loadingPromises = [
        loadPublicationsData(),
        loadProjectsData(),
        loadExperienceData(),
        loadSkillsData(),
        loadCertificatesData(),
        loadSeminarsData(),
        loadNewsData(),
        loadSoftwareData(),
        loadCollaborationsData(),
        loadScholarData()
    ];

    try {
        await Promise.all(loadingPromises);
        console.log('All data loaded successfully from JSON files');
    } catch (error) {
        console.error('Error loading some JSON files:', error);
    }
}

/**
 * Load publications data from JSON
 */
async function loadPublicationsData() {
    try {
        const response = await fetch('data/publications.json');
        if (response.ok) {
            publicationsData = await response.json();
            console.log('✅ Publications data loaded successfully');
        } else {
            console.error('❌ Could not load publications.json');
            publicationsData = {};
        }
    } catch (error) {
        console.error('❌ Error loading publications.json:', error);
        publicationsData = {};
    }
}

/**
 * Load collaboration network data from JSON
 */
async function loadCollaborationsData() {
    try {
        const response = await fetch('data/collaborations.json');
        if (response.ok) {
            collaborationsData = await response.json();
            console.log('✅ Collaborations data loaded successfully');
        } else {
            console.error('❌ Could not load collaborations.json');
            collaborationsData = null;
        }
    } catch (error) {
        console.error('❌ Error loading collaborations.json:', error);
        collaborationsData = null;
    }
}

// ==========================================================================
// Google Scholar Metrics
// ==========================================================================
//
// The numbers live in data/scholar.json, which .github/workflows/update-scholar.yml
// rewrites from the live profile every 5 hours. Reading them
// from the repo instead of scraping in the browser means every visitor sees the
// same figures on the first paint - incognito windows and first-time readers
// included - with no dependency on per-browser storage.

// The card stays hidden until data/scholar.json holds valid metrics.
const SCHOLAR_ID = 'CyVQHYEAAAAJ';
const SCHOLAR_PROFILE_URL = SCHOLAR_ID
    ? 'https://scholar.google.com/citations?user=' + SCHOLAR_ID + '&hl=en'
    : '#';
const SCHOLAR_REFRESH_MS = 5 * 60 * 60 * 1000; // matches the workflow schedule
const SCHOLAR_MIN_RECHECK_MS = 30 * 60 * 1000; // floor for focus-triggered checks
const SCHOLAR_FETCH_TIMEOUT_MS = 12000;

let scholarLastFetchAt = 0;
let scholarFetchInFlight = false;

/**
 * Read the committed metrics file. Cache-busted and sent with no-store so a
 * long-lived CDN or browser copy can never pin the card to yesterday's numbers.
 * Returns the parsed object, or null when the file is unreachable or unusable.
 */
async function fetchScholarFile() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SCHOLAR_FETCH_TIMEOUT_MS);
    try {
        const response = await fetch('data/scholar.json?v=' + Date.now(), {
            cache: 'no-store',
            signal: controller.signal
        });
        if (!response.ok) return null;

        const data = await response.json();
        return isValidScholarMetrics(data) ? data : null;
    } catch (error) {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Load Google Scholar metrics for the first paint.
 */
async function loadScholarData() {
    // Older builds kept a private copy of the metrics per browser, which is
    // exactly what made one window disagree with the next. Clear it out.
    try {
        localStorage.removeItem('scholarMetrics.v1');
    } catch (error) {
        /* Storage disabled - nothing to clean up. */
    }

    const data = await fetchScholarFile();
    if (data) {
        scholarData = data;
        scholarLastFetchAt = Date.now();
        console.log('✅ Scholar metrics loaded');
    } else {
        console.error('❌ Could not load scholar.json');
    }
}

/**
 * Populate the Google Scholar metrics card from scholarData.
 */
function renderScholarMetrics() {
    const card = document.getElementById('scholar-metrics');
    if (!card || !scholarData) return;

    const fields = ['citations', 'hIndex', 'i10Index'];
    fields.forEach((key) => {
        const el = card.querySelector('[data-scholar="' + key + '"]');
        const value = scholarData[key];
        if (el && (typeof value === 'number' || typeof value === 'string')) {
            el.textContent = Number(value).toLocaleString();
        }
    });

    card.setAttribute('href', scholarData.profileUrl || SCHOLAR_PROFILE_URL);
    if (scholarData.updated) {
        card.setAttribute('title', 'Google Scholar, last updated ' + scholarData.updated);
    }
    card.classList.remove('is-loading');
    card.hidden = false;
}

/**
 * Title as a comparison key: lower case, letters and digits only, so
 * "Quantum Full-Duplex Communication" and "Quantum full-duplex communication"
 * are the same paper.
 */
function scholarTitleKey(title) {
    return String(title || '').toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]/g, '');
}

/**
 * Google Scholar citations for one paper, from the per-paper list in
 * data/scholar.json. Scholar sometimes keeps a duplicate entry whose title
 * runs on past the real one (e.g. "...: U. Khalid et al."), so entries that
 * extend a long-enough title count too, and their citations are summed.
 * Returns { citations, url } or null when the paper is not on the profile.
 */
function scholarCitationsFor(key) {
    const papers = scholarData && Array.isArray(scholarData.papers) ? scholarData.papers : [];
    if (!key || papers.length === 0) return null;

    const matches = papers.filter((paper) => {
        const paperKey = scholarTitleKey(paper.title);
        return paperKey === key || (key.length >= 30 && paperKey.startsWith(key));
    });
    if (matches.length === 0) return null;

    const best = matches.reduce((a, b) => ((b.citations || 0) > (a.citations || 0) ? b : a));
    return {
        citations: matches.reduce((sum, paper) => sum + (Number(paper.citations) || 0), 0),
        url: best.url || scholarData.profileUrl || SCHOLAR_PROFILE_URL
    };
}

/**
 * The Google Scholar badge for a publication: the Scholar icon and its
 * citation count, linking to the paper's "Cited by" list. Empty for items
 * Scholar does not index (patents, unlisted papers).
 */
function scholarCitationBadge(pub) {
    const key = scholarTitleKey(pub.title);
    const hit = scholarCitationsFor(key);
    if (!hit) return '';
    const label = scholarCitationLabel(hit.citations);
    return `<a href="${escapeHtml(hit.url)}" class="pub-badge scholar-cites" target="_blank" rel="noopener"
        data-scholar-key="${key}" title="${label}" aria-label="${label}">
        <i class="ai ai-google-scholar" aria-hidden="true"></i><span class="scholar-cites-count">${hit.citations}</span>
    </a>`;
}

function scholarCitationLabel(citations) {
    return `Cited by ${citations} on Google Scholar`;
}

/**
 * Bring already-rendered Scholar badges in line with a refreshed scholarData,
 * without re-rendering the publication list under the reader.
 */
function updateScholarCitationBadges() {
    document.querySelectorAll('.scholar-cites[data-scholar-key]').forEach((badge) => {
        const hit = scholarCitationsFor(badge.dataset.scholarKey);
        if (!hit) return;
        const count = badge.querySelector('.scholar-cites-count');
        if (count) count.textContent = hit.citations;
        badge.setAttribute('href', hit.url);
        badge.title = scholarCitationLabel(hit.citations);
        badge.setAttribute('aria-label', badge.title);
    });
}

/**
 * Sanity-check a metrics object before it is rendered, so a half-written or
 * malformed file can never overwrite good numbers.
 */
function isValidScholarMetrics(metrics) {
    if (!metrics) return false;

    const values = [metrics.citations, metrics.hIndex, metrics.i10Index];
    const allSane = values.every((v) => Number.isInteger(v) && v >= 0 && v < 1000000);
    if (!allSane) return false;

    // Both indices are bounded by the citation count. (i10-index can exceed
    // the h-index, e.g. h = 16 with i10 = 20, so the two are not compared.)
    return metrics.citations >= metrics.hIndex
        && metrics.citations >= metrics.i10Index
        && metrics.citations > 0;
}

/**
 * Re-read the published metrics and repaint the card if they moved.
 * Runs in the background - the card keeps showing the current figures either
 * way, so a failed check is invisible to the reader.
 */
async function refreshScholarMetrics(force) {
    if (scholarFetchInFlight) return;
    if (!force && Date.now() - scholarLastFetchAt < SCHOLAR_MIN_RECHECK_MS) return;

    scholarFetchInFlight = true;
    let data = null;
    try {
        data = await fetchScholarFile();
    } finally {
        scholarFetchInFlight = false;
    }

    if (!data) {
        console.warn('⚠️ Scholar metrics re-check failed, keeping the current numbers');
        return;
    }

    scholarLastFetchAt = Date.now();
    const changed = !scholarData
        || scholarData.citations !== data.citations
        || scholarData.hIndex !== data.hIndex
        || scholarData.i10Index !== data.i10Index
        || JSON.stringify(scholarData.papers || []) !== JSON.stringify(data.papers || []);

    scholarData = data;
    renderScholarMetrics();
    if (changed) {
        updateScholarCitationBadges();
        console.log('✅ Scholar metrics refreshed');
    }
}

/**
 * Keep a tab that stays open for days in step with the 5-hourly workflow:
 * re-check on the same cadence, and whenever a long-idle tab comes back to the
 * foreground (a laptop that was asleep gets no timer ticks).
 */
function initializeScholarAutoRefresh() {
    setInterval(() => refreshScholarMetrics(true), SCHOLAR_REFRESH_MS);

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            refreshScholarMetrics();
        }
    });
}

/**
 * Load projects data from JSON
 */
async function loadProjectsData() {
    try {
        const response = await fetch('data/projects.json');
        if (response.ok) {
            const projectsJSON = await response.json();
            projectsData = projectsJSON.research_projects || [];
            console.log('✅ Projects data loaded successfully');
        } else {
            console.error('❌ Could not load projects.json');
            projectsData = [];
        }
    } catch (error) {
        console.error('❌ Error loading projects.json:', error);
        projectsData = [];
    }
}

/**
 * Load experience data from JSON
 */
async function loadExperienceData() {
    try {
        const response = await fetch('data/experience.json');
        if (response.ok) {
            const experienceJSON = await response.json();
            experienceOrganizations = experienceJSON.organizations || {};
            teachingData = experienceJSON.teaching || null;
            experienceData = [
                ...(experienceJSON.academic_experience || []),
                ...(experienceJSON.industry_experience || [])
            ];
            console.log('✅ Experience data loaded successfully');
        } else {
            console.error('❌ Could not load experience.json');
            experienceData = [];
        }
    } catch (error) {
        console.error('❌ Error loading experience.json:', error);
        experienceData = [];
    }
}

/**
 * Load skills data from JSON
 */
async function loadSkillsData() {
    try {
        const response = await fetch('data/skills.json');
        if (response.ok) {
            skillsData = await response.json();
            console.log('✅ Skills data loaded successfully');
        } else {
            console.error('❌ Could not load skills.json');
            skillsData = {};
        }
    } catch (error) {
        console.error('❌ Error loading skills.json:', error);
        skillsData = {};
    }
}

/**
 * Load certificates data from JSON
 */
async function loadCertificatesData() {
    try {
        const response = await fetch('data/certificates.json');
        if (response.ok) {
            certificatesData = await response.json();
            console.log('✅ Certificates data loaded successfully');
        } else {
            console.error('❌ Could not load certificates.json');
            certificatesData = { awards: [], certifications: [] };
        }
    } catch (error) {
        console.error('❌ Error loading certificates.json:', error);
        certificatesData = { awards: [], certifications: [] };
    }
}

/**
 * Load seminars & presentations data from JSON
 */
async function loadSeminarsData() {
    try {
        const response = await fetch('data/seminars.json');
        if (response.ok) {
            const data = await response.json();
            seminarsData = data.seminars || [];
            console.log('✅ Seminars data loaded successfully');
        } else {
            console.error('❌ Could not load seminars.json');
            seminarsData = [];
        }
    } catch (error) {
        console.error('❌ Error loading seminars.json:', error);
        seminarsData = [];
    }
}

/**
 * Load news data from JSON
 */
async function loadNewsData() {
    try {
        const response = await fetch('data/news.json');
        if (response.ok) {
            newsData = await response.json();
            console.log('✅ News data loaded successfully');
        } else {
            console.error('❌ Could not load news.json');
            newsData = [];
        }
    } catch (error) {
        console.error('❌ Error loading news.json:', error);
        newsData = [];
    }
}


/**
 * Load the Research tab themes from JSON. They render through the same
 * nav + sections components the template used for software tools.
 */
async function loadSoftwareData() {
    try {
        const response = await fetch('data/research.json');
        if (response.ok) {
            const json = await response.json();
            softwareData = json.themes || json.tools || [];
            console.log('✅ Research data loaded successfully');
        } else {
            console.error('❌ Could not load research.json');
            softwareData = [];
        }
    } catch (error) {
        console.error('❌ Error loading research.json:', error);
        softwareData = [];
    }
}

// ==========================================================================
// Navigation Functions with Tab Persistence
// ==========================================================================

const PAGE_METADATA = {
    home: {
        title: 'Dr. Uman Khalid | Research Professor, Kyung Hee University',
        description: 'Dr. Uman Khalid, Research Professor at Kyung Hee University, Korea: quantum sensing, quantum communication and networking, and quantum machine learning for 6G. 26 journal papers, 6 granted patents, and 5 patent applications.'
    },
    education: {
        title: 'Education - Uman Khalid',
        description: 'Academic background of Uman Khalid: Ph.D. in Electronics and Information Convergence Engineering from Kyung Hee University and Bachelor of Electronics Engineering from the Ghulam Ishaq Khan Institute of Engineering and Technology.'
    },
    experience: {
        title: 'Experience - Uman Khalid',
        description: 'Academic appointments of Uman Khalid at Kyung Hee University, including Research Professor, BK21 Research Professor, and Postdoctoral Fellow, plus visiting positions at Memorial University and teaching experience.'
    },
    publications: {
        title: 'Publications - Uman Khalid',
        description: 'Journal papers, conference papers, a book chapter, and patents on quantum sensing, quantum networking, quantum semantic communication, quantum machine learning, and quantum optimization.'
    },
    projects: {
        title: 'Research Projects - Uman Khalid',
        description: 'Funded research projects from the National Research Foundation of Korea and IITP on quantum communication, quantum sensing, quantum networking, and 6G.'
    },
    skills: {
        title: 'Skills - Uman Khalid',
        description: 'Expertise in quantum information science, variational quantum algorithms, quantum machine learning, deep learning, and wireless communication systems.'
    },
    research: {
        title: 'Research - Uman Khalid',
        description: 'Research themes of Uman Khalid: quantum sensing and metrology, quantum networking, quantum semantic communication, quantum-enhanced AI for 6G, and quantum optimization for intelligent transportation.'
    },
    certifications: {
        title: 'Awards and Certifications - Uman Khalid',
        description: 'Best paper awards, scholarships, honors, and professional certifications of Uman Khalid.'
    },
    activities: {
        title: 'Academic Activities - Uman Khalid',
        description: 'Editorial service, technical program committees, peer review, invited talks, and the co-authorship network of Uman Khalid.'
    },
    contact: {
        title: 'Contact - Uman Khalid',
        description: 'Contact Uman Khalid at Kyung Hee University for research collaboration in quantum information science and communications.'
    }
};

const SITE_URL = 'https://umankhalid.github.io/';

function updateMetaContent(selector, value) {
    const element = document.querySelector(selector);
    if (element && value) {
        element.setAttribute('content', value);
    }
}

function updatePageMetadata(tabName, fallbackSectionTitle) {
    const metadata = PAGE_METADATA[tabName] || {
        title: `Uman Khalid - ${fallbackSectionTitle}`,
        description: PAGE_METADATA.home.description
    };
    const pageUrl = tabName === 'home'
        ? SITE_URL
        : `${SITE_URL}#${tabName}`;

    document.title = metadata.title;
    updateMetaContent('meta[name="description"]', metadata.description);
    updateMetaContent('meta[property="og:title"]', metadata.title);
    updateMetaContent('meta[property="og:description"]', metadata.description);
    updateMetaContent('meta[property="og:url"]', pageUrl);
    updateMetaContent('meta[name="twitter:title"]', metadata.title);
    updateMetaContent('meta[name="twitter:description"]', metadata.description);
}

/**
 * Get current tab from URL hash or default to 'home'
 */
function getCurrentTab() {
    const hash = window.location.hash.slice(1);
    return VALID_TABS.includes(hash) ? hash : 'home';
}

/**
 * Set URL hash for tab persistence
 * @param {string} tabName - Name of the tab
 */
function setCurrentTab(tabName) {
    window.location.hash = tabName;
}

/**
 * Show specific tab and hide others
 * @param {string} tabName - Name of the tab to show
 */
function showTab(tabName) {
    // Close mobile menu when switching tabs
    closeMobileMenuOnNavClick();
    
    // Remove active class from all tabs first
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class and aria-current from all nav buttons
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        btn.classList.remove('active');
        btn.removeAttribute('aria-current');
    });
    
    // Show selected tab immediately for smooth transition
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        // Use requestAnimationFrame for smooth rendering
        requestAnimationFrame(() => {
            selectedTab.classList.add('active');
            // Trigger animations for elements in the tab
            animateTabContent(selectedTab);
        });
    }
    
    // Add active class and aria-current to corresponding nav button
    const navBtn = document.querySelector(`.nav-btn[data-tab="${tabName}"]`);
    if (navBtn) {
        navBtn.classList.add('active');
        navBtn.setAttribute('aria-current', 'page');
    }
    
    // Update document title and URL hash
    const titleMap = {
        home: 'Home',
        education: 'Education',
        experience: 'Experience',
        publications: 'Publications',
        projects: 'Projects',
        skills: 'Skills',
        research: 'Research',
        certifications: 'Awards & Certifications',
        activities: 'Activities',
        contact: 'Contact'
    };
    
    const sectionTitle = titleMap[tabName] || 'Portfolio';
    updatePageMetadata(tabName, sectionTitle);
    
    // Update URL hash for persistence
    setCurrentTab(tabName);
    if (location.hash !== `#${tabName}`) {
        history.replaceState(null, '', `#${tabName}`);
    }
    
    // Load dynamic content if needed
    loadTabContent(tabName);
    
    // Reinitialize map when contact tab is shown
    if (tabName === 'contact' && mapInstance) {
        setTimeout(() => {
            mapInstance.invalidateSize();
            mapInstance.setView([37.239613, 127.083422], 18);
        }, 100);
    }
    
    // Smooth scroll to top
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

/**
 * Animate content elements when tab is shown using Intersection Observer
 * @param {HTMLElement} tabElement - The tab element to animate
 */
function animateTabContent(tabElement) {
    const animatableElements = tabElement.querySelectorAll('.publication-item, .project-card, .experience-item, .certificate-card, .skill-category, .research-card, .award-item, .activity-item, .seminar-item, .news-bullet-item, .news-card, .highlight-card');
    
    // Use Intersection Observer for better performance
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                const el = entry.target;
                el.style.transition = `opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.05}s, transform 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.05}s`;
                el.style.opacity = '1';
                el.style.transform = 'translateY(0) scale(1)';
                observer.unobserve(el);
            }
        });
    }, { threshold: CONFIG.observerThreshold, rootMargin: '0px 0px -50px 0px' });
    
    animatableElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px) scale(0.98)';
        observer.observe(el);
    });
}

/**
 * Initialize tab from URL hash on page load
 */
function initializeTabFromHash() {
    const currentTab = getCurrentTab();
    showTab(currentTab);
}

/**
 * Load dynamic content for specific tabs
 * @param {string} tabName - Name of the tab
 */
function loadTabContent(tabName) {
    switch (tabName) {
        case 'experience':
            loadExperienceContent();
            break;
        case 'skills':
            loadSkillsContent();
            break;
        case 'publications':
            loadPublicationsContent();
            loadPublicationStats();
            break;
        case 'projects':
            loadProjectsContent();
            break;
        case 'certifications':
            loadCertificatesContent();
            break;
        case 'research':
            initializeSoftwareTools();
            break;
        case 'activities':
            loadSeminarsContent();
            initCollaborationNetwork();
            break;
        case 'contact':
            initializeMap();
            initializeContactAnimations();
            initializeActionButtons();
            
            // Wire the copy buttons on the contact cards and address panel
            initializeCopyButtons();
            break;
    }
}

// ==========================================================================
// Skills Functions
// ==========================================================================

/**
 * Proficiency ladder, low to high. A skill's position on this ladder is the
 * only thing the UI shows; the older percentage bars implied a precision
 * (85 vs 80) that the underlying judgement does not have.
 */
const SKILL_LEVELS = ['Basic', 'Intermediate', 'Advanced', 'Expert'];

/**
 * Map a level string to its 1-based rung, or 0 when unrecognised.
 * Matching is case-insensitive because the data mixes "Basic" and "basic".
 * @param {string} level
 * @returns {number} 0-4
 */
function skillLevelStep(level) {
    const wanted = String(level || '').trim().toLowerCase();
    const index = SKILL_LEVELS.findIndex(name => name.toLowerCase() === wanted);
    return index === -1 ? 0 : index + 1;
}

/**
 * Render the 4-segment proficiency meter for one skill.
 * Falls back to the raw label with no meter if the level is unrecognised.
 * @param {Object} skill
 * @returns {string} HTML
 */
function renderSkillMeter(skill) {
    const step = skillLevelStep(skill.level);
    if (step === 0) return '';

    const segments = SKILL_LEVELS
        .map((_, i) => `<span class="skill-meter-seg${i < step ? ' is-filled' : ''}"></span>`)
        .join('');

    return `
        <div class="skill-meter" role="img"
             aria-label="${escapeHtml(SKILL_LEVELS[step - 1])}, ${step} out of ${SKILL_LEVELS.length}">
            ${segments}
        </div>
    `;
}

/**
 * Load skills content dynamically
 */
function loadSkillsContent() {
    const skillsContainer = document.getElementById('skills-content');
    if (!skillsContainer) return;
    
    // Clear existing content
    skillsContainer.innerHTML = '';
    
    if (Object.keys(skillsData).length === 0) {
        skillsContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6c757d;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3em; margin-bottom: 20px;"></i>
                <h3>Skills data not available</h3>
                <p>Please ensure skills.json file is present in the data folder.</p>
            </div>
        `;
        return;
    }
    
    const skillsHTML = Object.entries(skillsData).map(([key, category]) => `
        <div class="skill-category">
            <h3><i class="${category.icon}"></i> ${category.title}</h3>
            <div class="skills-grid">
                ${category.skills.map(skill => {
                    const step = skillLevelStep(skill.level);
                    // Normalise casing so "basic" and "Basic" render the same.
                    const levelLabel = step ? SKILL_LEVELS[step - 1] : skill.level;
                    return `
                    <div class="skill-item">
                        <div class="skill-header">
                            <span class="skill-name">
                                ${renderSkillIcon(skill)}
                                <span>${skill.name}</span>
                            </span>
                            <span class="skill-level">${escapeHtml(levelLabel || '')}</span>
                        </div>
                        ${renderSkillMeter(skill)}
                        ${skill.description ? `<div class="skill-description">${skill.description}</div>` : ''}
                    </div>
                `;
                }).join('')}
            </div>
        </div>
    `).join('');
    
    skillsContainer.innerHTML = skillsHTML;
    attachImageFallbacks(skillsContainer);
}

// ==========================================================================
// Publications Functions
// ==========================================================================

/**
 * Load publication statistics and update navigation counts
 */
function loadPublicationStats() {
    const statsContainer = document.getElementById('publication-stats');
    if (!statsContainer) return;
    
    const journalCount = (publicationsData.journals || []).length;
    const conferenceCount = (publicationsData.conferences || []).length;
    const koreanCount = (publicationsData.korean_conferences || publicationsData.korean || []).length;
    const reportCount = (publicationsData.books_patents || []).length;
    const totalCount = journalCount + conferenceCount + koreanCount + reportCount;
    // Sum of the journal impact factors listed in publications.json
    const cumulativeIF = (publicationsData.journals || [])
        .reduce((sum, pub) => sum + (Number(pub.impactFactor) || 0), 0);
    
    // Update main stats display
    statsContainer.innerHTML = `
        <h3>Publication Overview</h3>
        <div class="stats-grid">
            <div class="stat-item">
                <span class="stat-number">${totalCount}</span>
                <span class="stat-label">Total Publications</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${journalCount}</span>
                <span class="stat-label">Journal Articles</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${conferenceCount}</span>
                <span class="stat-label">International Conferences</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${koreanCount}</span>
                <span class="stat-label">Korean Conferences</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${reportCount}</span>
                <span class="stat-label">Book Chapters &amp; Patents</span>
            </div>
        </div>
        <div class="stat-item stat-item-wide">
            <span class="stat-number">${cumulativeIF.toFixed(1)}</span>
            <span class="stat-label">Cumulative Impact Factor</span>
        </div>
    `;
    
    // Update navigation button counts
    updatePublicationNavCounts();
}

// --------------------------------------------------------------------------
// Publication filters (sidebar): type, authorship, year, topic and search
// --------------------------------------------------------------------------

/**
 * The site owner's name as it appears in author lists (see formatAuthors).
 */
const PUB_SELF = 'U. Khalid';

/**
 * Publication types: `tab` is the id of the list each renders into and of
 * its sidebar button; `keys` are the publications.json arrays it reads.
 */
const PUB_TYPES = [
    { tab: 'journals', keys: ['journals'], label: 'International Journals' },
    { tab: 'conferences', keys: ['conferences'], label: 'International Conferences' },
    { tab: 'korean', keys: ['korean_conferences', 'korean'], label: 'Korean Conferences' },
    { tab: 'reports', keys: ['books_patents'], label: 'Book Chapters & Patents' }
];

const PUB_ROLES = [
    { value: 'all', label: 'All' },
    { value: 'first', label: 'First author' },
    { value: 'co', label: 'Co-author' },
    { value: 'corresponding', label: 'Corresponding author' }
];

/**
 * Current selection. Everything is shown by default; within a filter, the
 * chosen topics are alternatives (any of them), and the filters combine.
 */
const pubFilters = { type: 'all', role: 'all', year: 'all', topics: new Set(), query: '' };

function pubTypeList(type) {
    for (const key of type.keys) {
        if (Array.isArray(publicationsData[key])) return publicationsData[key];
    }
    return [];
}

/**
 * Whether the site owner holds an authorship role on a publication.
 * Corresponding authorship isn't implied by author order, so it comes from
 * the data: `"corresponding": true` or a "Corresponding author" badge.
 */
function pubHasRole(pub, role) {
    const authors = Array.isArray(pub.authors) ? pub.authors : [];
    const first = authors.length > 0 && String(authors[0]).includes(PUB_SELF);
    if (role === 'first') return first;
    if (role === 'co') return !first;
    if (role === 'corresponding') {
        return pub.corresponding === true ||
            (Array.isArray(pub.badges) && pub.badges.some(badge => /corresponding/i.test(badge)));
    }
    return true;
}

/**
 * Does a publication pass the current filters? `skip` leaves one filter out,
 * which gives each option the count it would have if chosen.
 */
function pubMatches(pub, skip) {
    if (skip !== 'role' && pubFilters.role !== 'all' && !pubHasRole(pub, pubFilters.role)) return false;
    if (skip !== 'year' && pubFilters.year !== 'all' && String(pub.year) !== pubFilters.year) return false;
    if (skip !== 'topics' && pubFilters.topics.size &&
        !(pub.topics || []).some(topic => pubFilters.topics.has(topic))) return false;
    if (skip !== 'query' && pubFilters.query) {
        const haystack = [pub.title, (pub.authors || []).join(' '), pub.journal, pub.conference, pub.year]
            .filter(Boolean).join(' ').toLowerCase();
        if (!pubFilters.query.split(/\s+/).every(word => haystack.includes(word))) return false;
    }
    return true;
}

function pubFilterCount() {
    return (pubFilters.role !== 'all' ? 1 : 0) + (pubFilters.year !== 'all' ? 1 : 0) +
        pubFilters.topics.size + (pubFilters.query ? 1 : 0);
}

/** Publications of the selected type (or all types). */
function pubScopeItems() {
    return PUB_TYPES
        .filter(type => pubFilters.type === 'all' || type.tab === pubFilters.type)
        .flatMap(pubTypeList);
}

/**
 * Update the type buttons: counts after the filters.
 */
function updatePublicationNavCounts() {
    let total = 0;
    PUB_TYPES.forEach(type => {
        const n = pubTypeList(type).filter(pub => pubMatches(pub)).length;
        total += n;
        const el = document.getElementById(`${type.tab}-count`);
        if (el) el.textContent = n;
    });
    const all = document.getElementById('all-count');
    if (all) all.textContent = total;
}

/**
 * Render the authorship, year and topic filters with live counts for the
 * selected type. Options that would match nothing are disabled.
 */
function renderPublicationFilters() {
    const groups = document.getElementById('pub-filter-groups');
    if (!groups) return;

    // Keep keyboard focus on the same control across the re-render
    const focused = document.activeElement && groups.contains(document.activeElement)
        ? { filter: document.activeElement.dataset.filter, value: document.activeElement.value }
        : null;

    const scope = pubScopeItems();
    const count = (skip, test) => scope.filter(pub => pubMatches(pub, skip) && test(pub)).length;
    const everything = PUB_TYPES.flatMap(pubTypeList);

    const roleOptions = PUB_ROLES.map(role => {
        const n = count('role', pub => pubHasRole(pub, role.value));
        const checked = pubFilters.role === role.value;
        return `
            <label class="pub-option${n || checked ? '' : ' is-disabled'}">
                <input type="radio" name="pub-role" value="${role.value}" data-filter="role"
                    ${checked ? 'checked' : ''} ${n || checked ? '' : 'disabled'}>
                <span class="pub-option-label">${role.label}</span>
                <span class="pub-option-count">${n}</span>
            </label>`;
    }).join('');

    const years = Array.from(new Set(everything.map(pub => String(pub.year)).filter(Boolean)))
        .sort((a, b) => b.localeCompare(a));
    const yearOptions = years.map(year => {
        const n = count('year', pub => String(pub.year) === year);
        const selected = pubFilters.year === year;
        return `<option value="${year}" ${selected ? 'selected' : ''} ${n || selected ? '' : 'disabled'}>${year} (${n})</option>`;
    }).join('');

    // Topics, most common first
    const frequency = {};
    everything.forEach(pub => (pub.topics || []).forEach(topic => {
        frequency[topic] = (frequency[topic] || 0) + 1;
    }));
    const topics = Object.keys(frequency).sort((a, b) => frequency[b] - frequency[a] || a.localeCompare(b));
    const topicOptions = topics.map(topic => {
        const n = count('topics', pub => (pub.topics || []).includes(topic));
        const checked = pubFilters.topics.has(topic);
        return `
            <label class="pub-option${n || checked ? '' : ' is-disabled'}">
                <input type="checkbox" value="${escapeHtml(topic)}" data-filter="topic"
                    ${checked ? 'checked' : ''} ${n || checked ? '' : 'disabled'}>
                <span class="pub-option-label">${escapeHtml(topic)}</span>
                <span class="pub-option-count">${n}</span>
            </label>`;
    }).join('');

    groups.innerHTML = `
        <fieldset class="pub-filter-group">
            <legend>Authorship</legend>
            ${roleOptions}
        </fieldset>
        <div class="pub-filter-group">
            <label class="pub-filter-legend" for="pub-year">Year</label>
            <select id="pub-year" class="pub-year-select" data-filter="year">
                <option value="all" ${pubFilters.year === 'all' ? 'selected' : ''}>All years</option>
                ${yearOptions}
            </select>
        </div>
        ${topics.length ? `
        <fieldset class="pub-filter-group">
            <legend>Topic</legend>
            ${topicOptions}
        </fieldset>` : ''}
    `;

    if (focused && focused.filter) {
        const selector = focused.filter === 'year'
            ? '#pub-year'
            : `[data-filter="${focused.filter}"][value="${CSS.escape(focused.value)}"]`;
        const target = groups.querySelector(selector);
        if (target) target.focus();
    }

    // Reset buttons and the collapsed-panel badge
    const active = pubFilterCount();
    document.querySelectorAll('.pub-filters-head .pub-filter-reset').forEach(btn => { btn.hidden = !active; });
    const badge = document.getElementById('pub-filters-active');
    if (badge) badge.textContent = active ? `${active} active` : '';
}

/**
 * One line above the list: how many publications the filters leave, with a
 * way to clear them. Hidden while nothing is filtered.
 */
function renderPublicationResults() {
    const el = document.getElementById('pub-results');
    if (!el) return;
    if (!pubFilterCount()) {
        el.hidden = true;
        el.innerHTML = '';
        return;
    }
    const scope = pubScopeItems();
    const shown = scope.filter(pub => pubMatches(pub)).length;
    el.innerHTML = shown
        ? `<span>Showing <strong>${shown}</strong> of ${scope.length} publications</span>
           <button type="button" class="pub-filter-reset"><i class="fas fa-xmark"></i> Clear filters</button>`
        : `<span>No publications match these filters.</span>
           <button type="button" class="pub-filter-reset"><i class="fas fa-xmark"></i> Clear filters</button>`;
    el.hidden = false;
}

/**
 * Wire the sidebar filters once. Every change re-renders the lists, counts
 * and filter options.
 */
function initPublicationFilters() {
    const panel = document.getElementById('pub-filters');
    if (!panel || panel.dataset.bound) return;
    panel.dataset.bound = 'true';

    const groups = document.getElementById('pub-filter-groups');
    groups.addEventListener('change', (e) => {
        const input = e.target;
        if (input.dataset.filter === 'role') pubFilters.role = input.value;
        else if (input.dataset.filter === 'year') pubFilters.year = input.value;
        else if (input.dataset.filter === 'topic') {
            if (input.checked) pubFilters.topics.add(input.value);
            else pubFilters.topics.delete(input.value);
        } else return;
        loadPublicationsContent();
    });

    const search = document.getElementById('pub-search');
    if (search) {
        search.addEventListener('input', debounce(() => {
            pubFilters.query = search.value.trim().toLowerCase();
            loadPublicationsContent();
        }, 180));
    }

    // "Clear" buttons live in the sidebar, the results line and empty lists
    const tab = document.getElementById('publications');
    if (tab) {
        tab.addEventListener('click', (e) => {
            if (!e.target.closest('.pub-filter-reset')) return;
            pubFilters.role = 'all';
            pubFilters.year = 'all';
            pubFilters.topics.clear();
            pubFilters.query = '';
            if (search) search.value = '';
            loadPublicationsContent();
        });
    }

    // The panel is always open beside the list on wide screens and starts
    // collapsed under the type strip on narrow ones.
    const wide = window.matchMedia('(min-width: 901px)');
    const syncPanel = () => { panel.open = wide.matches; };
    syncPanel();
    if (wide.addEventListener) wide.addEventListener('change', syncPanel);
}

/**
 * Show one publication type, or every type ('all') in sections.
 * @param {string} pubType - 'all' or a PUB_TYPES tab id
 */
function showPublications(pubType) {
    pubFilters.type = pubType;
    const list = document.getElementById('publications-list');
    if (list) list.classList.toggle('show-all', pubType === 'all');

    document.querySelectorAll('.pub-content').forEach(content => {
        content.classList.toggle('active', pubType === 'all' || content.id === pubType);
    });
    document.querySelectorAll('.pub-btn').forEach(btn => {
        const on = btn.dataset.pub === pubType;
        btn.classList.toggle('active', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    // Option counts are per type
    renderPublicationFilters();
    renderPublicationResults();
}

/**
 * After switching type from the sticky selector deep in a list, bring the
 * new list's first item into view. Does nothing while the list top is
 * already on screen.
 */
function scrollToPublicationListTop() {
    const list = document.getElementById('publications-list');
    if (!list) return;
    const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 66;
    // On narrow screens the selector is a strip stuck under the header
    const sidebar = document.querySelector('.publications-sidebar');
    const strip = sidebar && getComputedStyle(sidebar).position === 'sticky' &&
        sidebar.getBoundingClientRect().width >= list.getBoundingClientRect().width
        ? sidebar.offsetHeight : 0;
    const offset = header + strip + 16;
    const top = list.getBoundingClientRect().top - offset;
    if (top >= 0) return;
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: window.scrollY + top, behavior: reduced ? 'auto' : 'smooth' });
}

/**
 * Items of a list that pass the filters, keeping their original numbers.
 */
function pubVisibleItems(list) {
    return list
        .map((pub, index) => ({ pub, number: index + 1 }))
        .filter(({ pub }) => pubMatches(pub));
}

/**
 * Heading for a type's section, shown when all types are listed together.
 */
function pubSectionTitle(tab, count) {
    const type = PUB_TYPES.find(t => t.tab === tab);
    return `<h3 class="pub-section-title">${type ? type.label : ''}<span class="count-badge">${count}</span></h3>`;
}

/**
 * Render a type's list for the current filters: numbered items, or a note
 * with a way out when the filters leave none (the section is hidden instead
 * when all types are shown together).
 */
function pubRenderList(container, tab, list, renderItem) {
    const visible = pubVisibleItems(list);
    container.classList.toggle('is-empty', !visible.length);
    if (!visible.length) {
        const type = PUB_TYPES.find(t => t.tab === tab);
        container.innerHTML = `
            <div class="pub-filter-empty">
                <p>No ${type ? type.label.toLowerCase() : 'publications'} match these filters.</p>
                <button type="button" class="pub-filter-reset">Clear filters</button>
            </div>`;
        return;
    }
    container.innerHTML = pubSectionTitle(tab, visible.length) +
        visible.map(({ pub, number }) => renderItem(pub, number)).join('');
}

/**
 * Load publications content dynamically
 */
function loadPublicationsContent() {
    initPublicationFilters();
    loadJournals();
    loadConferences();
    loadKoreanConferences();
    loadTechnicalReports();
    updatePublicationNavCounts();
    renderPublicationFilters();
    renderPublicationResults();
}

/**
 * Load journal publications with numbering
 */
function loadJournals() {
    const journalsContainer = document.getElementById('journals');
    if (!journalsContainer) return;
    
    // Clear existing content
    journalsContainer.innerHTML = '';
    
    const journals = publicationsData.journals || [];
    
    if (journals.length === 0) {
        journalsContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6c757d;">
                <i class="fas fa-book" style="font-size: 3em; margin-bottom: 20px;"></i>
                <h3>No journal publications found</h3>
                <p>Please check the publications.json file.</p>
            </div>
        `;
        return;
    }
    
    pubRenderList(journalsContainer, 'journals', journals, (pub, number) => `
        <div class="publication-item">
            <div class="publication-number">${number}</div>
            <div class="pub-title">${pub.title}</div>
            <div class="pub-authors">${formatAuthors(pub.authors)}</div>
            <div class="pub-journal">${[pub.journal, pub.volume, pub.pages].filter(Boolean).join(', ')} (${pub.year})</div>
            <div class="pub-details">
                ${pub.impactFactor ? `<span class="pub-badge impact-factor">IF: ${pub.impactFactor}</span>` : ''}
                ${scholarCitationBadge(pub)}
                ${pub.doi && pub.doi !== '#' ? `<a href="${escapeHtml(pub.doi)}" class="doi-link" target="_blank" rel="noopener">DOI: ${escapeHtml(pub.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, ''))}</a>` : ''}
                ${pub.status ? `<span class="pub-badge ${getBadgeClass(pub.status)}">${escapeHtml(pub.status)}</span>` : ''}
                ${pub.category ? `<span class="pub-badge">${pub.category}${pub.quartile ? ', ' + pub.quartile : ''}</span>` : ''}
                ${pub.badges ? pub.badges.map(badge => `<span class="pub-badge ${getBadgeClass(badge)}">${badge}</span>`).join('') : ''}
            </div>
        </div>
    `);
}

/**
 * Load conference publications with numbering
 */
function loadConferences() {
    const conferencesContainer = document.getElementById('conferences');
    if (!conferencesContainer) return;
    
    // Clear existing content
    conferencesContainer.innerHTML = '';
    
    const conferences = publicationsData.conferences || [];
    
    if (conferences.length === 0) {
        conferencesContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6c757d;">
                <i class="fas fa-users" style="font-size: 3em; margin-bottom: 20px;"></i>
                <h3>No conference publications found</h3>
                <p>Please check the publications.json file.</p>
            </div>
        `;
        return;
    }
    
    pubRenderList(conferencesContainer, 'conferences', conferences, (pub, number) => `
        <div class="publication-item">
            <div class="publication-number">${number}</div>
            <div class="pub-title">${pub.title}</div>
            <div class="pub-authors">${formatAuthors(pub.authors)} (${pub.year})</div>
            <div class="pub-journal">${pub.conference}${pub.location ? `, ${pub.location}` : ''}${pub.date ? `, ${pub.date}` : ''}</div>
            <div class="pub-details">
                ${scholarCitationBadge(pub)}
                ${pub.pages ? `<span class="pub-badge">Pages: ${pub.pages}</span>` : ''}
                ${pub.publisher ? `<span class="pub-badge">Publisher: ${pub.publisher}</span>` : ''}
                ${pub.doi ? `<a href="${pub.doi}" class="doi-link" target="_blank" rel="noopener">DOI Link</a>` : ''}
            </div>
        </div>
    `);
}

/**
 * Load Korean conference publications with numbering
 */
function loadKoreanConferences() {
    const koreanContainer = document.getElementById('korean');
    if (!koreanContainer) return;
    
    // Clear existing content
    koreanContainer.innerHTML = '';
    
    const korean = publicationsData.korean_conferences || publicationsData.korean || [];
    
    if (korean.length === 0) {
        koreanContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6c757d;">
                <i class="fas fa-flag" style="font-size: 3em; margin-bottom: 20px;"></i>
                <h3>No Korean conference publications found</h3>
                <p>Please check the publications.json file.</p>
            </div>
        `;
        return;
    }
    
    pubRenderList(koreanContainer, 'korean', korean, (pub, number) => `
        <div class="publication-item">
            <div class="publication-number">${number}</div>
            <div class="pub-title">${pub.title}</div>
            <div class="pub-authors">${formatAuthors(pub.authors)} (${pub.year})</div>
            <div class="pub-journal">${pub.conference}${pub.location ? `, ${pub.location}` : ''}${pub.date ? `, ${pub.date}` : ''}${pub.volume ? `, ${pub.volume}` : ''}${pub.pages ? `, ${pub.pages}` : ''}</div>
            <div class="pub-details">
                ${scholarCitationBadge(pub)}
                ${pub.badges ? pub.badges.map(badge => `<span class="pub-badge ${getBadgeClass(badge)}">${badge}</span>`).join('') : ''}
            </div>
        </div>
    `);
}

/**
 * Load book chapters and patents with numbering
 */
function loadTechnicalReports() {
    const reportsContainer = document.getElementById('reports');
    if (!reportsContainer) return;

    // Clear existing content
    reportsContainer.innerHTML = '';

    const reports = publicationsData.books_patents || [];

    if (reports.length === 0) {
        reportsContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6c757d;">
                <i class="fas fa-file-alt" style="font-size: 3em; margin-bottom: 20px;"></i>
                <h3>No book chapters or patents found</h3>
                <p>Please check the publications.json file.</p>
            </div>
        `;
        return;
    }
    
    pubRenderList(reportsContainer, 'reports', reports, (pub, number) => `
        <div class="publication-item">
            <div class="publication-number">${number}</div>
            <div class="pub-title">${pub.title}</div>
            <div class="pub-authors">${formatAuthors(pub.authors)} (${pub.year})</div>
            <div class="pub-journal">${pub.journal}${pub.volume ? `, ${pub.volume}` : ''}${pub.pages ? `, pages ${pub.pages}` : ''}</div>
            <div class="pub-details">
                ${pub.type ? `<span class="pub-badge">${escapeHtml(pub.type)}</span>` : ''}
                ${scholarCitationBadge(pub)}
                ${pub.link ? `<a href="${pub.link}" class="doi-link" target="_blank" rel="noopener">${escapeHtml(pub.linkLabel || 'View Report')}</a>` : ''}
            </div>
        </div>
    `);
}

/**
 * Format authors with name highlighting
 * @param {Array} authors - Array of author names
 * @returns {string} Formatted author string
 */
function formatAuthors(authors) {
    if (!authors || !Array.isArray(authors)) return '';
    return authors.map(author => {
        if (author.includes(PUB_SELF)) {
            return `<span class="bold">${author}</span>`;
        }
        return author;
    }).join(', ');
}

/**
 * Get CSS class for publication badge
 * @param {string} badge - Badge text
 * @returns {string} CSS class name
 */
function getBadgeClass(badge) {
    const badgeClasses = {
        'Editor\'s Choice': 'editor-choice',
        'Best Paper Award': 'editor-choice',
        'Excellent Paper Award (BK21)': 'editor-choice',
        'Corresponding author': 'corresponding'
    };
    return badgeClasses[badge] || '';
}

// ==========================================================================
// Experience Functions
// ==========================================================================

/**
 * Load experience content dynamically with logo support
 */
function loadExperienceContent() {
    const experienceContainer = document.getElementById('experience-container');
    if (!experienceContainer) return;
    
    // Clear existing content
    experienceContainer.innerHTML = '';
    
    if (experienceData.length === 0) {
        experienceContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6c757d;">
                <i class="fas fa-briefcase" style="font-size: 3em; margin-bottom: 20px;"></i>
                <h3>No experience data found</h3>
                <p>Please check the experience.json file.</p>
            </div>
        `;
        return;
    }
    
    experienceContainer.innerHTML = groupExperienceByOrganization(experienceData)
        .map(renderExperienceGroup)
        .join('');
    attachImageFallbacks(experienceContainer);
    loadTeachingComputingContent();
}

/**
 * Teaching experience under the experience timeline. The section stays hidden
 * when experience.json has no "teaching" block.
 */
function loadTeachingComputingContent() {
    const section = document.getElementById('teaching-computing');
    const grid = section && section.querySelector('.teaching-computing-grid');
    if (!grid) return;

    const cards = [];

    if (teachingData && Array.isArray(teachingData.courses) && teachingData.courses.length) {
        const unit = teachingData.unit_website
            ? `<a href="${escapeHtml(teachingData.unit_website)}" class="role-unit" target="_blank" rel="noopener">${escapeHtml(teachingData.unit)}</a>`
            : `<span class="role-unit">${escapeHtml(teachingData.unit || '')}</span>`;

        cards.push(`
            <article class="tc-card">
                <h4 class="tc-card-title"><i class="fas fa-chalkboard-teacher" aria-hidden="true"></i> Teaching Experience</h4>
                ${unit}
                ${teachingData.organization ? `<p class="tc-org">${escapeHtml(teachingData.organization)}</p>` : ''}
                ${teachingData.description ? `<p class="tc-description">${escapeHtml(teachingData.description)}</p>` : ''}
                <ul class="tc-list">
                    ${teachingData.courses.map(course => `
                        <li>
                            <span class="tc-level">${escapeHtml(course.level || '')}</span>
                            <span class="tc-name">${escapeHtml(course.title)}</span>
                        </li>
                    `).join('')}
                </ul>
            </article>
        `);
    }

    grid.innerHTML = cards.join('');
    section.hidden = cards.length === 0;
}

/**
 * Collapse roles that share a "group" id into a single entry, so one
 * organization shows one logo with its roles listed underneath. Items without
 * a group stay on their own. Original ordering is preserved: a group takes the
 * position of its first role.
 */
function groupExperienceByOrganization(items) {
    const groups = [];
    const byId = {};

    items.forEach(exp => {
        const org = exp.group ? experienceOrganizations[exp.group] : null;
        if (!org) {
            groups.push({ org: null, roles: [exp] });
            return;
        }
        if (!byId[exp.group]) {
            byId[exp.group] = { org, roles: [] };
            groups.push(byId[exp.group]);
        }
        byId[exp.group].roles.push(exp);
    });

    return groups;
}

/**
 * One card per organization. Details shared by every role (department) are
 * hoisted into the card header instead of repeating on each role.
 */
function renderExperienceGroup({ org, roles }) {
    const lead = roles[0];
    const name = org ? org.name : (lead.organization || lead.company);
    const logo = org ? org.logo : lead.logo;
    const icon = (org ? org.icon : lead.icon) || 'fas fa-building';
    const website = (org ? org.website : (lead.companyUrl || lead.website)) || '#';
    const sharedDepartment = roles.every(r => r.department && r.department === lead.department)
        ? lead.department
        : null;

    return `
        <div class="experience-item">
            <div class="exp-header">
                <div class="company-logo">
                    ${logo ?
                        `<img src="${logo}" alt="${name}" data-fallback-icon="${icon}">` :
                        `<i class="${icon}"></i>`
                    }
                </div>
                <div class="exp-details">
                    <h3>
                        ${website === '#'
                            ? name
                            : `<a href="${website}" class="company-name" target="_blank" rel="noopener">${name}</a>`
                        }
                    </h3>
                    ${sharedDepartment ? `<p class="exp-department">${sharedDepartment}</p>` : ''}
                    <div class="role-timeline">
                        ${roles.map(role => renderExperienceRole(role, sharedDepartment)).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * A single role inside an organization card.
 */
function renderExperienceRole(exp, sharedDepartment) {
    const unit = exp.unit
        ? (exp.unit_website
            ? `<a href="${exp.unit_website}" class="role-unit" target="_blank" rel="noopener">${exp.unit}</a>`
            : `<span class="role-unit">${exp.unit}</span>`)
        : '';

    const duration = exp.duration?.display || exp.duration || '';
    const isCurrent = /present|current/i.test(duration);

    return `
        <div class="role-entry${isCurrent ? ' role-current' : ''}">
            <h4 class="role-title">${exp.position || exp.title}</h4>
            <p class="exp-duration">${duration}</p>
            ${unit}
            ${!sharedDepartment && exp.department ? `<p><strong>Department:</strong> ${exp.department}</p>` : ''}
            ${exp.course ? `<p><strong>Course:</strong> ${exp.course}</p>` : ''}
            ${exp.task ? `<p><strong>Task:</strong> ${exp.task}</p>` : ''}
            ${exp.primary_responsibilities ? `<p><strong>Responsibilities:</strong> ${Array.isArray(exp.primary_responsibilities) ? exp.primary_responsibilities[0] : exp.primary_responsibilities}</p>` : ''}
            ${exp.responsibilities ? `<p><strong>Responsibilities:</strong> ${exp.responsibilities}</p>` : ''}
        </div>
    `;
}

// ==========================================================================
// Projects Functions
// ==========================================================================

/**
 * Load projects content dynamically
 */
function loadProjectsContent() {
    const projectsContainer = document.getElementById('projects-container');
    if (!projectsContainer) return;
    
    // Clear existing content
    projectsContainer.innerHTML = '';
    
    if (projectsData.length === 0) {
        projectsContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6c757d;">
                <i class="fas fa-project-diagram" style="font-size: 3em; margin-bottom: 20px;"></i>
                <h3>No projects found</h3>
                <p>Please check the projects.json file.</p>
            </div>
        `;
        return;
    }
    
    // Newest first, so the timeline reads from current work downwards.
    const ordered = [...projectsData].sort(
        (a, b) => projectTimelineSortKey(b) - projectTimelineSortKey(a)
    );

    projectsContainer.innerHTML = ordered.map((project, index) => `
        <div class="project-entry ${index % 2 === 0 ? 'is-left' : 'is-right'}">
            <span class="project-marker" aria-hidden="true">${projectMarkerLabel(project)}</span>
            <div class="project-card" data-project-id="${project.id}" role="button" tabindex="0">
                <div class="project-image">
                    ${project.image ? `
                        <img src="${project.image}" alt="${project.title}" class="project-card-image"
                             onerror="this.outerHTML='&lt;i class=\\'${project.icon || 'fas fa-project-diagram'}\\'&gt;&lt;/i&gt;'" />
                    ` : `
                        <i class="${project.icon || 'fas fa-project-diagram'}"></i>
                    `}
                </div>
                <div class="project-info">
                    <div class="project-title">${project.title}</div>
                    <div class="project-role">${project.role}</div>
                    <div class="project-duration">${project.duration}</div>
                    ${project.status ? `<span class="project-status">${project.status}</span>` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

const PROJECT_MONTHS = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    // Academic terms, for course projects that give a semester instead of a month
    spring: 3, summer: 6, fall: 9, autumn: 9, winter: 12
};

/**
 * Pull a sortable year/month out of one side of a duration string, e.g.
 * "Apr. 2025", "Mar 2021", "2024 Spring". Returns 0 when no year is present.
 */
function parseProjectDatePart(text) {
    const year = (text.match(/\b(?:19|20)\d{2}\b/) || [])[0];
    if (!year) return 0;

    const monthKey = Object.keys(PROJECT_MONTHS).find(
        key => new RegExp('\b' + key, 'i').test(text)
    );

    return Number(year) * 100 + (monthKey ? PROJECT_MONTHS[monthKey] : 1);
}

/**
 * Sort key for the timeline: a project's end date, falling back to its start
 * date when the duration names a single point in time.
 */
function projectTimelineSortKey(project) {
    const parts = String(project.duration || '').split(/[–—-]/);
    const start = parseProjectDatePart(parts[0] || '');
    const end = parts.length > 1 ? parseProjectDatePart(parts[1]) : 0;
    return end || start;
}

/**
 * Label for the marker sitting on the rail: "2021–25" for a span,
 * a bare year for a project that starts and ends in the same one.
 */
function projectMarkerLabel(project) {
    const parts = String(project.duration || '').split(/[–—-]/);
    const start = Math.floor(parseProjectDatePart(parts[0] || '') / 100);
    const end = parts.length > 1 ? Math.floor(parseProjectDatePart(parts[1]) / 100) : 0;

    if (!start) return '';
    if (!end || end === start) return String(start);
    return `${start}–${String(end).slice(-2)}`;
}

/**
 * Open project modal with detailed information
 * @param {string} projectId - ID of the project
 */
function openProjectModal(projectId) {
    const modal = document.getElementById('projectModal');
    const content = document.getElementById('projectModalContent');
    
    const project = projectsData.find(p => p.id === projectId);
    if (!project) return;
    
    content.innerHTML = `
        ${project.image ? `
            <div class="project-modal-image-frame">
                <img src="${project.image}" alt="${project.title}" class="project-modal-image"
                     onerror="this.closest('.project-modal-image-frame').style.display='none'" />
            </div>
        ` : ''}
        <h2 style="color: var(--text-primary); margin-bottom: 20px;">${project.title}</h2>
        <div style="margin-bottom: 15px; color: var(--text-secondary);">
            <strong>Duration:</strong> ${project.duration}<br>
            <strong>Role:</strong> ${project.role}<br>
            ${project.supervisor ? `<strong>Supervisor:</strong> ${project.supervisor}<br>` : ''}
            ${project.funding || project.funding_source ? `<strong>Funding:</strong> ${project.funding || project.funding_source}<br>` : ''}
            ${project.collaborators ? `<strong>Collaborators:</strong> ${Array.isArray(project.collaborators) ? project.collaborators.join(', ') : project.collaborators}<br>` : ''}
            ${project.status ? `<strong>Status:</strong> ${project.status}<br>` : ''}
        </div>
        <h3 style="color: var(--text-primary); margin: 20px 0 10px 0;">Project Description</h3>
        <p style="margin-bottom: 20px; line-height: 1.7; max-width: 72ch; color: var(--text-secondary);">${project.description || project.detailed_description}</p>
        ${project.problem ? `
            <h3 style="color: var(--text-primary); margin: 20px 0 10px 0;">Problem &amp; Challenges</h3>
            <ul style="margin-bottom: 20px; padding-left: 20px; color: var(--text-secondary);">
                ${project.problem.map(item => `<li style="margin-bottom: 8px; line-height: 1.5;">${item}</li>`).join('')}
            </ul>
        ` : ''}
        ${project.objectives ? `
            <h3 style="color: var(--text-primary); margin: 20px 0 10px 0;">Objectives</h3>
            <ul style="margin-bottom: 20px; padding-left: 20px; color: var(--text-secondary);">
                ${project.objectives.map(obj => `<li style="margin-bottom: 8px; line-height: 1.5;">${obj}</li>`).join('')}
            </ul>
        ` : ''}
        ${project.methodology ? `
            <h3 style="color: var(--text-primary); margin: 20px 0 10px 0;">Methodology</h3>
            <ul style="margin-bottom: 20px; padding-left: 20px; color: var(--text-secondary);">
                ${project.methodology.map(item => `<li style="margin-bottom: 8px; line-height: 1.5;">${item}</li>`).join('')}
            </ul>
        ` : ''}
        ${project.workflow_stages ? `
            <h3 style="color: var(--text-primary); margin: 20px 0 10px 0;">Workflow</h3>
            <div style="margin-bottom: 20px;">
                ${project.workflow_stages.map(s => `
                    <div style="margin-bottom: 14px; padding: 12px 15px; background: var(--bg-tertiary); border-left: 4px solid var(--secondary-color); border-radius: var(--radius-xs);">
                        <strong style="color: var(--text-primary);">${s.stage}</strong>
                        <p style="margin: 6px 0 0 0; line-height: 1.5; color: var(--text-secondary);">${s.description}</p>
                    </div>
                `).join('')}
            </div>
        ` : ''}
        ${project.contribution ? `
            <h3 style="color: var(--text-primary); margin: 20px 0 10px 0;">Contribution</h3>
            <ul style="margin-bottom: 20px; padding-left: 20px; color: var(--text-secondary);">
                ${project.contribution.map(item => `<li style="margin-bottom: 8px; line-height: 1.5;">${item}</li>`).join('')}
            </ul>
        ` : ''}
        ${project.technologies ? `
            <h3 style="color: var(--text-primary); margin: 20px 0 10px 0;">Technologies Used</h3>
            <p style="margin-bottom: 20px; background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-color); padding: 15px; border-radius: var(--radius-md); font-family: monospace;">${Array.isArray(project.technologies) ? project.technologies.join(', ') : project.technologies}</p>
        ` : ''}
        ${project.outcomes ? `
            <h3 style="color: var(--text-primary); margin: 20px 0 10px 0;">Key Outcomes</h3>
            <div style="background: var(--bg-tertiary); padding: 15px; border-radius: var(--radius-md); border-left: 4px solid var(--success-color); color: var(--text-primary);">
                ${Array.isArray(project.outcomes) ? project.outcomes.map(outcome => `<p style="margin-bottom: 10px;">${outcome}</p>`).join('') : `<p>${project.outcomes}</p>`}
            </div>
        ` : ''}
        ${project.outputs ? `
            <h3 style="color: var(--text-primary); margin: 20px 0 10px 0;">Outputs</h3>
            <div style="background: var(--bg-tertiary); padding: 15px; border-radius: var(--radius-md); border-left: 4px solid var(--success-color); color: var(--text-primary);">
                ${Array.isArray(project.outputs) ? project.outputs.map(out => `<p style="margin-bottom: 10px;">${out}</p>`).join('') : `<p>${project.outputs}</p>`}
            </div>
        ` : ''}
    `;
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// ==========================================================================
// Seminars & Presentations Functions
// ==========================================================================

/**
 * Render the Seminars & Presentations list inside the Activities tab.
 * Entries that carry a certificate image open in the shared certificate modal.
 */
function loadSeminarsContent() {
    const container = document.getElementById('seminars-container');
    if (!container) return;

    const seminars = (seminarsData || [])
        .slice()
        .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

    if (seminars.length === 0) {
        container.innerHTML = `
            <div class="seminars-empty">
                <i class="fas fa-chalkboard-user"></i>
                <p>No seminars or presentations listed yet.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = seminars.map(seminar => {
        const hasCertificate = Boolean(seminar.image);
        const metaLine = [seminar.date, seminar.location].filter(Boolean).map(escapeHtml).join(' &middot; ');
        const label = [seminar.type, seminar.role].filter(Boolean).map(escapeHtml).join(' &middot; ');

        return `
        <div class="seminar-item${hasCertificate ? ' clickable-seminar' : ''}"
             ${hasCertificate ? `data-seminar-id="${escapeHtml(seminar.id)}" role="button" tabindex="0"` : ''}>
            <div class="seminar-thumb">
                ${hasCertificate
                    ? `<img src="${escapeHtml(seminar.image)}" alt="${escapeHtml(seminar.title)} certificate" data-fallback-icon="fas fa-chalkboard-user">`
                    : `<i class="fas fa-chalkboard-user"></i>`
                }
            </div>
            <div class="seminar-info">
                ${label ? `<span class="seminar-badge">${label}</span>` : ''}
                <strong class="seminar-title">${escapeHtml(seminar.title)}</strong>
                ${seminar.organizer ? `<p class="seminar-meta"><i class="fas fa-building"></i> ${escapeHtml(seminar.organizer)}</p>` : ''}
                ${metaLine ? `<p class="seminar-meta"><i class="fas fa-calendar-day"></i> ${metaLine}</p>` : ''}
                ${hasCertificate ? `<span class="seminar-action"><i class="fas fa-certificate"></i> View Certificate</span>` : ''}
            </div>
        </div>
        `;
    }).join('');

    attachImageFallbacks(container);
}

/**
 * Open a seminar's certificate in the shared certificate modal
 * @param {string} seminarId - ID of the seminar entry
 */
function openSeminarModal(seminarId) {
    const modal = document.getElementById('certificateModal');
    const content = document.getElementById('certificateModalContent');
    if (!modal || !content) return;

    const seminar = (seminarsData || []).find(item => item.id === seminarId);
    if (!seminar) return;

    const title = escapeHtml(seminar.title);

    content.innerHTML = `
        <h2 style="color: var(--text-primary); margin-bottom: 20px; text-align: center;">${title}</h2>
        ${seminar.image ? `
            <div class="modal-certificate-image" style="text-align: center;">
                <img src="${escapeHtml(seminar.image)}" alt="${title} certificate" class="modal-certificate-preview" data-image-zoom-src="${escapeHtml(seminar.image)}" data-image-zoom-alt="${title}" data-fallback-icon="fas fa-chalkboard-user">
                <p style="font-size: 0.9em; color: var(--text-muted); margin-top: 10px; text-align: center;">Click image to enlarge</p>
            </div>
        ` : ''}
        <div style="text-align: center; background: var(--bg-tertiary); padding: 20px; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin: 20px 0; color: var(--text-secondary);">
            ${seminar.organizer ? `<p style="margin-bottom: 10px;"><strong>Organized by:</strong> ${escapeHtml(seminar.organizer)}</p>` : ''}
            ${seminar.date ? `<p style="margin-bottom: 10px;"><strong>Date:</strong> ${escapeHtml(seminar.date)}</p>` : ''}
            ${seminar.location ? `<p style="margin-bottom: 10px;"><strong>Location:</strong> ${escapeHtml(seminar.location)}</p>` : ''}
            ${seminar.role ? `<p style="margin-bottom: 10px;"><strong>Role:</strong> ${escapeHtml(seminar.role)}</p>` : ''}
            ${seminar.description ? `<p style="margin-bottom: 0;"><strong>Description:</strong> ${escapeHtml(seminar.description)}</p>` : ''}
        </div>
        ${(seminar.topics && seminar.topics.length) ? `
            <div style="margin-top: 20px;">
                <h4 style="color: var(--text-primary); margin-bottom: 10px;">Topics:</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                    ${seminar.topics.map(topic => `
                        <span style="background: linear-gradient(135deg, var(--secondary-color) 0%, var(--accent-color) 100%);
                                     color: white; padding: 5px 12px; border-radius: 15px;
                                     font-size: 0.8em; font-weight: 500;">${escapeHtml(topic)}</span>
                    `).join('')}
                </div>
            </div>
        ` : ''}
        ${seminar.verification_url ? `
            <div style="text-align: center; margin-top: 20px;">
                <a href="${escapeHtml(seminar.verification_url)}" target="_blank" rel="noopener" style="color: var(--secondary-color); text-decoration: none; font-weight: 500;">
                    <i class="fas fa-external-link-alt"></i> More Information
                </a>
            </div>
        ` : ''}
    `;
    attachImageFallbacks(content);

    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// ==========================================================================
// Certificates Functions
// ==========================================================================

/**
 * Load certificates content dynamically with image support
 */
function loadCertificatesContent() {
    const certificatesContainer = document.getElementById('certificates-container');
    if (!certificatesContainer) return;
    
    // Update awards section
    const awardsContainer = document.querySelector('.awards-container');
    if (awardsContainer && certificatesData.awards) {
        awardsContainer.innerHTML = certificatesData.awards.map(award => `
            <div class="award-item">
                <div class="award-icon">
                    <i class="${award.icon || 'fas fa-trophy'}"></i>
                </div>
                <div class="award-content">
                    <strong>${award.title}</strong>
                    <p>${award.issuer} (${award.date})</p>
                </div>
            </div>
        `).join('');
    }
    
    // Clear existing content
    certificatesContainer.innerHTML = '';
    
    const certifications = certificatesData.certifications || [];
    
    if (certifications.length === 0) {
        certificatesContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6c757d;">
                <i class="fas fa-certificate" style="font-size: 3em; margin-bottom: 20px;"></i>
                <h3>No certifications found</h3>
                <p>Please check the certificates.json file.</p>
            </div>
        `;
        return;
    }
    
    certificatesContainer.innerHTML = certifications.map(cert => `
        <div class="certificate-card" data-certificate-id="${cert.id}" role="button" tabindex="0">
            <div class="certificate-image">
                ${cert.image ? 
                    `<img src="${cert.image}" alt="${cert.title}" data-fallback-icon="fas fa-certificate">` :
                    `<i class="fas fa-certificate"></i>`
                }
            </div>
            <div class="certificate-caption">${cert.title}</div>
        </div>
    `).join('');
    attachImageFallbacks(certificatesContainer);
}

/**
 * Open certificate modal with detailed information and image
 * @param {string} certId - ID of the certificate
 */
function openCertificateModal(certId) {
    const modal = document.getElementById('certificateModal');
    const content = document.getElementById('certificateModalContent');
    
    const certifications = certificatesData.certifications || [];
    const cert = certifications.find(c => c.id === certId);
    if (!cert) return;
    
    content.innerHTML = `
        <h2 style="color: var(--text-primary); margin-bottom: 20px; text-align: center;">${cert.title}</h2>
        ${cert.image ? `
            <div class="modal-certificate-image" style="text-align: center;">
                <img src="${cert.image}" alt="${cert.title}" class="modal-certificate-preview" data-image-zoom-src="${cert.image}" data-image-zoom-alt="${cert.title}">
                <p style="font-size: 0.9em; color: var(--text-muted); margin-top: 10px; text-align: center;">Click image to enlarge</p>
            </div>
        ` : `
            <div style="text-align: center; margin: 30px 0;">
                <div style="width: 300px; height: 200px; background: linear-gradient(135deg, var(--secondary-color) 0%, var(--accent-color) 100%); 
                            border-radius: var(--radius-lg); margin: 0 auto; display: flex; align-items: center; justify-content: center; 
                            color: white; font-size: 3em; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
                    <i class="fas fa-certificate"></i>
                </div>
            </div>
        `}
        <div style="text-align: center; background: var(--bg-tertiary); padding: 20px; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin: 20px 0; color: var(--text-secondary);">
            <p style="margin-bottom: 10px;"><strong>Issued by:</strong> ${cert.issuer}</p>
            ${cert.date ? `<p style="margin-bottom: 10px;"><strong>Date:</strong> ${cert.date}</p>` : ''}
            ${cert.category ? `<p style="margin-bottom: 10px;"><strong>Category:</strong> ${cert.category}</p>` : ''}
            ${cert.credential_id ? `<p style="margin-bottom: 10px;"><strong>Credential ID:</strong> ${cert.credential_id}</p>` : ''}
            <p style="margin-bottom: 0;"><strong>Description:</strong> ${cert.description}</p>
        </div>
        ${cert.skills ? `
            <div style="margin-top: 20px;">
                <h4 style="color: var(--text-primary); margin-bottom: 10px;">Skills Acquired:</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                    ${cert.skills.map(skill => `
                        <span style="background: linear-gradient(135deg, var(--secondary-color) 0%, var(--accent-color) 100%); 
                                     color: white; padding: 5px 12px; border-radius: 15px; 
                                     font-size: 0.8em; font-weight: 500;">${skill}</span>
                    `).join('')}
                </div>
            </div>
        ` : ''}
        ${cert.verification_url ? `
            <div style="text-align: center; margin-top: 20px;">
                <a href="${cert.verification_url}" target="_blank" rel="noopener" style="color: var(--secondary-color); text-decoration: none; font-weight: 500;">
                    <i class="fas fa-external-link-alt"></i> Verify Certificate
                </a>
            </div>
        ` : ''}
    `;
    attachImageFallbacks(content);
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// ==========================================================================
// Image Zoom Functions
// ==========================================================================

/**
 * Open image zoom overlay
 * @param {string} imageSrc - Source of the image
 * @param {string} altText - Alt text for the image
 */
function openImageZoom(imageSrc, altText) {
    const overlay = document.getElementById('imageZoomOverlay');
    const zoomedImage = document.getElementById('zoomedImage');
    
    if (overlay && zoomedImage) {
        zoomedImage.src = imageSrc;
        zoomedImage.alt = altText;
        overlay.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Close image zoom overlay
 */
function closeImageZoom() {
    const overlay = document.getElementById('imageZoomOverlay');
    if (overlay) {
        overlay.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// ==========================================================================
// Modal Functions
// ==========================================================================

/**
 * Show or hide the visitor flag counter popover beside its icon.
 * It does not lock scrolling or cover the page.
 * @param {boolean} [open] - Force open (true) or closed (false); toggles when omitted
 */
function toggleFlagCounterPopover(open) {
    const popover = document.getElementById('flagCounterPopover');
    const toggle = document.querySelector('[data-flag-counter-toggle]');
    if (!popover || !toggle) return;

    const shouldOpen = typeof open === 'boolean' ? open : popover.hidden;
    if (shouldOpen === !popover.hidden) return;

    popover.hidden = !shouldOpen;
    toggle.setAttribute('aria-expanded', String(shouldOpen));
    if (!shouldOpen) return;

    // Nudge the popover sideways if it would run off either edge of the viewport
    const gutter = 16;
    popover.style.setProperty('--popover-shift', '0px');
    const rect = popover.getBoundingClientRect();
    let shift = 0;
    if (rect.left < gutter) {
        shift = gutter - rect.left;
    } else if (rect.right > window.innerWidth - gutter) {
        shift = window.innerWidth - gutter - rect.right;
    }
    popover.style.setProperty('--popover-shift', `${shift}px`);
}

/**
 * Close modal
 * @param {string} modalId - ID of the modal to close
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

/**
 * Close modal when clicking outside content area
 */
function handleModalClick(event) {
    const projectModal = document.getElementById('projectModal');
    const certificateModal = document.getElementById('certificateModal');
    const awardCertificateModal = document.getElementById('awardCertificateModal');
    const imageZoomOverlay = document.getElementById('imageZoomOverlay');

    if (event.target === projectModal) {
        closeModal('projectModal');
    }
    if (event.target === certificateModal) {
        closeModal('certificateModal');
    }
    if (event.target === awardCertificateModal) {
        closeModal('awardCertificateModal');
    }
    if (event.target === imageZoomOverlay) {
        closeImageZoom();
    }
}

// ==========================================================================
// Scroll to Top Functionality
// ==========================================================================

/**
 * Scroll smoothly to the top of the page with animation
 */
function scrollToTop() {
    const scrollButton = document.getElementById('scrollToTop');
    
    // Add clicked animation
    if (scrollButton) {
        scrollButton.style.transform = 'scale(0.85) translateY(-3px)';
        setTimeout(() => {
            scrollButton.style.transform = '';
        }, 200);
    }
    
    // Use native smooth scroll for better performance
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

/**
 * Initialize scroll to top button functionality with enhanced effects
 */
function initializeScrollToTop() {
    const scrollButton = document.getElementById('scrollToTop');
    if (!scrollButton) return;
    
    let isVisible = false;
    
    const handleScroll = throttle(() => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const shouldShow = scrollTop > 400;
        
        if (shouldShow !== isVisible) {
            isVisible = shouldShow;
            if (shouldShow) {
                scrollButton.classList.add('visible');
            } else {
                scrollButton.classList.remove('visible');
            }
        }
        
        // Progress indicator effect
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const progress = Math.min((scrollTop / maxScroll) * 100, 100);
        scrollButton.style.setProperty('--scroll-progress', `${progress}%`);
    }, 50);
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Enhanced hover effects
    scrollButton.addEventListener('mouseenter', () => {
        scrollButton.style.transform = 'translateY(-8px) scale(1.1)';
        scrollButton.style.boxShadow = '0 12px 35px rgba(var(--primary-color-rgb), 0.4)';
    });
    
    scrollButton.addEventListener('mouseleave', () => {
        scrollButton.style.transform = 'translateY(0) scale(1)';
        scrollButton.style.boxShadow = '';
    });
}

// ==========================================================================
// Animation and UI Functions
// ==========================================================================

/**
 * Initialize intersection observer for animations
 */
function initializeAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.transform = 'translateY(0)';
                entry.target.style.opacity = '1';
                entry.target.classList.add('animated');
            }
        });
    }, observerOptions);

    // Observe elements that should animate
    const animateElements = '.experience-item, .publication-item, .project-card, .certificate-card, .award-item, .activity-item, .seminar-item, .news-item, .news-card, .highlight-card, .skill-item';
    document.querySelectorAll(animateElements).forEach(el => {
        el.style.transform = 'translateY(20px)';
        el.style.opacity = '0';
        el.style.transition = 'all 0.6s ease';
        observer.observe(el);
    });
}

/**
 * Add smooth scrolling to anchor links
 */
function initializeSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            if (this.dataset.tab) return;

            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const headerHeight = CONFIG.headerHeight;
                const elementPosition = target.offsetTop - headerHeight;
                window.scrollTo({
                    top: elementPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

/**
 * Initialize keyboard navigation
 */
function initializeKeyboardNavigation() {
    document.addEventListener('keydown', function(e) {
        // Close modals with Escape key
        if (e.key === 'Escape') {
            closeModal('projectModal');
            closeModal('certificateModal');
            closeModal('awardCertificateModal');
            toggleFlagCounterPopover(false);
            closeImageZoom();
        }
        
        // Navigate tabs with arrow keys (when focused on nav buttons)
        if (e.target instanceof Element && e.target.classList.contains('nav-btn')) {
            const navButtons = Array.from(document.querySelectorAll('.nav-btn'));
            const currentIndex = navButtons.indexOf(e.target);
            
            if (e.key === 'ArrowRight' && currentIndex < navButtons.length - 1) {
                e.preventDefault();
                navButtons[currentIndex + 1].focus();
                navButtons[currentIndex + 1].click();
            } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
                e.preventDefault();
                navButtons[currentIndex - 1].focus();
                navButtons[currentIndex - 1].click();
            }
        }
    });
}

/**
 * Initialize header effects with enhanced scroll behavior
 */
function initializeHeaderEffects() {
    const header = document.querySelector('.header-wrapper');
    if (!header) return;

    const handleScroll = throttle(updateHeaderThemeStyle, 16);

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Initial call
    handleScroll();
}

// ==========================================================================
// Event Listeners and Initialization
// ==========================================================================

/** Static architectural grid drawn once behind all page content. */
function initializeGridBackground() {
    const background = document.querySelector('.grid-background');
    if (!background || background.querySelector('canvas')) return;

    background.setAttribute('aria-hidden', 'true');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;
    background.appendChild(canvas);

    let width = 0;
    let height = 0;
    let ink = '';
    let inkScale = 1;
    const spacing = 48;

    /* Visibility of the ruling, and the only knobs worth touching: raise them
       for a more present grid, lower them to push it back toward bare texture.
       Every fourth line is a major one, at twice the weight of the rest. */
    const MAJOR_ALPHA = 0.22;
    const MINOR_ALPHA = 0.11;

    function updateInk() {
        const dark = document.documentElement.getAttribute('data-theme') === 'dark';
        ink = dark ? '105, 190, 235' : '36, 112, 164';
        // Light ink on a dark ground reads stronger at equal alpha; ease off.
        inkScale = dark ? 0.72 : 1;
    }

    function draw() {
        context.clearRect(0, 0, width, height);
        context.lineWidth = 0.8;

        function gridLine(position, vertical, major) {
            const alpha = (major ? MAJOR_ALPHA : MINOR_ALPHA) * inkScale;
            context.strokeStyle = `rgba(${ink}, ${alpha.toFixed(4)})`;
            context.beginPath();
            context.moveTo(vertical ? position : 0, vertical ? 0 : position);
            context.lineTo(vertical ? position : width, vertical ? height : position);
            context.stroke();
        }

        for (let x = 0, column = 0; x <= width; x += spacing, column++) {
            gridLine(x, true, column % 4 === 0);
        }
        for (let y = 0, row = 0; y <= height; y += spacing, row++) {
            gridLine(y, false, row % 4 === 0);
        }
    }

    function resize() {
        width = background.clientWidth;
        height = background.clientHeight;
        const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        draw();
    }

    window.addEventListener('resize', throttle(resize, 150), { passive: true });

    new MutationObserver(() => {
        updateInk();
        draw();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    updateInk();
    resize();
}

/**
 * Initialize the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Academic Portfolio initializing - Enhanced UI/UX with Performance Optimizations');

    // Reveal the page (body starts at opacity:0 via CSS and fades in once loaded)
    document.body.classList.add('loaded');

    // Load all data from JSON files first with loading indicator
    const dataPromise = loadDataFromJSON();
    
    // Initialize critical components immediately
    initializeTheme(); // Initialize theme toggle functionality first
    initializeGridBackground();
    initializeStaticEventHandlers();
    
    // Wait for data to load
    await dataPromise;
    
    // Initialize various components
    initializeSmoothScrolling();
    initializeKeyboardNavigation();
    initializeHeaderEffects();
    initializeScrollToTop();
    
    // Initialize tab from URL hash on page load
    initializeTabFromUrl();
    
    // Render the home Highlights (latest news) and the News list below them
    renderHighlights();
    renderNewsList();

    // Populate the Google Scholar metrics card, then keep a long-lived tab in
    // step with the 5-hourly server-side refresh
    renderScholarMetrics();
    initializeScholarAutoRefresh();

    // Set up modal click handlers
    window.addEventListener('click', handleModalClick);
    
    // Add mobile menu click outside listener
    document.addEventListener('click', closeMobileMenuOnClickOutside);
    
    // Initialize animations after a short delay
    setTimeout(initializeAnimations, 500);

    // Handle browser back/forward navigation
    window.addEventListener('hashchange', function() {
        const currentTab = getCurrentTab();
        showTab(currentTab);
    });
    
    // Add resize handler for responsive adjustments with debounce
    const handleResize = debounce(() => {
        syncHeaderHeight();

        // Close mobile menu on desktop view
        if (window.innerWidth > 768) {
            const navMenu = document.querySelector('.nav-menu');
            const menuToggle = document.querySelector('.mobile-menu-toggle');
            if (navMenu && navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
                if (menuToggle) {
                    menuToggle.setAttribute('aria-expanded', 'false');
                }
                document.body.style.overflow = '';
            }
        }
    }, 250);
    
    window.addEventListener('resize', handleResize);
    
    // Initial header height calculation (re-run after webfonts settle)
    syncHeaderHeight();
    setTimeout(syncHeaderHeight, 100);
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(syncHeaderHeight);
    }
    
    // Add performance monitoring
    if (window.performance && window.performance.timing) {
        window.addEventListener('load', () => {
            const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
            console.log(`📊 Page loaded in ${loadTime}ms`);
        });
    }
    
    // Preload critical images (portrait plus the two hover photos)
    preloadImages([
        'assets/images/profile/umankhalid_profile.jpg',
        'assets/images/profile/Profile%201.jpg',
        'assets/images/profile/Profile%202.jpg'
    ]);

    initializeProfileHover();

    console.log('✅ Portfolio initialization complete with enhanced features');
});

/**
 * Alternate the portrait's hover photo: the first hover shows the first
 * .hover image, the next hover the second, and so on. The swap happens on
 * mouseleave, while the photo is fading out, so it is never visible.
 */
function initializeProfileHover() {
    const container = document.querySelector('.profile-image-container');
    if (!container) return;

    const photos = Array.from(container.querySelectorAll('.profile-image.hover'));
    if (photos.length < 2) return;

    let current = Math.max(0, photos.findIndex(photo => photo.classList.contains('is-next')));
    container.addEventListener('mouseleave', () => {
        photos[current].classList.remove('is-next');
        current = (current + 1) % photos.length;
        photos[current].classList.add('is-next');
    });
}

/**
 * Preload images for better performance
 * @param {Array} imageUrls - Array of image URLs to preload
 */
function preloadImages(imageUrls) {
    imageUrls.forEach(url => {
        const img = new Image();
        img.src = url;
    });
}

// ==========================================================================
// Error Handling
// ==========================================================================

/**
 * Global error handler
 */
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
});

/**
 * Handle unhandled promise rejections
 */
window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
});

// ==========================================================================
// Export functions for global access
// ==========================================================================

// Make functions available globally
window.showTab = showTab;
window.showPublications = showPublications;
window.openProjectModal = openProjectModal;
window.openCertificateModal = openCertificateModal;
window.openAwardCertificate = openAwardCertificate;
window.closeModal = closeModal;
window.openImageZoom = openImageZoom;
window.closeImageZoom = closeImageZoom;
window.scrollToTop = scrollToTop;
window.toggleMobileMenu = toggleMobileMenu;

// ==========================================================================
// Software/Tools Tab Functions
// ==========================================================================

/**
 * Render the Research tab (nav buttons + theme sections) from data/research.json.
 * Reproduces the original markup so existing CSS continues to apply.
 */
function renderSoftwareContent() {
    const nav = document.querySelector('.tools-nav');
    const container = document.querySelector('.tools-content-container');
    if (!nav || !container) return;
    if (!Array.isArray(softwareData) || softwareData.length === 0) return;

    nav.innerHTML = softwareData.map((tool, i) => `
        <button type="button" class="tool-nav-btn${i === 0 ? ' active' : ''}" data-tool="${escapeHtml(tool.id)}">
            <i class="${escapeHtml(tool.navIcon || 'fas fa-cube')}"></i>
            ${escapeHtml(tool.navLabel || tool.title)}
        </button>
    `).join('');

    container.innerHTML = softwareData.map((tool, i) => renderSoftwareTool(tool, i === 0)).join('');
}

function renderSoftwareTool(tool, active) {
    const badges = (tool.badges || []).map(b =>
        `<span class="pub-badge ${escapeHtml(b.variant || 'impact-factor')}">${escapeHtml(b.label)}</span>`).join('');
    const badgesHtml = badges ? `<div class="tool-badges">${badges}</div>` : '';

    const actions = (tool.actions || []).map(a =>
        `<a href="${escapeHtml(a.href)}" target="_blank" rel="noopener" class="doi-link${a.variant ? ' ' + escapeHtml(a.variant) : ''}">
            <i class="${escapeHtml(a.icon || 'fas fa-link')}"></i> ${escapeHtml(a.label)}
        </a>`).join('');
    const actionsHtml = actions ? `<div class="tool-actions">${actions}</div>` : '';

    const sections = (tool.sections || []).map(renderSoftwareSection).join('');

    return `
        <div id="${escapeHtml(tool.id)}" class="tool-content${active ? ' active' : ''}">
            <div class="tool-header">
                <h2 class="section-title">${escapeHtml(tool.title)}</h2>
                <p class="tool-description">${escapeHtml(tool.description || '')}</p>
                ${badgesHtml}
                ${actionsHtml}
            </div>
            <div class="tool-details">
                ${sections}
            </div>
        </div>
    `;
}

function renderSoftwareSection(section) {
    switch (section.type) {
        case 'info':
            // Paragraphs may contain trusted inline HTML (<strong>, <code>).
            return `<div class="tool-info-section">
                <h3 class="info-title">${escapeHtml(section.title)}</h3>
                ${(section.paragraphs || []).map(p => `<p class="bio-text">${p}</p>`).join('')}
            </div>`;
        case 'features':
            return `<div class="tool-info-section">
                <h3 class="info-title">${escapeHtml(section.title)}</h3>
                <ul class="software-features-list">
                    ${(section.items || []).map(it => `<li><i class="${escapeHtml(it.icon || 'fas fa-check')}"></i>${it.html}</li>`).join('')}
                </ul>
            </div>`;
        case 'featureGrid':
            return `<div class="tool-features-grid">
                ${(section.cards || []).map(renderSoftwareFeatureCard).join('')}
            </div>`;
        case 'code':
            return `<div class="tool-info-section">
                <h3 class="info-title">${escapeHtml(section.title)}</h3>
                ${(section.paragraphs || []).map(p => `<p class="bio-text">${p}</p>`).join('')}
                <pre class="install-code-block"><code>${escapeHtml(section.code || '')}</code></pre>
            </div>`;
        case 'media':
            return renderSoftwareMedia(section);
        default:
            return '';
    }
}

function renderSoftwareFeatureCard(card) {
    const caps = (card.capabilities || []).map(c =>
        `<div class="capability-item"><i class="${escapeHtml(c.icon || 'fas fa-check')}"></i><span>${escapeHtml(c.label)}</span></div>`).join('');
    const capsHtml = caps ? `<div class="capabilities-grid">${caps}</div>` : '';
    return `<div class="experience-item">
        <div class="exp-header">
            <div class="company-logo"><i class="${escapeHtml(card.icon || 'fas fa-cube')}"></i></div>
            <div class="exp-details">
                <h3>${escapeHtml(card.title)}</h3>
                <p class="company-name">${escapeHtml(card.subtitle || '')}</p>
                <p class="exp-duration">${escapeHtml(card.duration || '')}</p>
            </div>
        </div>
        ${capsHtml}
    </div>`;
}

function renderSoftwareMedia(section) {
    const sectionClass = section.media === 'video' ? 'tool-video-section' : 'tool-info-section';
    const wrapClass = section.autoWrap ? 'video-wrapper media-wrapper-auto' : 'video-wrapper';
    const inner = section.media === 'video'
        ? `<iframe src="${escapeHtml(section.src)}" title="${escapeHtml(section.iframeTitle || section.title || '')}" allowfullscreen></iframe>`
        : `<img src="${escapeHtml(section.src)}" alt="${escapeHtml(section.alt || '')}" class="${escapeHtml(section.imageClass || 'media-image-contain')}">`;
    return `<div class="${sectionClass}">
        <h3 class="info-title">${escapeHtml(section.title)}</h3>
        <div class="${wrapClass}">
            ${inner}
        </div>
    </div>`;
}

/**
 * Show specific software tool
 * @param {string} toolId - ID of the tool to show
 */
function showTool(toolId) {
    // Hide all tool contents
    const toolContents = document.querySelectorAll('.tool-content');
    toolContents.forEach(content => {
        content.classList.remove('active');
    });

    // Remove active class from all nav buttons
    const navButtons = document.querySelectorAll('.tool-nav-btn');
    navButtons.forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tool content
    const selectedTool = document.getElementById(toolId);
    if (selectedTool) {
        selectedTool.classList.add('active');
    }

    // Add active class to selected nav button
    const selectedBtn = document.querySelector(`[data-tool="${toolId}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }

    // Scroll to top of content area
    const contentContainer = document.querySelector('.tools-content-container');
    if (contentContainer) {
        contentContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

/**
 * Initialize software tools functionality
 */
function initializeSoftwareTools() {
    // Build the tab from data/research.json first, then wire up the nav.
    renderSoftwareContent();

    const navButtons = document.querySelectorAll('.tool-nav-btn');

    // Add click event listeners to nav buttons
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const toolId = btn.getAttribute('data-tool');
            showTool(toolId);
        });
    });

    // Show the first theme by default
    const defaultTool = softwareData[0] && softwareData[0].id;
    if (defaultTool) showTool(defaultTool);
}

// ==========================================================================
// Contact Tab Functions
// ==========================================================================

/**
 * Initialize Leaflet Map
 */
let mapInstance = null;

function initializeMap() {
    if (typeof L === 'undefined') {
        console.error('Leaflet not loaded');
        return;
    }

    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    // If map already exists, remove it
    if (mapInstance) {
        mapInstance.remove();
    }

    // Office: Electronics and Information Building, Kyung Hee University Global Campus
    // (plus code 63QM+R9V Yongin-si)
    const lat = 37.239613;
    const lng = 127.083422;

    // Initialize the map with center coordinates
    mapInstance = L.map('map', {
        center: [lat, lng],
        zoom: 18,
        scrollWheelZoom: true,
        zoomControl: true
    });

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
    }).addTo(mapInstance);

    // Add marker
    const marker = L.marker([lat, lng]).addTo(mapInstance);

    // Add a circle to highlight the area
    L.circle([lat, lng], {
        color: '#3498db',
        fillColor: '#3498db',
        fillOpacity: 0.2,
        radius: 60
    }).addTo(mapInstance);

    // Force map to invalidate size and recenter after tiles load
    setTimeout(() => {
        mapInstance.invalidateSize();
        mapInstance.setView([lat, lng], 18);
    }, 250);

    console.log('Map initialized successfully');
}

/**
 * Copy text to the clipboard, falling back to execCommand on browsers or
 * non-secure origins where the async Clipboard API is unavailable.
 * @param {string} text
 * @returns {Promise<boolean>} whether the copy succeeded
 */
async function copyTextToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            /* fall through to the legacy path below */
        }
    }

    const scratch = document.createElement('textarea');
    scratch.value = text;
    scratch.setAttribute('readonly', '');
    scratch.style.position = 'fixed';
    scratch.style.opacity = '0';
    document.body.appendChild(scratch);
    scratch.select();

    let ok = false;
    try {
        ok = document.execCommand('copy');
    } catch (err) {
        ok = false;
    }
    document.body.removeChild(scratch);
    return ok;
}

/**
 * Bind every [data-copy] control on the contact tab. Each button briefly
 * swaps to a confirmation state instead of relying on a global alert
 * element, so the feedback stays next to what the user clicked.
 */
function initializeCopyButtons() {
    document.querySelectorAll('#contact [data-copy]').forEach((btn) => {
        if (btn.dataset.copyBound === 'true') return;
        btn.dataset.copyBound = 'true';

        btn.addEventListener('click', async (event) => {
            event.preventDefault();

            const original = btn.innerHTML;
            const label = btn.getAttribute('aria-label') || '';
            const copied = await copyTextToClipboard(btn.dataset.copy || '');
            const hasText = btn.textContent.trim().length > 0;

            btn.classList.add(copied ? 'is-copied' : 'is-failed');
            btn.innerHTML = copied
                ? '<i class="fas fa-check" aria-hidden="true"></i>' +
                  (hasText ? ' Copied' : '')
                : '<i class="fas fa-xmark" aria-hidden="true"></i>' +
                  (hasText ? ' Failed' : '');
            btn.setAttribute('aria-label', copied ? 'Copied' : 'Copy failed');

            setTimeout(() => {
                btn.classList.remove('is-copied', 'is-failed');
                btn.innerHTML = original;
                btn.setAttribute('aria-label', label);
            }, 1800);
        });
    });
}

/**
 * Stagger the contact cards into view. The reveal runs through a CSS class
 * rather than inline styles, which would otherwise out-specify the
 * stylesheet's :hover rules and leave the cards unable to lift.
 */
function initializeContactAnimations() {
    document.querySelectorAll('.contact-item').forEach((item, index) => {
        item.classList.remove('is-revealed');
        item.classList.add('is-revealing');
        // Consumed only by the reveal rule, so it never delays :hover.
        item.style.setProperty('--reveal-delay', `${index * 90}ms`);

        // Next frame, so the browser registers the pre-reveal state first.
        requestAnimationFrame(() => {
            requestAnimationFrame(() => item.classList.add('is-revealed'));
        });
    });
}

/**
 * Initialize action buttons
 */
function initializeActionButtons() {
    const actionButtons = document.querySelectorAll('.action-btn');
    actionButtons.forEach(button => {
        if (button) {
            button.addEventListener('mouseenter', function () {
                this.style.transform = 'translateY(-2px) scale(1.05)';
            });

            button.addEventListener('mouseleave', function () {
                this.style.transform = 'translateY(0) scale(1)';
            });
        }
    });
}

// ==========================================================================
// Academic Collaboration Network (co-authorship graph + country map)
//
// Modelled on the "Network" view of research-portal profiles: the researcher
// sits at the centre, collaborators are grouped by organisation around a ring,
// the line to each one is weighted by joint publications, and faint curves
// inside the ring show collaborators who have also published with each other.
// The country view is a map with arcs from the home institution.
// ==========================================================================

const collabNet = {
    initialized: false,
    canvas: null,
    ctx: null,
    tooltip: null,
    legend: null,
    panel: null,
    wrap: null,
    mode: 'author',
    dim: '2d',
    nodes: [],
    links: [],
    groups: [],
    layout: null,
    center: null,
    width: 0,
    height: 0,
    dpr: 1,
    alpha: 1,
    intro: 1,
    running: false,
    rafId: null,
    hovered: null,
    // 3D camera / rotation state
    rotX: -0.35,
    rotY: 0.6,
    autoSpin: 0.0024,
    focal: 820,
    visible: true,
    reducedMotion: false,
    // Shared camera (zoom + pan) for both 2D and 3D
    zoom: 1,
    panX: 0,
    panY: 0,
    minZoom: 0.35,
    maxZoom: 5,
    action: 'none', // 'none' | 'orbit' | 'pan' | 'dragNode'
    dragNode: null,
    lastPx: 0,
    lastPy: 0,
    // Palette slot per organisation / country, shared by every view so an
    // organisation keeps its colour when switching modes. The colours
    // themselves are CSS tokens (--collab-c0..7) so they follow the theme.
    groupIndex: {},
    countryIndex: {},
    paletteSize: 8,
    // Publications as lists of collaborator indices (built once)
    pubAuthorSets: [],
    coauthoredOutputs: 0,
    // Leaflet state for the country map
    map: null,
    mapTiles: null,
    mapLayer: null,
    mapMarkers: {},
    mapBounds: null
};

// Fallback for CanvasRenderingContext2D.roundRect (older browsers)
if (typeof CanvasRenderingContext2D !== 'undefined' &&
    !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
        if (typeof r === 'number') r = { tl: r, tr: r, br: r, bl: r };
        else r = { tl: r[0], tr: r[1] || r[0], br: r[2] || r[0], bl: r[3] || r[0] };
        this.moveTo(x + r.tl, y);
        this.lineTo(x + w - r.tr, y);
        this.quadraticCurveTo(x + w, y, x + w, y + r.tr);
        this.lineTo(x + w, y + h - r.br);
        this.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
        this.lineTo(x + r.bl, y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - r.bl);
        this.lineTo(x, y + r.tl);
        this.quadraticCurveTo(x, y, x + r.tl, y);
        return this;
    };
}

/**
 * Read a collaborator's affiliation regardless of the key used in JSON
 * (supports "university", "Industry", "industry", "affiliation").
 */
function collabAffiliation(item) {
    return item.university || item.Industry || item.industry || item.affiliation || '';
}

/**
 * Normalise a person's name for matching against publication author lists.
 */
function collabNameKey(name) {
    return String(name || '').toLowerCase().replace(/[^a-z]/g, '');
}

/**
 * CSS custom property for a palette slot (used by the HTML panel and legend).
 */
function collabColorVar(slot) {
    if (slot == null || slot < 0) return 'var(--text-muted)';
    return `var(--collab-c${slot % collabNet.paletteSize})`;
}

/**
 * Resolve the palette tokens to concrete colours for canvas / Leaflet drawing.
 */
function collabReadPalette() {
    const styles = getComputedStyle(document.documentElement);
    const read = (name, fallback) => (styles.getPropertyValue(name) || '').trim() || fallback;
    const colors = [];
    for (let i = 0; i < collabNet.paletteSize; i++) colors.push(read(`--collab-c${i}`, '#2b6a99'));
    return {
        colors,
        text: read('--text-primary', '#15222d'),
        sub: read('--text-secondary', '#465563'),
        muted: read('--text-muted', '#6b7a88'),
        bg: read('--bg-secondary', '#ffffff'),
        ink: read('--primary-color', '#183247')
    };
}

function collabSlotColor(theme, slot) {
    if (slot == null || slot < 0) return theme.muted;
    return theme.colors[slot % theme.colors.length];
}

/**
 * Assign palette slots: organisations by joint publications, then any
 * affiliation that only appears on an author; countries likewise.
 * Hues are never reused: when there are more entries than palette slots,
 * the tied group that would overflow (and everything after it) gets no slot
 * and is drawn in the muted "Other" colour.
 */
function collabAssignSlots(data) {
    const byPapers = (a, b) => (b.papers || 0) - (a.papers || 0) || String(a.name).localeCompare(String(b.name));

    const slotsFor = (entries) => {
        const seen = new Set();
        const unique = entries.filter(e => e.name && !seen.has(e.name) && seen.add(e.name));
        const index = {};
        const size = collabNet.paletteSize;
        unique.forEach((entry, i) => {
            const atOrAbove = unique.filter(e => (e.papers || 0) >= (entry.papers || 0)).length;
            if (unique.length <= size || atOrAbove <= size) index[entry.name] = i;
        });
        return index;
    };

    const orgs = (data.byUniversity || []).slice().sort(byPapers);
    const listed = new Set(orgs.map(org => org.name));
    (data.byAuthor || []).forEach(author => {
        const org = collabAffiliation(author);
        if (org && !listed.has(org)) {
            listed.add(org);
            orgs.push({ name: org, papers: 0 });
        }
    });
    collabNet.groupIndex = slotsFor(orgs);
    collabNet.countryIndex = slotsFor((data.byCountry || []).slice().sort(byPapers));
}

/**
 * Turn publications.json into lists of collaborator indices, so co-author to
 * co-author links can be drawn. Names are matched loosely, plus any "aliases"
 * listed for an author in collaborations.json.
 */
function collabIndexPublications(data) {
    const byKey = {};
    (data.byAuthor || []).forEach((author, i) => {
        [author.name].concat(author.aliases || []).forEach(name => {
            byKey[collabNameKey(name)] = i;
        });
    });

    const sets = [];
    let outputs = 0;
    const lists = (publicationsData && typeof publicationsData === 'object')
        ? Object.values(publicationsData).filter(Array.isArray)
        : [];
    for (const list of lists) {
        for (const pub of list) {
            if (!pub || !Array.isArray(pub.authors)) continue;
            const found = new Set();
            for (const name of pub.authors) {
                const idx = byKey[collabNameKey(name)];
                if (idx != null) found.add(idx);
            }
            if (found.size) {
                outputs++;
                sets.push(Array.from(found));
            }
        }
    }
    collabNet.pubAuthorSets = sets;
    collabNet.coauthoredOutputs = outputs;
}

/**
 * Entry point, called when the Activities tab is shown.
 */
function initCollaborationNetwork() {
    const canvas = document.getElementById('collab-canvas');
    if (!canvas || !collaborationsData) return;

    if (!collabNet.initialized) {
        collabNet.canvas = canvas;
        collabNet.ctx = canvas.getContext('2d');
        collabNet.tooltip = document.getElementById('collab-tooltip');
        collabNet.legend = document.getElementById('collab-legend');
        collabNet.panel = document.getElementById('collab-panel');
        collabNet.wrap = canvas.closest('.collab-canvas-wrap');
        collabNet.reducedMotion = window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        collabAssignSlots(collaborationsData);

        // View mode buttons (author / organisation / country)
        document.querySelectorAll('.collab-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.collab-mode-btn').forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-selected', 'false');
                });
                btn.classList.add('active');
                btn.setAttribute('aria-selected', 'true');
                collabNet.mode = btn.dataset.mode;
                collabResetCamera();
                buildCollabGraph();
            });
        });

        // Dimension buttons (2D / 3D)
        document.querySelectorAll('.collab-dim-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.disabled) return;
                document.querySelectorAll('.collab-dim-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                collabNet.dim = btn.dataset.dim;
                collabResetCamera();
                buildCollabGraph();
            });
        });

        const resetBtn = document.getElementById('collab-reset');
        if (resetBtn) resetBtn.addEventListener('click', () => {
            if (collabNet.mode === 'country') {
                collabFitMap();
                return;
            }
            collabNet.rotX = -0.35;
            collabNet.rotY = 0.6;
            collabResetCamera();
            buildCollabGraph();
        });

        bindCollabPointerEvents();
        bindCollabPanelEvents();
        window.addEventListener('resize', throttle(collabResize, 150), { passive: true });

        // Pause the loop when the graph scrolls out of view / tab is hidden
        if ('IntersectionObserver' in window) {
            const io = new IntersectionObserver((entries) => {
                collabNet.visible = entries[0].isIntersecting;
                if (collabNet.visible) ensureCollabRunning();
            }, { threshold: 0.01 });
            io.observe(collabNet.wrap);
        }

        // Canvas and map colours come from theme tokens; repaint on a switch.
        new MutationObserver(() => {
            if (collabNet.mode === 'country') renderCollabMap(false);
            else ensureCollabRunning();
        }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

        collabNet.initialized = true;
    }

    // Publications may have loaded after the first visit; index them each time.
    collabIndexPublications(collaborationsData);
    renderCollabSummary();

    // The Activities tab becomes visible inside a requestAnimationFrame, so the
    // container may still be display:none (zero width) right now. Wait until it
    // has a real size before sizing the canvas and laying out the graph.
    collabWhenVisible(() => {
        collabResize(true);
        buildCollabGraph();
    });
}

function collabResetCamera() {
    collabNet.zoom = 1;
    collabNet.panX = 0;
    collabNet.panY = 0;
}

/**
 * Run a callback once the network container has a non-zero width, retrying on
 * subsequent animation frames (capped) while the tab finishes becoming visible.
 */
function collabWhenVisible(cb, attempts) {
    attempts = attempts || 0;
    const wrap = collabNet.wrap;
    if (wrap && wrap.getBoundingClientRect().width > 0) {
        cb();
    } else if (attempts < 60) {
        requestAnimationFrame(() => collabWhenVisible(cb, attempts + 1));
    }
}

/**
 * Size the canvas to its container with device-pixel-ratio support. On a
 * later resize the layout is recomputed in place, without the intro motion.
 */
function collabResize(skipRebuild) {
    const { canvas, wrap } = collabNet;
    if (!canvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    if (rect.width === 0) return;
    const dpr = window.devicePixelRatio || 1;
    collabNet.width = rect.width;
    collabNet.height = rect.height;
    collabNet.dpr = dpr;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    collabNet.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (skipRebuild === true) return;
    if (collabNet.mode === 'country') {
        if (collabNet.map) {
            collabNet.map.invalidateSize();
            collabFitMap();
        }
    } else if (collabNet.center) {
        buildCollabGraph({ animate: false });
    }
}

/**
 * Show the canvas or the map for the current mode and keep the toolbar honest
 * (the map has no 3D view).
 */
function collabSyncView() {
    const isMap = collabNet.mode === 'country';
    const wrap = collabNet.wrap;
    if (wrap) {
        wrap.classList.toggle('is-map', isMap);
        wrap.classList.toggle('is-3d', !isMap && collabNet.dim === '3d');
    }
    document.querySelectorAll('.collab-dim-btn').forEach(btn => {
        btn.disabled = isMap;
    });
}

/**
 * Build the node set for the currently selected mode/dimension and (re)start
 * the layout. Works for both the 2D (radial) and 3D (model-space) paths.
 */
function buildCollabGraph(opts) {
    const data = collaborationsData;
    if (!data) return;
    const animate = !(opts && opts.animate === false) && !collabNet.reducedMotion;

    collabSyncView();
    renderCollabPanel();
    collabNet.hovered = null;
    hideCollabTooltip();

    if (collabNet.mode === 'country') {
        renderCollabLegend();
        renderCollabMap(true);
        return;
    }

    const isAuthor = collabNet.mode === 'author';
    const items = isAuthor ? (data.byAuthor || []) : (data.byUniversity || []);
    const cx = collabNet.width / 2;
    const cy = collabNet.height / 2;
    const maxPapers = Math.max(1, ...items.map(i => i.papers || 1));
    const is3D = collabNet.dim === '3d';
    const n = items.length;
    // Nodes shrink with the canvas so a phone-sized ring doesn't overlap.
    const sizeScale = Math.max(0.55, Math.min(1, Math.min(collabNet.width, collabNet.height) / 620));

    collabNet.center = {
        id: '__center__',
        label: (data.center && data.center.shortName) || 'Me',
        isCenter: true,
        papers: 0,
        x: cx, y: cy, tx: cx, ty: cy,
        mx: 0, my: 0, mz: 0,
        vx: 0, vy: 0, vz: 0,
        r: (isAuthor ? 24 : 28) * Math.max(0.75, sizeScale),
        sr: 24,
        sx: cx, sy: cy,
        scale: 1,
        depth: 0,
        slot: -1,
        neighbours: new Set(),
        meta: data.center || {}
    };

    collabNet.nodes = items.map((item, i) => {
        const group = isAuthor ? collabAffiliation(item) : item.name;
        const papers = item.papers || 1;
        const share = Math.sqrt(papers / maxPapers);
        const r = (isAuthor ? 5 + 11 * share : 9 + 17 * share) * sizeScale;

        // 3D seed position: even spread on a sphere (Fibonacci), radius by ties
        const k = i + 0.5;
        const phi = Math.acos(1 - (2 * k) / Math.max(1, n));
        const theta = Math.PI * (1 + Math.sqrt(5)) * k;
        const rad3d = 240 - 95 * (papers / maxPapers);

        return {
            id: 'n' + i,
            index: i,
            label: item.name,
            papers,
            isCenter: false,
            group,
            slot: group in collabNet.groupIndex ? collabNet.groupIndex[group] : -1,
            x: cx, y: cy, tx: cx, ty: cy,
            angle: 0,
            mx: Math.sin(phi) * Math.cos(theta) * rad3d,
            my: Math.sin(phi) * Math.sin(theta) * rad3d,
            mz: Math.cos(phi) * rad3d,
            vx: 0, vy: 0, vz: 0,
            r,
            sr: r,
            sx: cx, sy: cy,
            scale: 1,
            depth: 0,
            fixed: false,
            neighbours: new Set(),
            meta: {
                affiliation: isAuthor ? collabAffiliation(item) : item.name,
                country: item.country || '',
                authors: item.authors
            }
        };
    });

    collabNet.links = isAuthor ? collabBuildLinks(collabNet.nodes) : [];
    collabNet.maxPapers = maxPapers;
    collabNet.is3D = is3D;
    // Size the 3D sphere to the canvas: its outer shell (~250 model units)
    // swells by up to ~1.45x when rotated toward the camera.
    collabNet.scale3d = Math.max(0.4, Math.min(1, (Math.min(collabNet.width, collabNet.height) / 2 - 40) / 360));
    if (is3D) {
        for (const node of collabNet.nodes) {
            node.mx *= collabNet.scale3d;
            node.my *= collabNet.scale3d;
            node.mz *= collabNet.scale3d;
        }
    }

    if (!is3D) collabLayoutRadial(animate);
    collabNet.intro = animate ? 0 : 1;

    renderCollabLegend();
    startCollabSim();
}

/**
 * Co-author to co-author links: every pair of collaborators who appear on the
 * same publication, weighted by how many they share.
 */
function collabBuildLinks(nodes) {
    const counts = new Map();
    for (const set of collabNet.pubAuthorSets) {
        for (let i = 0; i < set.length; i++) {
            for (let j = i + 1; j < set.length; j++) {
                const a = Math.min(set[i], set[j]);
                const b = Math.max(set[i], set[j]);
                const key = a + ':' + b;
                counts.set(key, (counts.get(key) || 0) + 1);
            }
        }
    }
    const links = [];
    counts.forEach((count, key) => {
        const [ai, bi] = key.split(':').map(Number);
        const a = nodes[ai];
        const b = nodes[bi];
        if (!a || !b) return;
        a.neighbours.add(b);
        b.neighbours.add(a);
        links.push({ a, b, count });
    });
    return links;
}

/**
 * Radial ego layout. Collaborators are grouped by organisation into sectors of
 * one ring (largest organisation first, clockwise from the top) and sorted by
 * joint publications within each sector; tie strength shows in node size and
 * line weight. Each sector is marked by an arc just outside the ring, and the
 * labels run outward along each spoke beyond it, so they never collide
 * however many names there are. With only a few nodes, stronger ties are
 * pulled closer to the centre instead and labels sit beside the nodes.
 */
function collabLayoutRadial(animate) {
    const { nodes, width, height } = collabNet;
    const cx = width / 2;
    const cy = height / 2;
    const n = nodes.length;
    const rotated = n > 10;
    const maxNodeR = Math.max(...nodes.map(nd => nd.r), 0);
    const S = Math.min(width, height) / 2 - 12;
    const font = S < 220 ? 10 : 11.5;

    let labelMax, rOut, rIn, rArc, labelStart;
    if (rotated) {
        labelMax = Math.max(52, Math.min(128, S * 0.42));
        rOut = S - labelMax - 14 - maxNodeR;
        if (rOut < S * 0.4) {
            // Narrow screens: give the ring its room and shorten the labels.
            rOut = S * 0.4;
            labelMax = Math.max(40, S - rOut - 14 - maxNodeR);
        }
        rIn = rOut;
        rArc = rOut + maxNodeR + 5;
        labelStart = rArc + 6;
    } else {
        // Few nodes: horizontal labels beside each node, so the ring can use
        // more of the height and the labels spill into the spare width.
        labelMax = Math.max(80, Math.min(190, width / 2 - S * 0.62 - maxNodeR - 16));
        rOut = S * 0.62;
        rIn = S * 0.4;
        rArc = 0;
        labelStart = 0;
    }

    // Order: by organisation slot, then organisation (keeps the "Other"
    // organisations in contiguous arcs), then joint publications, then name.
    const order = nodes.slice().sort((a, b) =>
        (a.slot < 0 ? 999 : a.slot) - (b.slot < 0 ? 999 : b.slot) ||
        String(a.group).localeCompare(String(b.group)) ||
        b.papers - a.papers ||
        a.label.localeCompare(b.label));

    const groupsInOrder = [];
    order.forEach(nd => {
        const last = groupsInOrder[groupsInOrder.length - 1];
        if (!last || last.group !== nd.group) {
            groupsInOrder.push({ group: nd.group, slot: nd.slot, members: [nd] });
        } else {
            last.members.push(nd);
        }
    });

    const gap = rotated && groupsInOrder.length > 1 ? 0.9 : 0;
    const units = n + gap * groupsInOrder.length;
    const unit = (Math.PI * 2) / Math.max(1, units);
    const maxPapers = collabNet.maxPapers || 1;
    const logMax = Math.log(Math.max(2, maxPapers));

    let cursor = gap / 2;
    const start = -Math.PI / 2;
    const groups = [];
    for (const g of groupsInOrder) {
        const a0 = start + cursor * unit;
        for (const nd of g.members) {
            const angle = start + (cursor + 0.5) * unit;
            const t = Math.log(Math.max(1, nd.papers)) / logMax;
            const radius = rOut - t * (rOut - rIn);
            nd.angle = angle;
            nd.tx = cx + Math.cos(angle) * radius;
            nd.ty = cy + Math.sin(angle) * radius;
            if (!animate) {
                nd.x = nd.tx;
                nd.y = nd.ty;
            } else {
                nd.x = cx;
                nd.y = cy;
            }
            cursor += 1;
        }
        groups.push({ name: g.group, slot: g.slot, a0, a1: start + cursor * unit });
        cursor += gap;
    }

    collabNet.groups = groups;
    collabNet.layout = { cx, cy, rArc, rRing: rOut, labelStart, labelMax, font, rotated };
}

/**
 * Render the colour key: organisations in the author view. The other views
 * label every node directly, so they need no key.
 */
function renderCollabLegend() {
    const legend = collabNet.legend;
    if (!legend) return;
    if (collabNet.mode !== 'author') {
        legend.innerHTML = '';
        legend.hidden = true;
        return;
    }
    const seen = new Map();
    let others = 0;
    (collaborationsData.byAuthor || []).forEach(author => {
        const org = collabAffiliation(author);
        if (!org || seen.has(org)) return;
        seen.set(org, collabNet.groupIndex[org]);
        if (!(org in collabNet.groupIndex)) others++;
    });
    const items = Array.from(seen.entries())
        .filter(([, slot]) => slot != null)
        .sort((a, b) => a[1] - b[1]);
    if (others) items.push([others === 1 ? 'Other organization' : `${others} other organizations`, -1]);
    legend.innerHTML = '<div class="legend-title">Affiliation</div>' + items
        .map(([org, slot]) => `<div class="legend-item"><span class="legend-dot" style="background:${collabColorVar(slot)}"></span>${escapeHtml(org)}</div>`)
        .join('');
    // Toggled with [hidden] rather than an inline display, so the stylesheet
    // can still hide the key on small screens.
    legend.hidden = !items.length;
}

/**
 * Headline figures above the graph.
 */
function renderCollabSummary() {
    const el = document.getElementById('collab-summary');
    const data = collaborationsData;
    if (!el || !data) return;
    const stats = [
        [(data.byAuthor || []).length, 'Co-authors'],
        [(data.byUniversity || []).length, 'Organizations'],
        [(data.byCountry || []).length, 'Countries'],
        [collabNet.coauthoredOutputs, 'Co-authored publications']
    ].filter(([value]) => value > 0);
    el.innerHTML = stats
        .map(([value, label]) => `<div class="collab-stat"><span class="collab-stat-value">${value}</span><span class="collab-stat-label">${label}</span></div>`)
        .join('');
}

/**
 * Ranked list beside the graph: one row per collaborator, organisation or
 * country, with a bar for joint publications. Rows and nodes highlight each
 * other on hover.
 */
function renderCollabPanel() {
    const panel = collabNet.panel;
    const data = collaborationsData;
    if (!panel || !data) return;

    const mode = collabNet.mode;
    const items = (mode === 'university' ? data.byUniversity
        : mode === 'country' ? data.byCountry
            : data.byAuthor) || [];
    const max = Math.max(1, ...items.map(item => item.papers || 0));
    const sorted = items
        .map((item, index) => ({ item, index }))
        .sort((a, b) => (b.item.papers || 0) - (a.item.papers || 0) ||
            String(a.item.name).localeCompare(String(b.item.name)));

    const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
    const rows = sorted.map(({ item, index }) => {
        let slot;
        let meta;
        if (mode === 'country') {
            slot = collabNet.countryIndex[item.name];
            meta = item.authors ? plural(item.authors, 'co-author') : '';
        } else if (mode === 'university') {
            slot = collabNet.groupIndex[item.name];
            meta = [item.country, item.authors ? plural(item.authors, 'co-author') : '']
                .filter(Boolean).join(' · ');
        } else {
            const org = collabAffiliation(item);
            slot = collabNet.groupIndex[org];
            meta = [org, item.country].filter(Boolean).join(' · ');
        }
        const papers = item.papers || 0;
        const pct = Math.max(4, Math.round((papers / max) * 100));
        return `
            <li>
                <button type="button" class="collab-row" data-idx="${index}" style="--row-color:${collabColorVar(slot)}"
                    aria-label="${escapeHtml(item.name)}, ${plural(papers, 'joint publication')}">
                    <span class="collab-row-dot" aria-hidden="true"></span>
                    <span class="collab-row-text">
                        <span class="collab-row-name">${escapeHtml(item.name)}</span>
                        ${meta ? `<span class="collab-row-meta">${escapeHtml(meta)}</span>` : ''}
                    </span>
                    <span class="collab-row-count" aria-hidden="true">${papers}</span>
                    <span class="collab-row-bar" aria-hidden="true"><span style="width:${pct}%"></span></span>
                </button>
            </li>`;
    }).join('');

    const title = mode === 'university' ? 'Organizations' : mode === 'country' ? 'Countries' : 'Co-authors';
    panel.innerHTML = `
        <div class="collab-panel-head">
            <h4>${title}</h4>
            <span>Joint publications</span>
        </div>
        <ol class="collab-list">${rows}</ol>`;
}

/**
 * Mark the panel row for a node (or clear with -1).
 */
function collabMarkRow(index) {
    const panel = collabNet.panel;
    if (!panel) return;
    panel.querySelectorAll('.collab-row.is-active').forEach(row => row.classList.remove('is-active'));
    if (index == null || index < 0) return;
    const row = panel.querySelector(`.collab-row[data-idx="${index}"]`);
    if (row) row.classList.add('is-active');
}

/**
 * Hovering or focusing a panel row highlights its node (or map marker).
 */
function bindCollabPanelEvents() {
    const panel = collabNet.panel;
    if (!panel) return;

    const activate = (row) => {
        const index = Number(row.dataset.idx);
        collabMarkRow(index);
        if (collabNet.mode === 'country') {
            const marker = collabNet.mapMarkers[index];
            if (marker) marker.openTooltip();
            return;
        }
        const node = collabNet.nodes[index];
        if (!node) return;
        collabNet.hovered = node;
        collabComputeScreen();
        showCollabTooltip(node, node.sx, node.sy - node.sr);
        ensureCollabRunning();
    };

    const clear = () => {
        collabMarkRow(-1);
        if (collabNet.mode === 'country') {
            Object.values(collabNet.mapMarkers).forEach(m => m.closeTooltip());
            return;
        }
        collabNet.hovered = null;
        hideCollabTooltip();
        ensureCollabRunning();
    };

    panel.addEventListener('mouseover', (e) => {
        const row = e.target.closest('.collab-row');
        if (row) activate(row);
    });
    panel.addEventListener('mouseleave', clear);
    panel.addEventListener('focusin', (e) => {
        const row = e.target.closest('.collab-row');
        if (row) activate(row);
    });
    panel.addEventListener('focusout', (e) => {
        if (!panel.contains(e.relatedTarget)) clear();
    });
}

/**
 * Begin / re-heat the layout (resets layout energy).
 */
function startCollabSim() {
    collabNet.alpha = 1;
    ensureCollabRunning();
}

/**
 * Resume the render loop without re-heating the layout (e.g. hover, orbit).
 */
function ensureCollabRunning() {
    if (!collabNet.running && collabNet.visible && collabNet.mode !== 'country') {
        collabNet.running = true;
        collabNet.rafId = requestAnimationFrame(collabTick);
    }
}

/**
 * Main animation tick: advance the layout (while warm), spin (3D) and draw.
 */
function collabTick() {
    if (!collabNet.visible || collabNet.mode === 'country') {
        collabNet.running = false;
        return;
    }

    const warm = collabNet.alpha > 0.01;
    if (warm) stepCollabPhysics();
    if (collabNet.intro < 1) collabNet.intro = Math.min(1, collabNet.intro + 0.028);

    // Continuous auto-rotation in 3D mode (paused while interacting / inspecting)
    const spinning = collabNet.is3D && collabNet.action === 'none' &&
        !collabNet.hovered && !collabNet.reducedMotion;
    if (spinning) collabNet.rotY += collabNet.autoSpin;

    drawCollab();

    if (warm || spinning || collabNet.intro < 1 || collabNet.hovered || collabNet.action !== 'none') {
        collabNet.rafId = requestAnimationFrame(collabTick);
    } else {
        collabNet.running = false;
    }
}

/**
 * One layout step. In 2D every node eases toward its place on the ring (and
 * springs back there after being dragged); 3D runs a small force simulation.
 */
function stepCollabPhysics() {
    if (collabNet.is3D) { stepCollabPhysics3D(); return; }

    for (const node of collabNet.nodes) {
        if (node.fixed) continue;
        node.x += (node.tx - node.x) * 0.14;
        node.y += (node.ty - node.y) * 0.14;
    }
    collabNet.alpha *= 0.94;
    if (collabNet.alpha <= 0.01) {
        for (const node of collabNet.nodes) {
            if (node.fixed) continue;
            node.x = node.tx;
            node.y = node.ty;
        }
    }
}

/**
 * One step of the 3D force-directed layout (model space, origin-centred).
 */
function stepCollabPhysics3D() {
    const nodes = collabNet.nodes;
    const center = collabNet.center;
    const maxPapers = collabNet.maxPapers || 1;
    const alpha = collabNet.alpha;

    center.mx = 0; center.my = 0; center.mz = 0;

    // Repulsion between satellite nodes (3D)
    for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
            const b = nodes[j];
            let dx = a.mx - b.mx;
            let dy = a.my - b.my;
            let dz = a.mz - b.mz;
            let dist2 = dx * dx + dy * dy + dz * dz;
            if (dist2 < 1) { dist2 = 1; dx = Math.random(); dy = Math.random(); dz = Math.random(); }
            const dist = Math.sqrt(dist2);
            const s3 = collabNet.scale3d || 1;
            const strength = (5200 * s3 * s3 + (a.r + b.r) * (a.r + b.r)) / dist2;
            const fx = (dx / dist) * strength * alpha;
            const fy = (dy / dist) * strength * alpha;
            const fz = (dz / dist) * strength * alpha;
            a.vx += fx; a.vy += fy; a.vz += fz;
            b.vx -= fx; b.vy -= fy; b.vz -= fz;
        }
    }

    // Spring toward the origin: stronger ties sit closer
    for (const node of nodes) {
        const dist = Math.sqrt(node.mx * node.mx + node.my * node.my + node.mz * node.mz) || 1;
        const rest = (250 - 100 * (node.papers / maxPapers)) * (collabNet.scale3d || 1);
        const disp = dist - rest;
        const k = 0.02;
        node.vx -= (node.mx / dist) * disp * k * alpha;
        node.vy -= (node.my / dist) * disp * k * alpha;
        node.vz -= (node.mz / dist) * disp * k * alpha;
    }

    // Integrate + damping
    for (const node of nodes) {
        node.vx *= 0.85; node.vy *= 0.85; node.vz *= 0.85;
        node.mx += node.vx * 0.5;
        node.my += node.vy * 0.5;
        node.mz += node.vz * 0.5;
    }

    collabNet.alpha *= 0.97;
}

/**
 * Project a model-space point (x,y,z) to screen space using the current
 * rotation and a simple perspective camera.
 */
function collabProject(x, y, z) {
    const cosY = Math.cos(collabNet.rotY), sinY = Math.sin(collabNet.rotY);
    const cosX = Math.cos(collabNet.rotX), sinX = Math.sin(collabNet.rotX);
    // Yaw (around Y), then pitch (around X)
    const x1 = x * cosY + z * sinY;
    const z1 = -x * sinY + z * cosY;
    const y2 = y * cosX - z1 * sinX;
    const z2 = y * sinX + z1 * cosX;
    const focal = collabNet.focal;
    const scale = focal / (focal + z2);
    return {
        x: collabNet.width / 2 + x1 * scale,
        y: collabNet.height / 2 + y2 * scale,
        scale,
        depth: z2
    };
}

/**
 * Apply the shared camera (zoom about the canvas centre + pan) to a point.
 */
function collabApplyCamera(px, py) {
    const cx = collabNet.width / 2, cy = collabNet.height / 2;
    return {
        x: (px - cx) * collabNet.zoom + cx + collabNet.panX,
        y: (py - cy) * collabNet.zoom + cy + collabNet.panY
    };
}

/**
 * Inverse of collabApplyCamera: screen point -> pre-camera (world) point.
 */
function collabScreenToWorld(sx, sy) {
    const cx = collabNet.width / 2, cy = collabNet.height / 2;
    return {
        x: (sx - collabNet.panX - cx) / collabNet.zoom + cx,
        y: (sy - collabNet.panY - cy) / collabNet.zoom + cy
    };
}

/**
 * Compute final screen coords (sx, sy, sr, depth) for every node + the centre,
 * handling the 2D and 3D (projected) cases plus the camera.
 */
function collabComputeScreen() {
    const { center, nodes } = collabNet;
    if (!center) return;
    const is3D = collabNet.is3D;
    const z = collabNet.zoom;

    const place = (node, pre) => {
        const s = collabApplyCamera(pre.x, pre.y);
        node.sx = s.x;
        node.sy = s.y;
        node.scale = pre.scale;
        node.depth = pre.depth;
        node.sr = node.r * pre.scale * z;
    };

    const cPre = is3D
        ? collabProject(center.mx, center.my, center.mz)
        : { x: collabNet.width / 2, y: collabNet.height / 2, scale: 1, depth: 0 };
    place(center, cPre);

    let minD = Infinity, maxD = -Infinity;
    for (const node of nodes) {
        const pre = is3D
            ? collabProject(node.mx, node.my, node.mz)
            : { x: node.x, y: node.y, scale: 1, depth: 0 };
        place(node, pre);
        if (pre.depth < minD) minD = pre.depth;
        if (pre.depth > maxD) maxD = pre.depth;
    }
    collabNet._minD = minD;
    collabNet._dRange = (maxD - minD) || 1;
}

function collabEase(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Draw the graph. Layers, back to front: organisation arcs, co-author links,
 * links to the centre, nodes, labels, and the hovered link's count.
 * Hovering a collaborator isolates them, their link to the centre and their
 * own co-authors; everything else fades back.
 */
function drawCollab() {
    const { ctx, width, height, center, nodes, hovered } = collabNet;
    if (!ctx || !center) return;

    collabComputeScreen();
    ctx.clearRect(0, 0, width, height);

    const theme = collabReadPalette();
    const is3D = collabNet.is3D;
    const z = collabNet.zoom;
    const zs = Math.max(0.6, Math.min(1.6, z));
    const maxPapers = collabNet.maxPapers || 1;
    const layout = collabNet.layout || {};
    const intro = collabEase(collabNet.intro);
    const labelIntro = collabEase(Math.max(0, (collabNet.intro - 0.45) / 0.55));
    const depthAlpha = (d) => is3D
        ? 0.35 + 0.65 * (1 - (d - collabNet._minD) / collabNet._dRange)
        : 1;
    const focus = hovered && !hovered.isCenter ? hovered : null;
    const related = (node) => !focus || node === focus || focus.neighbours.has(node);
    const colorOf = (node) => collabSlotColor(theme, node.slot);

    ctx.lineCap = 'round';

    // 1. Organisation arcs around the outside of the ring
    if (!is3D && layout.rotated && collabNet.groups.length > 1) {
        const c = collabApplyCamera(layout.cx, layout.cy);
        const pad = 0.012;
        for (const g of collabNet.groups) {
            const dim = focus && focus.group !== g.name;
            ctx.beginPath();
            ctx.arc(c.x, c.y, layout.rArc * z, g.a0 + pad, Math.max(g.a0 + pad, g.a1 - pad));
            ctx.strokeStyle = collabSlotColor(theme, g.slot);
            ctx.globalAlpha = (dim ? 0.25 : 0.85) * labelIntro;
            ctx.lineWidth = 3 * zs;
            ctx.lineCap = 'butt';
            ctx.stroke();
        }
        ctx.lineCap = 'round';
    }

    // 2. Co-author to co-author links, bowed toward the centre so they bundle
    for (const link of collabNet.links) {
        const { a, b } = link;
        const on = focus && (a === focus || b === focus);
        let alpha = focus ? (on ? 0.7 : 0.04) : 0.2;
        if (is3D) alpha *= (depthAlpha(a.depth) + depthAlpha(b.depth)) / 2;
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        if (is3D) {
            ctx.lineTo(b.sx, b.sy);
        } else {
            const mx = (a.sx + b.sx) / 2;
            const my = (a.sy + b.sy) / 2;
            const qx = mx + (center.sx - mx) * 0.6;
            const qy = my + (center.sy - my) * 0.6;
            ctx.quadraticCurveTo(qx, qy, b.sx, b.sy);
        }
        ctx.strokeStyle = on ? colorOf(focus) : theme.muted;
        ctx.globalAlpha = alpha * intro;
        ctx.lineWidth = (0.6 + 0.45 * Math.min(link.count, 6)) * zs;
        ctx.stroke();
    }

    // 3. Links to the centre, weighted by joint publications
    const order = is3D ? nodes.slice().sort((a, b) => b.depth - a.depth) : nodes;
    for (const node of order) {
        const w = (0.8 + 3.6 * Math.sqrt(node.papers / maxPapers)) * zs * (is3D ? node.scale : 1);
        let alpha = is3D ? 0.45 * depthAlpha(node.depth) : 0.42;
        if (focus) alpha = node === focus ? 0.9 : 0.06;
        ctx.beginPath();
        ctx.moveTo(center.sx, center.sy);
        ctx.lineTo(node.sx, node.sy);
        ctx.strokeStyle = colorOf(node);
        ctx.globalAlpha = alpha * intro;
        ctx.lineWidth = w;
        ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // 4. Nodes, far to near in 3D so nearer ones overlap farther ones
    const all = is3D
        ? nodes.concat([center]).sort((a, b) => b.depth - a.depth)
        : nodes.concat([center]);
    for (const node of all) {
        const alpha = node.isCenter ? 1 : depthAlpha(node.depth) * (related(node) ? 1 : 0.22);
        collabDrawNode(ctx, node, theme, alpha, node.isCenter ? theme.ink : colorOf(node));
    }

    // 5. Labels on top, each with a halo so it stays legible over the lines.
    //    In 3D only the near side of the sphere is labelled, unless hovered.
    for (const node of nodes) {
        const strong = focus && (node === focus || focus.neighbours.has(node));
        let alpha = (related(node) ? 1 : 0.2) * labelIntro;
        if (is3D) {
            const d = depthAlpha(node.depth);
            alpha = strong || node === hovered ? 1 : (d < 0.62 ? 0 : (d - 0.62) / 0.38) * (related(node) ? 1 : 0.2);
        }
        collabDrawLabel(ctx, node, theme, alpha, strong || node === hovered);
    }
    collabDrawCenterLabel(ctx, center, theme, labelIntro);

    // 6. Joint-publication count on the hovered link
    if (focus) {
        const mx = center.sx + (focus.sx - center.sx) * 0.5;
        const my = center.sy + (focus.sy - center.sy) * 0.5;
        collabDrawEdgeLabel(ctx, String(focus.papers), mx, my, colorOf(focus), zs, 1);
    }
    ctx.globalAlpha = 1;
}

/**
 * Draw a single node: a flat disc with a surface-coloured rim. The centre
 * node carries the researcher's initials.
 */
function collabDrawNode(ctx, node, theme, alpha, color) {
    const r = Math.max(2, node.sr || node.r);
    const isHovered = collabNet.hovered === node;

    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(node.sx, node.sy, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = node.isCenter ? 3 : 1.5;
    ctx.strokeStyle = theme.bg;
    ctx.stroke();

    if (isHovered) {
        ctx.beginPath();
        ctx.arc(node.sx, node.sy, r + 4, 0, Math.PI * 2);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = color;
        ctx.stroke();
    }

    if (node.isCenter) {
        const words = String(node.label).split(/\s+/).filter(Boolean);
        const initials = words.length > 1
            ? words[0][0] + words[words.length - 1][0]
            : (words[0] || '').slice(0, 2);
        ctx.fillStyle = theme.bg;
        ctx.font = `600 ${(r * 0.72).toFixed(1)}px "Source Serif 4", Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(initials, node.sx, node.sy + r * 0.04);
    }
    ctx.globalAlpha = 1;
}

/**
 * Draw a collaborator's name: along its spoke in the ring layout, beside the
 * node when there are only a few, or under it in 3D.
 */
function collabDrawLabel(ctx, node, theme, alpha, strong) {
    if (alpha <= 0.01) return;
    const layout = collabNet.layout || {};
    const is3D = collabNet.is3D;
    const z = collabNet.zoom;
    const zs = Math.max(0.85, Math.min(1.35, z));
    const fs = (is3D ? 11 : (layout.font || 11.5)) * zs;
    const maxW = (is3D ? 140 : (layout.labelMax || 128)) * zs;

    ctx.globalAlpha = alpha;
    ctx.font = `${strong ? 600 : 500} ${fs.toFixed(1)}px Inter, sans-serif`;
    const text = collabTruncate(ctx, node.label, maxW);
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = theme.bg;
    ctx.fillStyle = strong ? theme.text : theme.sub;

    if (!is3D && layout.rotated) {
        const flip = Math.cos(node.angle) < 0;
        // Start past the organisation arc; a node dragged off the ring keeps
        // its label just outside the disc instead.
        const settled = !node.fixed && Math.abs(node.x - node.tx) + Math.abs(node.y - node.ty) < 2;
        const gap = settled ? (layout.labelStart - layout.rRing) * z : node.sr + 5;
        const off = gap * (flip ? -1 : 1);
        ctx.save();
        ctx.translate(node.sx, node.sy);
        ctx.rotate(flip ? node.angle + Math.PI : node.angle);
        ctx.textAlign = flip ? 'right' : 'left';
        ctx.textBaseline = 'middle';
        ctx.strokeText(text, off, 0);
        ctx.fillText(text, off, 0);
        ctx.restore();
    } else if (!is3D) {
        const right = node.sx >= collabNet.center.sx - 1;
        const x = node.sx + (node.sr + 8) * (right ? 1 : -1);
        ctx.textAlign = right ? 'left' : 'right';
        ctx.textBaseline = 'alphabetic';
        ctx.strokeText(text, x, node.sy - 1);
        ctx.fillText(text, x, node.sy - 1);
        // Second line: the tie strength, in the node's colour
        const sub = `${node.papers} joint publication${node.papers === 1 ? '' : 's'}`;
        ctx.font = `500 ${(fs * 0.88).toFixed(1)}px Inter, sans-serif`;
        ctx.textBaseline = 'top';
        ctx.fillStyle = theme.muted;
        ctx.strokeText(sub, x, node.sy + 3);
        ctx.fillText(sub, x, node.sy + 3);
    } else {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.strokeText(text, node.sx, node.sy + node.sr + 4);
        ctx.fillText(text, node.sx, node.sy + node.sr + 4);
    }
    ctx.globalAlpha = 1;
}

function collabDrawCenterLabel(ctx, center, theme, alpha) {
    const zs = Math.max(0.85, Math.min(1.35, collabNet.zoom * (collabNet.is3D ? center.scale : 1)));
    ctx.globalAlpha = alpha;
    ctx.font = `600 ${(12.5 * zs).toFixed(1)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = theme.bg;
    ctx.fillStyle = theme.text;
    const y = center.sy + center.sr + 6;
    ctx.strokeText(center.label, center.sx, y);
    ctx.fillText(center.label, center.sx, y);
    ctx.globalAlpha = 1;
}

/**
 * Draw an edge weight pill (the joint-paper count).
 */
function collabDrawEdgeLabel(ctx, label, mx, my, color, scale, alpha) {
    const fs = Math.max(9, 11 * scale);
    ctx.font = '700 ' + fs.toFixed(1) + 'px Inter, sans-serif';
    const tw = ctx.measureText(label).width;
    const padX = 7 * scale, h = 19 * scale;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.roundRect(mx - tw / 2 - padX, my - h / 2, tw + padX * 2, h, h / 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, mx, my + 0.5);
    ctx.globalAlpha = 1;
}

// --------------------------------------------------------------------------
// Country view: a map with arcs from the home institution
// --------------------------------------------------------------------------

/**
 * Points along a gentle arc between two [lat, lng] positions.
 */
function collabArc(from, to) {
    const [lat1, lng1] = from;
    const [lat2, lng2] = to;
    const dx = lng2 - lng1;
    const dy = lat2 - lat1;
    // Control point off to one side of the midpoint, a quarter of the length out
    const cx = (lng1 + lng2) / 2 - dy * 0.25;
    const cy = (lat1 + lat2) / 2 + dx * 0.25;
    const points = [];
    for (let i = 0; i <= 40; i++) {
        const t = i / 40;
        const u = 1 - t;
        points.push([
            u * u * lat1 + 2 * u * t * cy + t * t * lat2,
            u * u * lng1 + 2 * u * t * cx + t * t * lng2
        ]);
    }
    return points;
}

function collabSetMapTiles() {
    const map = collabNet.map;
    if (!map) return;
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    // Esri's grey canvas basemaps: quiet enough for the arcs to carry the
    // colour, and served without an API key.
    const style = dark ? 'World_Dark_Gray_Base' : 'World_Light_Gray_Base';
    if (collabNet.mapTiles && collabNet.mapTiles._collabStyle === style) return;
    if (collabNet.mapTiles) collabNet.mapTiles.remove();
    collabNet.mapTiles = L.tileLayer(`https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${style}/MapServer/tile/{z}/{y}/{x}`, {
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
        maxZoom: 16
    }).addTo(map);
    collabNet.mapTiles._collabStyle = style;
}

function collabFitMap() {
    const map = collabNet.map;
    if (!map || !collabNet.mapBounds) return;
    map.invalidateSize();
    map.fitBounds(collabNet.mapBounds, { padding: [70, 70], maxZoom: 4 });
}

/**
 * Draw (or redraw) the country map. `fit` re-frames the view on all markers.
 */
function renderCollabMap(fit) {
    const el = document.getElementById('collab-map');
    const data = collaborationsData;
    if (!el || !data || typeof L === 'undefined') return;

    if (!collabNet.map) {
        collabNet.map = L.map(el, {
            worldCopyJump: true,
            scrollWheelZoom: false,
            zoomSnap: 0.25,
            minZoom: 1
        });
        // Wheel zoom only once the map has been clicked, so it never traps
        // the page scroll on the way past.
        collabNet.map.on('click focus', () => collabNet.map.scrollWheelZoom.enable());
        collabNet.map.on('mouseout blur', () => collabNet.map.scrollWheelZoom.disable());
    }
    const map = collabNet.map;
    collabSetMapTiles();

    if (collabNet.mapLayer) collabNet.mapLayer.remove();
    const layer = L.layerGroup().addTo(map);
    collabNet.mapLayer = layer;
    collabNet.mapMarkers = {};

    const theme = collabReadPalette();
    const home = data.center || {};
    const hasHome = home.lat != null && home.lng != null;
    const countries = (data.byCountry || []);
    const max = Math.max(1, ...countries.map(c => c.papers || 0));
    const points = [];
    const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

    // Arcs first, so the markers sit on top of them
    countries.forEach(country => {
        if (country.lat == null || country.lng == null) return;
        if (!hasHome || country.name === home.country) return;
        const color = collabSlotColor(theme, collabNet.countryIndex[country.name]);
        L.polyline(collabArc([home.lat, home.lng], [country.lat, country.lng]), {
            color,
            weight: 1.5 + 3 * Math.sqrt((country.papers || 1) / max),
            opacity: 0.75,
            interactive: false
        }).addTo(layer);
    });

    countries.forEach((country, index) => {
        if (country.lat == null || country.lng == null) return;
        const color = collabSlotColor(theme, collabNet.countryIndex[country.name]);
        const radius = 7 + 17 * Math.sqrt((country.papers || 1) / max);
        const isHome = country.name === home.country;
        const marker = L.circleMarker([country.lat, country.lng], {
            radius,
            color: theme.bg,
            weight: 2,
            fillColor: color,
            fillOpacity: 0.82
        }).addTo(layer);
        const lines = [
            `<strong>${escapeHtml(country.name)}</strong>`,
            isHome ? 'Home country' : '',
            country.authors ? plural(country.authors, 'co-author') : '',
            plural(country.papers || 0, 'joint publication')
        ].filter(Boolean).join('<br>');
        marker.bindTooltip(lines, { direction: 'top', offset: [0, -radius], className: 'collab-map-tip' });
        marker.on('mouseover', () => collabMarkRow(index));
        marker.on('mouseout', () => collabMarkRow(-1));
        collabNet.mapMarkers[index] = marker;
        points.push([country.lat, country.lng]);
    });

    // Home institution: a small ringed dot on top of its country
    if (hasHome) {
        L.circleMarker([home.lat, home.lng], {
            radius: 4,
            color: theme.ink,
            weight: 3,
            fillColor: theme.bg,
            fillOpacity: 1
        }).bindTooltip(`<strong>${escapeHtml(home.university || 'Home institution')}</strong><br>Home institution`, {
            direction: 'bottom',
            offset: [0, 6],
            className: 'collab-map-tip'
        }).addTo(layer);
        points.push([home.lat, home.lng]);
    }

    collabNet.mapBounds = points.length ? L.latLngBounds(points) : null;
    if (fit) {
        // The map container has only just become visible; size it first.
        requestAnimationFrame(collabFitMap);
    }
}

// --------------------------------------------------------------------------
// Camera, hit testing and interaction
// --------------------------------------------------------------------------

/**
 * Zoom by a multiplicative factor about a screen anchor (defaults to centre).
 */
function collabZoomBy(factor, anchorX, anchorY) {
    const cx = collabNet.width / 2, cy = collabNet.height / 2;
    if (anchorX == null) { anchorX = cx + collabNet.panX; anchorY = cy + collabNet.panY; }
    const world = collabScreenToWorld(anchorX, anchorY);
    const newZoom = Math.max(collabNet.minZoom, Math.min(collabNet.maxZoom, collabNet.zoom * factor));
    collabNet.zoom = newZoom;
    // Keep the anchored world point under the same screen position
    collabNet.panX = anchorX - (world.x - cx) * newZoom - cx;
    collabNet.panY = anchorY - (world.y - cy) * newZoom - cy;
    ensureCollabRunning();
}

/**
 * Fit the whole graph within the viewport. The 2D ring is laid out to fit
 * already, so it just resets the camera; 3D measures the projected extent.
 */
function collabZoomToExtent() {
    const nodes = collabNet.nodes;
    if (!nodes.length) return;
    if (!collabNet.is3D) {
        collabResetCamera();
        ensureCollabRunning();
        return;
    }
    const cx = collabNet.width / 2, cy = collabNet.height / 2;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const acc = (pre, r) => {
        minX = Math.min(minX, pre.x - r); maxX = Math.max(maxX, pre.x + r);
        minY = Math.min(minY, pre.y - r); maxY = Math.max(maxY, pre.y + r);
    };
    acc(collabProject(0, 0, 0), collabNet.center.r);
    for (const node of nodes) {
        const pre = collabProject(node.mx, node.my, node.mz);
        acc(pre, node.r * pre.scale + 26); // pad for labels
    }

    const bw = Math.max(1, maxX - minX), bh = Math.max(1, maxY - minY);
    const margin = 50;
    const zoom = Math.max(collabNet.minZoom, Math.min(collabNet.maxZoom,
        Math.min((collabNet.width - margin) / bw, (collabNet.height - margin) / bh)));
    const bcx = (minX + maxX) / 2, bcy = (minY + maxY) / 2;
    collabNet.zoom = zoom;
    collabNet.panX = -(bcx - cx) * zoom;
    collabNet.panY = -(bcy - cy) * zoom;
    ensureCollabRunning();
}

/**
 * Truncate a label to a pixel width, adding an ellipsis.
 */
function collabTruncate(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) {
        t = t.slice(0, -1);
    }
    return t + '…';
}

/**
 * Find the node under a given canvas coordinate. In 3D, ties are broken by
 * depth so the nearest (front-most) node wins.
 */
function collabNodeAt(x, y) {
    const all = collabNet.nodes.concat(collabNet.center ? [collabNet.center] : []);
    let best = null;
    for (const node of all) {
        const rr = Math.max(8, (node.sr || node.r) + 4);
        const dx = x - (node.sx != null ? node.sx : node.x);
        const dy = y - (node.sy != null ? node.sy : node.y);
        if (dx * dx + dy * dy <= rr * rr) {
            if (!best || node.depth < best.depth) best = node;
        }
    }
    return best;
}

/**
 * Pointer interactions: hover/tooltip, orbit (3D), pan (both) and node drag (2D).
 * - Plain drag: rotate in 3D, pan in 2D (or move a node when grabbed).
 * - Shift-drag or middle-button drag: pan in either mode.
 * - Mouse wheel: zoom toward the cursor.
 */
function bindCollabPointerEvents() {
    const canvas = collabNet.canvas;

    const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const src = e.touches ? e.touches[0] : e;
        return { x: src.clientX - rect.left, y: src.clientY - rect.top };
    };

    const setCursor = (c) => { canvas.style.cursor = c; };

    const onMove = (e) => {
        const { x, y } = getPos(e);
        const dx = x - collabNet.lastPx;
        const dy = y - collabNet.lastPy;

        if (collabNet.action === 'pan') {
            collabNet.panX += dx;
            collabNet.panY += dy;
            collabNet.lastPx = x; collabNet.lastPy = y;
            hideCollabTooltip();
            ensureCollabRunning();
            if (e.cancelable) e.preventDefault();
            return;
        }

        if (collabNet.action === 'orbit') {
            // Horizontal drag rotates yaw (intuitive direction), vertical rotates pitch
            collabNet.rotY -= dx * 0.008;
            collabNet.rotX += dy * 0.008;
            collabNet.rotX = Math.max(-1.45, Math.min(1.45, collabNet.rotX));
            collabNet.lastPx = x; collabNet.lastPy = y;
            hideCollabTooltip();
            ensureCollabRunning();
            if (e.cancelable) e.preventDefault();
            return;
        }

        if (collabNet.action === 'dragNode' && collabNet.dragNode) {
            const w = collabScreenToWorld(x, y);
            collabNet.dragNode.x = w.x;
            collabNet.dragNode.y = w.y;
            showCollabTooltip(collabNet.dragNode, x, y);
            startCollabSim();
            if (e.cancelable) e.preventDefault();
            return;
        }

        const node = collabNodeAt(x, y);
        collabNet.hovered = node;
        collabMarkRow(node && !node.isCenter ? node.index : -1);
        setCursor(node ? 'pointer' : 'grab');
        if (node) showCollabTooltip(node, x, y);
        else hideCollabTooltip();
        ensureCollabRunning();
    };

    const onDown = (e) => {
        const { x, y } = getPos(e);
        collabNet.lastPx = x; collabNet.lastPy = y;
        const wantPan = e.shiftKey || e.button === 1;
        const node = collabNodeAt(x, y);

        if (wantPan) {
            collabNet.action = 'pan';
            setCursor('grabbing');
        } else if (node && !node.isCenter && !collabNet.is3D) {
            // 2D: pull a node out; it springs back to the ring on release
            collabNet.action = 'dragNode';
            collabNet.dragNode = node;
            collabNet.hovered = node;
            node.fixed = true;
        } else if (node) {
            // Clicked a node (or centre): keep the tooltip, don't start a drag gesture
            collabNet.hovered = node;
            collabNet.action = 'none';
            if (e.touches) showCollabTooltip(node, x, y);
            ensureCollabRunning();
            return;
        } else if (collabNet.is3D) {
            collabNet.action = 'orbit';
            setCursor('grabbing');
        } else {
            collabNet.action = 'pan';
            setCursor('grabbing');
        }
        if (e.cancelable) e.preventDefault();
    };

    const onUp = () => {
        if (collabNet.action === 'dragNode' && collabNet.dragNode) {
            collabNet.dragNode.fixed = false;
            collabNet.dragNode = null;
            startCollabSim();
        }
        collabNet.action = 'none';
        setCursor('grab');
    };

    const onWheel = (e) => {
        const { x, y } = getPos(e);
        const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
        collabZoomBy(factor, x, y);
        e.preventDefault();
    };

    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('mouseleave', () => {
        if (collabNet.action === 'none') {
            collabNet.hovered = null;
            collabMarkRow(-1);
            hideCollabTooltip();
            ensureCollabRunning();
        }
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('touchstart', onDown, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);

    // Zoom / fit control buttons
    const controls = document.getElementById('collab-controls');
    if (controls) {
        controls.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-act]');
            if (!btn) return;
            const act = btn.dataset.act;
            if (act === 'zoom-in') collabZoomBy(1.2);
            else if (act === 'zoom-out') collabZoomBy(1 / 1.2);
            else if (act === 'fit') collabZoomToExtent();
        });
    }
}

/**
 * Show the hover tooltip for a node.
 */
function showCollabTooltip(node, x, y) {
    const tt = collabNet.tooltip;
    if (!tt) return;
    const m = node.meta || {};
    const row = (icon, text) => `<div class="tt-row"><i class="fas ${icon}"></i>${escapeHtml(String(text))}</div>`;
    let rows = '';
    if (node.isCenter) {
        if (m.university) rows += row('fa-building-columns', m.university);
        if (m.country) rows += row('fa-globe', m.country);
    } else {
        if (collabNet.mode === 'author') {
            if (m.affiliation) rows += row('fa-building-columns', m.affiliation);
            if (m.country) rows += row('fa-globe', m.country);
        } else {
            if (m.country) rows += row('fa-globe', m.country);
            if (m.authors) rows += row('fa-users', `${m.authors} co-author${m.authors === 1 ? '' : 's'}`);
        }
        rows += row('fa-file-lines', `${node.papers} joint publication${node.papers === 1 ? '' : 's'}`);
        const shared = node.neighbours ? node.neighbours.size : 0;
        if (shared) rows += row('fa-share-nodes', `Also published with ${shared} other co-author${shared === 1 ? '' : 's'} here`);
    }
    tt.innerHTML = `<div class="tt-title">${escapeHtml(node.label)}</div>${rows}`;
    tt.style.left = x + 'px';
    tt.style.top = y + 'px';
    tt.hidden = false;
}

function hideCollabTooltip() {
    if (collabNet.tooltip) collabNet.tooltip.hidden = true;
}
