document.addEventListener('DOMContentLoaded', () => {
    // State
    let currentGenre = 'All';
    let currentStatus = 'All';
    let currentSort = 'popular';
    let currentQuery = '';
    let currentPage = 1;
    let currentStreams = null;
    let scheduleData = null;
    let currentScheduleDay = getTodayIndonesian();

    function getTodayIndonesian() {
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const todayIdx = new Date().getDay();
        return days[todayIdx] || 'Senin';
    }

    // DOM Elements
    const animeGrid = document.getElementById('anime-grid');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('btn-clear-search');
    const filterStatus = document.getElementById('filter-status');
    const filterSort = document.getElementById('filter-sort');
    const totalCountEl = document.getElementById('total-count');
    const paginationEl = document.getElementById('pagination');

    // Hero Elements
    const heroTitle = document.getElementById('hero-title');
    const heroYear = document.getElementById('hero-year');
    const heroStatus = document.getElementById('hero-status');
    const heroRating = document.getElementById('hero-rating');
    const heroGenre = document.getElementById('hero-genre');
    const heroBackdrop = document.getElementById('hero-backdrop');
    const btnHeroPlay = document.getElementById('btn-hero-play');
    const btnHeroDetail = document.getElementById('btn-hero-detail');

    // Modals
    const videoModal = document.getElementById('video-modal');
    const videoPlayer = document.getElementById('main-video-player');
    const playerEpTitle = document.getElementById('player-ep-title');
    const closeVideoModal = document.getElementById('close-video-modal');

    const detailModal = document.getElementById('detail-modal');
    const closeDetailModal = document.getElementById('close-detail-modal');

    const apiTesterModal = document.getElementById('api-tester-modal');
    const btnOpenApiTester = document.getElementById('btn-open-api-tester');
    const closeApiTester = document.getElementById('close-api-tester');
    const btnRunApiTest = document.getElementById('btn-run-api-test');
    const apiEndpointSelect = document.getElementById('api-endpoint-select');
    const apiJsonOutput = document.getElementById('api-json-output');

    let heroCid = 5188;

    let terbaruPage = 1;
    let popularPage = 1;
    let completePage = 1;

    async function init() {
        loadStats();
        loadPopularForHero();
        fetchTerbaruPage(1);
        fetchPopularPage(1);
        fetchCompletePage(1);
        fetchCatalog();
        setupEventListeners();
    }

    // Initialize Application
    init();


    // ==========================================
    // WATCH HISTORY & PROGRESS MANAGER (Local Storage)
    // ==========================================
    const HISTORY_STORAGE_KEY = 'animi_watch_history';
    let currentPlayingMeta = null;
    let cameFromDetail = false;

    function getWatchHistory() {
        try {
            const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function saveWatchProgress(currentTime, duration) {
        if (!currentPlayingMeta || !currentPlayingMeta.cid || !currentTime || currentTime < 3) return;

        let history = getWatchHistory();
        // Overwrite existing entry for the same anime (cid) to prevent duplicates
        history = history.filter(item => item.cid !== currentPlayingMeta.cid);

        const newEntry = {
            cid: currentPlayingMeta.cid,
            vid: currentPlayingMeta.vid,
            animeTitle: currentPlayingMeta.animeTitle,
            epTitle: currentPlayingMeta.epTitle,
            epNumber: currentPlayingMeta.epNumber,
            poster: currentPlayingMeta.poster,
            currentTime: Math.floor(currentTime),
            duration: Math.floor(duration || 1440),
            updatedAt: Date.now()
        };

        history.unshift(newEntry);
        try {
            localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
        } catch (e) {
            console.error('Failed to save history:', e);
        }
    }

    function deleteHistoryItem(cid) {
        let history = getWatchHistory();
        history = history.filter(item => item.cid !== cid);
        try {
            localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
        } catch (e) {}
        renderHistoryPage();
    }

    function clearAllHistory() {
        try {
            localStorage.removeItem(HISTORY_STORAGE_KEY);
        } catch (e) {}
        renderHistoryPage();
    }

    function getAnimeHistory(cid) {
        const history = getWatchHistory();
        return history.find(item => item.cid === cid) || null;
    }

    function formatTime(sec) {
        if (!sec || isNaN(sec)) return '00:00';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    function renderHistoryPage() {
        const grid = document.getElementById('history-grid');
        const clearBtn = document.getElementById('btn-clear-all-history');
        if (!grid) return;

        const history = getWatchHistory();
        if (clearBtn) clearBtn.style.display = history.length > 0 ? 'inline-flex' : 'none';

        if (!history || history.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
                    <i class="fa-solid fa-clock-rotate-left fa-3x" style="margin-bottom: 16px; opacity: 0.4;"></i>
                    <h3>Belum Ada Riwayat Nonton</h3>
                    <p style="margin-top: 8px;">Tonton episode anime favoritmu untuk menyimpan progres menonton secara otomatis.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = history.map(item => {
            const pct = Math.min(100, Math.max(0, Math.round((item.currentTime / (item.duration || 1440)) * 100)));
            const timeStr = `Menit ${formatTime(item.currentTime)} / ${formatTime(item.duration)}`;
            const epLabel = item.epTitle || `Episode ${item.vid}`;
            return `
                <div class="history-card" data-cid="${item.cid}" data-vid="${item.vid}" data-time="${item.currentTime}">
                    <div class="history-poster">
                        <img src="${item.poster}" alt="${item.animeTitle}" loading="lazy" onerror="handleImgError(this, '${item.poster}')">
                        <button class="history-delete-btn" data-del-cid="${item.cid}" title="Hapus dari history">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                        <div class="history-play-overlay"><i class="fa-solid fa-play"></i></div>
                    </div>
                    <div class="history-body">
                        <h4 class="history-title">${item.animeTitle}</h4>
                        <p class="history-ep-label">${epLabel}</p>
                        
                        <div class="history-progress-bar">
                            <div class="history-progress-fill" style="width: ${pct}%;"></div>
                        </div>
                        <div class="history-meta">
                            <span><i class="fa-solid fa-clock"></i> ${timeStr}</span>
                            <span class="badge-pct">${pct}%</span>
                        </div>

                        <button class="btn btn-primary btn-sm btn-resume-play" data-vid="${item.vid}" data-time="${item.currentTime}" style="width: 100%; margin-top: 10px;">
                            <i class="fa-solid fa-play"></i> Lanjutkan (${formatTime(item.currentTime)})
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        grid.querySelectorAll('.history-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const cid = parseInt(btn.dataset.delCid);
                if (cid) deleteHistoryItem(cid);
            });
        });

        grid.querySelectorAll('.btn-resume-play, .history-play-overlay').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = btn.closest('.history-card');
                if (card) {
                    const vid = parseInt(card.dataset.vid);
                    const resumeTime = parseFloat(card.dataset.time) || 0;
                    playVideo(vid, resumeTime);
                }
            });
        });
    }

    function switchView(viewName) {
        document.querySelectorAll('.page-view').forEach(view => {
            view.style.display = 'none';
            view.classList.remove('active');
        });

        const targetView = document.getElementById(`view-${viewName}`);
        if (targetView) {
            targetView.style.display = 'block';
            targetView.classList.add('active');
        }

        document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(item => {
            if (item.dataset.view === viewName) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        if (viewName === 'history') {
            renderHistoryPage();
        } else if (viewName === 'schedule') {
            fetchScheduleData();
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function fetchScheduleData(selectedDay = null) {
        const grid = document.getElementById('schedule-grid');
        if (!grid) return;

        if (!selectedDay) {
            selectedDay = currentScheduleDay || getTodayIndonesian();
        }
        currentScheduleDay = selectedDay;

        // Highlight active day tab
        document.querySelectorAll('.day-tab-btn').forEach(btn => {
            if (btn.dataset.day === currentScheduleDay) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        if (!scheduleData) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
                    <i class="fa-solid fa-spinner fa-spin fa-2x"></i>
                    <p style="margin-top: 12px; font-weight: 500;">Memuat jadwal rilis anime...</p>
                </div>
            `;
            try {
                const res = await fetch('/api/v1/anime/schedule');
                const data = await res.json();
                scheduleData = data.schedule || {};
            } catch (err) {
                console.error('Error fetching schedule data:', err);
                grid.innerHTML = `<div style="grid-column: 1/-1; color: var(--red); text-align: center; padding: 40px;">Gagal memuat jadwal rilis.</div>`;
                return;
            }
        }

        renderScheduleForDay(currentScheduleDay);
    }

    function renderScheduleForDay(day) {
        const grid = document.getElementById('schedule-grid');
        if (!grid) return;

        const items = (scheduleData && scheduleData[day]) ? scheduleData[day] : [];

        if (!items || items.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
                    <i class="fa-solid fa-calendar-xmark fa-3x" style="margin-bottom: 16px; opacity: 0.4;"></i>
                    <h3>Tidak Ada Anime Rilis Hari ${day}</h3>
                    <p style="margin-top: 8px;">Pilih hari lain untuk melihat jadwal rilis anime favoritmu.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = items.map(item => {
            const dayBadge = item.days ? `<span class="badge-schedule-day"><i class="fa-solid fa-calendar-check"></i> ${item.days}</span>` : '';
            return `
                <div class="anime-card" data-cid="${item.cid}">
                    <div class="card-poster">
                        <img src="${item.category_image}" alt="${item.category_name}" loading="lazy" onerror="handleImgError(this, '${item.category_image}')">
                        <span class="card-badge-status ${item.status_video}">${item.status_video}</span>
                        ${dayBadge}
                        <span class="card-rating"><i class="fa-solid fa-star"></i> ${item.rating || '8.0'}</span>
                        <div class="card-overlay-btn"><i class="fa-solid fa-play"></i></div>
                    </div>
                    <div class="card-body">
                        <h3 class="card-title">${item.category_name}</h3>
                        <div class="card-info">
                            <span><i class="fa-solid fa-calendar-day"></i> ${item.days || day}</span>
                            <span><i class="fa-solid fa-video"></i> ${item.video_count || 1} Eps</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        grid.querySelectorAll('.anime-card').forEach(card => {
            card.addEventListener('click', () => {
                const cid = parseInt(card.dataset.cid);
                if (cid) openDetailModal(cid);
            });
        });
    }


    function renderCustomPagination(containerId, page, totalPages, onPageClick) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = '';
        const prevDisabled = page === 1 ? 'disabled' : '';
        html += `<button class="page-btn" data-page="${page - 1}" ${prevDisabled}><i class="fa-solid fa-chevron-left"></i> Prev</button>`;

        let startPage = Math.max(1, page - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }

        if (startPage > 1) {
            html += `<button class="page-btn" data-page="1">1</button>`;
            if (startPage > 2) html += `<span class="page-ellipsis">...</span>`;
        }

        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === page ? 'active' : '';
            html += `<button class="page-btn ${activeClass}" data-page="${i}">${i}</button>`;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) html += `<span class="page-ellipsis">...</span>`;
            html += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
        }

        const nextDisabled = page === totalPages ? 'disabled' : '';
        html += `<button class="page-btn" data-page="${page + 1}" ${nextDisabled}>Next <i class="fa-solid fa-chevron-right"></i></button>`;

        container.innerHTML = html;

        container.querySelectorAll('.page-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.hasAttribute('disabled')) return;
                const targetPage = parseInt(btn.dataset.page);
                if (targetPage && targetPage >= 1 && targetPage <= totalPages && targetPage !== page) {
                    onPageClick(targetPage);
                }
            });
        });
    }

    async function fetchTerbaruPage(page) {
        const latestGrid = document.getElementById('latest-episodes-grid');
        const countEl = document.getElementById('terbaru-total-count');
        if (!latestGrid) return;
        
        terbaruPage = page;
        latestGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Loading terbaru episodes...</p>';

        try {
            const res = await fetch(`/api/v1/anime/latest?page=${page}&limit=24`);
            const data = await res.json();
            
            if (countEl) countEl.textContent = (data.count_total || 0).toLocaleString();

            if (data.items && data.items.length > 0) {
                latestGrid.innerHTML = data.items.map(item => {
                    const epTitle = item.latest_video_title || `${item.category_name} Latest Episode`;
                    const vid = item.latest_vid || (item.cid * 1000 + 1);
                    return `
                        <div class="latest-card" data-vid="${vid}" data-cid="${item.cid}">
                            <div class="latest-poster">
                                <img src="${item.category_image}" alt="${item.category_name}" loading="lazy" onerror="handleImgError(this, '${item.category_image}')">
                                <span class="latest-badge-ep"><i class="fa-solid fa-bolt"></i> EP BARU</span>
                                <div class="latest-play-btn"><i class="fa-solid fa-play"></i></div>
                            </div>
                            <div class="latest-body">
                                <h4 class="latest-ep-title">${epTitle}</h4>
                                <p class="latest-cat-name">${item.category_name}</p>
                                <div class="latest-meta">
                                    <span><i class="fa-solid fa-star text-gold"></i> ${item.rating || '8.0'}</span>
                                    <span><i class="fa-solid fa-clock"></i> ${item.update_date_time || 'Recent'}</span>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');

                latestGrid.querySelectorAll('.latest-card').forEach(card => {
                    card.addEventListener('click', () => {
                        const vid = parseInt(card.dataset.vid);
                        if (vid) {
                            playVideo(vid);
                        } else {
                            openDetailModal(parseInt(card.dataset.cid));
                        }
                    });
                });

                renderCustomPagination('terbaru-pagination', page, data.pages, (p) => fetchTerbaruPage(p));
            }
        } catch (err) {
            console.error('Error loading latest episodes:', err);
        }
    }

    async function fetchPopularPage(page) {
        const grid = document.getElementById('popular-page-grid');
        const countEl = document.getElementById('popular-total-count');
        if (!grid) return;

        popularPage = page;
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Loading popular anime...</p>';

        try {
            const res = await fetch(`/api/v1/anime/popular?page=${page}&limit=24`);
            const data = await res.json();
            
            if (countEl) countEl.textContent = (data.count_total || 0).toLocaleString();

            if (data.items && data.items.length > 0) {
                grid.innerHTML = data.items.map(item => `
                    <div class="anime-card" data-cid="${item.cid}">
                        <div class="card-poster">
                            <img src="${item.category_image}" alt="${item.category_name}" loading="lazy" onerror="handleImgError(this, '${item.category_image}')">
                            <span class="card-badge-status ${item.status_video}">${item.status_video}</span>
                            <span class="card-rating"><i class="fa-solid fa-star"></i> ${item.rating}</span>
                            <div class="card-overlay-btn"><i class="fa-solid fa-play"></i></div>
                        </div>
                        <div class="card-body">
                            <h3 class="card-title">${item.category_name}</h3>
                            <div class="card-info">
                                <span>${item.year}</span>
                                <span>${item.video_count} Eps</span>
                            </div>
                        </div>
                    </div>
                `).join('');

                grid.querySelectorAll('.anime-card').forEach(card => {
                    card.addEventListener('click', () => {
                        openDetailModal(parseInt(card.dataset.cid));
                    });
                });

                renderCustomPagination('popular-pagination', page, data.pages, (p) => fetchPopularPage(p));
            }
        } catch (err) {
            console.error('Error loading popular page:', err);
        }
    }

    async function fetchCompletePage(page) {
        const grid = document.getElementById('complete-page-grid');
        const countEl = document.getElementById('complete-total-count');
        if (!grid) return;

        completePage = page;
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Loading complete anime...</p>';

        try {
            const res = await fetch(`/api/v1/anime/complete?page=${page}&limit=24`);
            const data = await res.json();
            
            if (countEl) countEl.textContent = (data.count_total || 0).toLocaleString();

            if (data.items && data.items.length > 0) {
                grid.innerHTML = data.items.map(item => `
                    <div class="anime-card" data-cid="${item.cid}">
                        <div class="card-poster">
                            <img src="${item.category_image}" alt="${item.category_name}" loading="lazy" onerror="handleImgError(this, '${item.category_image}')">
                            <span class="card-badge-status Complete">Complete</span>
                            <span class="card-rating"><i class="fa-solid fa-star"></i> ${item.rating}</span>
                            <div class="card-overlay-btn"><i class="fa-solid fa-play"></i></div>
                        </div>
                        <div class="card-body">
                            <h3 class="card-title">${item.category_name}</h3>
                            <div class="card-info">
                                <span>${item.year}</span>
                                <span>${item.video_count} Eps</span>
                            </div>
                        </div>
                    </div>
                `).join('');

                grid.querySelectorAll('.anime-card').forEach(card => {
                    card.addEventListener('click', () => {
                        openDetailModal(parseInt(card.dataset.cid));
                    });
                });

                renderCustomPagination('complete-pagination', page, data.pages, (p) => fetchCompletePage(p));
            }
        } catch (err) {
            console.error('Error loading complete page:', err);
        }
    }




    async function loadStats() {
        try {
            const res = await fetch('/api/v1/anime/stats');
            const data = await res.json();
            if (data.status === 'ok') {
                document.getElementById('stat-titles').textContent = data.total_anime_titles.toLocaleString() + '+';
                document.getElementById('stat-episodes').textContent = data.total_episodes.toLocaleString() + '+';
                document.getElementById('stat-genres').textContent = data.genres_count;
            }
        } catch (err) {
            console.error('Error loading stats:', err);
        }
    }

    // Global Image Error Handler
    window.handleImgError = function(imgEl, originalUrl) {
        if (!imgEl) return;
        const targetUrl = originalUrl || imgEl.src;
        if (targetUrl && !imgEl.dataset.proxied && targetUrl.startsWith('http')) {
            imgEl.dataset.proxied = "true";
            imgEl.src = `/api/v1/anime/proxy-image?url=${encodeURIComponent(targetUrl)}`;
            return;
        }
        const svgFallback = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="420" viewBox="0 0 300 420"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="%230f172a"/><stop offset="1" stop-color="%231e1b4b"/></linearGradient></defs><rect width="300" height="420" fill="url(%23g)" rx="12"/><g transform="translate(150,200)" text-anchor="middle"><circle cx="0" cy="-20" r="40" fill="%236366f1" opacity="0.3"/><text x="0" y="40" fill="%23f8fafc" font-family="sans-serif" font-size="16" font-weight="bold">Anime Poster</text><text x="0" y="65" fill="%2394a3b8" font-family="sans-serif" font-size="12">Preview Unavailable</text></g></svg>`;
        imgEl.src = svgFallback;
        imgEl.onerror = null;
    };

    async function loadPopularForHero() {
        try {
            const res = await fetch('/api/v1/anime/popular?limit=5');
            const data = await res.json();
            if (data.items && data.items.length > 0) {
                const featured = data.items[0];
                heroCid = featured.cid;
                heroTitle.textContent = featured.category_name;
                heroYear.textContent = featured.year;
                heroStatus.textContent = featured.status_video;
                heroRating.innerHTML = `<i class="fa-solid fa-star text-gold"></i> ${featured.rating}`;
                heroGenre.textContent = featured.genre;
                
                const img = featured.category_image || 'http://elara.whatbox.ca:29318/Duljanah/OnePiece2HD.jpg';
                const testImg = new Image();
                testImg.onload = () => { heroBackdrop.style.backgroundImage = `url('${img}')`; };
                testImg.onerror = () => { heroBackdrop.style.backgroundImage = `url('/api/v1/anime/proxy-image?url=${encodeURIComponent(img)}')`; };
                testImg.src = img;
            }
        } catch (err) {
            console.error('Error loading hero:', err);
        }
    }

    async function fetchCatalog() {
        const grid = document.getElementById('anime-grid') || animeGrid;
        const countEl = document.getElementById('total-count') || totalCountEl;

        if (grid) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
                    <i class="fa-solid fa-spinner fa-spin fa-2x"></i>
                    <p style="margin-top: 10px;">Fetching anime catalog...</p>
                </div>
            `;
        }

        try {
            let url = `/api/v1/anime/search?page=${currentPage}&limit=24&sort_by=${currentSort}`;
            if (currentQuery) url += `&q=${encodeURIComponent(currentQuery)}`;
            if (currentGenre !== 'All') url += `&genre=${encodeURIComponent(currentGenre)}`;
            if (currentStatus !== 'All') url += `&status=${encodeURIComponent(currentStatus)}`;

            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();

            if (countEl) countEl.textContent = (data.count_total || 0).toLocaleString();
            renderCatalog(data.items);
            renderPagination(data.page, data.pages);
        } catch (err) {
            console.error('Error fetching catalog:', err);
            if (grid) grid.innerHTML = `<div style="grid-column: 1/-1; color: var(--red); text-align: center;">Failed to load catalog data.</div>`;
        }
    }

    function renderCatalog(items) {
        const grid = document.getElementById('anime-grid') || animeGrid;
        if (!grid) return;

        if (!items || items.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 60px; color: var(--text-muted);">
                    <i class="fa-solid fa-film fa-3x" style="margin-bottom: 12px; opacity: 0.5;"></i>
                    <h3>No Anime Found</h3>
                    <p>Try refining your search keyword or clearing genre filters.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = items.map(item => `
            <div class="anime-card" data-cid="${item.cid}">
                <div class="card-poster">
                    <img src="${item.category_image}" alt="${item.category_name}" loading="lazy" onerror="handleImgError(this, '${item.category_image}')">
                    <span class="card-badge-status ${item.status_video}">${item.status_video}</span>
                    <span class="card-rating"><i class="fa-solid fa-star"></i> ${item.rating || '8.0'}</span>
                    <div class="card-overlay-btn"><i class="fa-solid fa-play"></i></div>
                </div>
                <div class="card-body">
                    <h3 class="card-title">${item.category_name}</h3>
                    <div class="card-info">
                        <span>${item.year}</span>
                        <span><i class="fa-solid fa-video"></i> ${item.video_count || 1} eps</span>
                    </div>
                </div>
            </div>
        `).join('');

        grid.querySelectorAll('.anime-card').forEach(card => {
            card.addEventListener('click', () => {
                const cid = parseInt(card.dataset.cid);
                openDetailModal(cid);
            });
        });
    }

    function renderPagination(page, totalPages) {
        const pagContainer = document.getElementById('pagination') || paginationEl;
        if (!pagContainer) return;

        if (totalPages <= 1) {
            pagContainer.innerHTML = '';
            return;
        }

        let html = '';
        const prevDisabled = page === 1 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : '';
        html += `<button class="page-btn" ${prevDisabled} data-page="${page - 1}"><i class="fa-solid fa-chevron-left"></i></button>`;

        let start = Math.max(1, page - 2);
        let end = Math.min(totalPages, page + 2);

        for (let i = start; i <= end; i++) {
            const activeClass = i === page ? 'active' : '';
            html += `<button class="page-btn ${activeClass}" data-page="${i}">${i}</button>`;
        }

        const nextDisabled = page === totalPages ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : '';
        html += `<button class="page-btn" ${nextDisabled} data-page="${page + 1}"><i class="fa-solid fa-chevron-right"></i></button>`;

        pagContainer.innerHTML = html;

        pagContainer.querySelectorAll('.page-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetPage = parseInt(btn.dataset.page);
                if (targetPage && targetPage >= 1 && targetPage <= totalPages && targetPage !== currentPage) {
                    currentPage = targetPage;
                    fetchCatalog();
                    const catView = document.getElementById('view-catalog');
                    if (catView) catView.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }


    let currentDetailEpisodes = [];
    let currentEpRangeIndex = 0;
    let isEpAscending = true;

    function renderEpisodesGrid(episodes) {
        const epList = document.getElementById('episodes-list');
        if (!episodes || episodes.length === 0) {
            epList.innerHTML = '<p style="grid-column: 1/-1; color: var(--text-muted); text-align: center; padding: 20px;">Episode tidak ditemukan.</p>';
            return;
        }
        epList.innerHTML = episodes.map(ep => {
            const epMatch = ep.video_title.match(/Eps?\s*(\d+)/i) || ep.video_title.match(/(\d+)/);
            const shortLabel = epMatch ? `Ep ${epMatch[1]}` : ep.video_title;
            const historyItem = getAnimeHistory(ep.cat_id);
            const isWatched = historyItem && historyItem.vid === ep.vid;
            const watchedBadge = isWatched ? `<span class="watched-pill"><i class="fa-solid fa-play"></i> ${formatTime(historyItem.currentTime)}</span>` : '';
            const activeClass = isWatched ? 'watched' : '';
            return `<button class="ep-btn ${activeClass}" data-vid="${ep.vid}" title="${ep.video_title}">${shortLabel}${watchedBadge}</button>`;
        }).join('');

        epList.querySelectorAll('.ep-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const vid = parseInt(btn.dataset.vid);
                playVideo(vid);
            });
        });
    }

    function renderEpisodeRangeTabs(totalEpisodes) {
        const rangeContainer = document.getElementById('ep-range-tabs');
        if (!rangeContainer) return;

        if (totalEpisodes <= 30) {
            rangeContainer.innerHTML = '';
            return;
        }

        const chunkSize = 50;
        const totalRanges = Math.ceil(totalEpisodes / chunkSize);
        let html = '';
        
        for (let i = 0; i < totalRanges; i++) {
            const start = i * chunkSize + 1;
            const end = Math.min((i + 1) * chunkSize, totalEpisodes);
            const activeClass = i === currentEpRangeIndex ? 'active' : '';
            html += `<button class="ep-range-btn ${activeClass}" data-range-idx="${i}">Eps ${start} - ${end}</button>`;
        }

        rangeContainer.innerHTML = html;

        rangeContainer.querySelectorAll('.ep-range-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                rangeContainer.querySelectorAll('.ep-range-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentEpRangeIndex = parseInt(btn.dataset.rangeIdx);
                const start = currentEpRangeIndex * chunkSize;
                const end = start + chunkSize;
                const sliced = currentDetailEpisodes.slice(start, end);
                renderEpisodesGrid(sliced);
            });
        });
    }

    async function openDetailModal(cid) {
        if (!detailModal) return;
        detailModal.classList.add('active');
        
        const titleEl = document.getElementById('detail-title');
        const synopsisEl = document.getElementById('detail-synopsis');
        const epListEl = document.getElementById('episodes-list');
        const statusEl = document.getElementById('detail-status');
        const ratingEl = document.getElementById('detail-rating');
        const yearEl = document.getElementById('detail-year');
        const viewsEl = document.getElementById('detail-views');
        const genreEl = document.getElementById('detail-genre-tags');
        const detailPoster = document.getElementById('detail-poster');
        const epCountEl = document.getElementById('detail-ep-count');

        if (titleEl) titleEl.textContent = 'Loading...';
        if (synopsisEl) synopsisEl.textContent = 'Fetching metadata...';
        if (epListEl) epListEl.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Loading episodes...</p>';
        
        const epSearchInput = document.getElementById('ep-search-input');
        if (epSearchInput) epSearchInput.value = '';

        isEpAscending = true;
        const btnToggleOrder = document.getElementById('btn-toggle-ep-order');
        const epOrderText = document.getElementById('ep-order-text');
        if (epOrderText) epOrderText.textContent = '1 → N';

        try {
            const res = await fetch(`/api/v1/anime/detail/${cid}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();
            const cat = data.category || {};

            if (titleEl) titleEl.textContent = cat.category_name || 'Anime Detail';
            if (statusEl) statusEl.textContent = cat.status_video || 'OnGoing';
            if (ratingEl) ratingEl.innerHTML = `<i class="fa-solid fa-star text-gold"></i> ${cat.rating || '8.0'}`;
            if (yearEl) yearEl.textContent = cat.year || '2026';
            if (viewsEl) viewsEl.textContent = (cat.total_views || 0).toLocaleString();
            if (genreEl) genreEl.textContent = cat.genre || 'Action, Fantasy';
            
            if (detailPoster) {
                detailPoster.removeAttribute('data-proxied');
                detailPoster.src = cat.category_image || 'http://elara.whatbox.ca:29318/Duljanah/OnePiece2HD.jpg';
                detailPoster.onerror = function() {
                    handleImgError(this, cat.category_image);
                };
            }

            // Render Resume Banner if history exists for this anime
            const historyItem = getAnimeHistory(cid);
            const resumeBanner = document.getElementById('detail-resume-banner');
            if (resumeBanner) {
                if (historyItem) {
                    const timeStr = formatTime(historyItem.currentTime);
                    const durStr = formatTime(historyItem.duration);
                    resumeBanner.style.display = 'flex';
                    resumeBanner.innerHTML = `
                        <div class="resume-info">
                            <i class="fa-solid fa-clock-rotate-left highlight fa-lg"></i>
                            <div>
                                <strong style="display: block; color: var(--text-main); font-size: 0.95rem;">Lanjutkan: ${historyItem.epTitle}</strong>
                                <span style="font-size: 0.8rem; color: var(--text-muted);">Terakhir menonton di menit ${timeStr} / ${durStr}</span>
                            </div>
                        </div>
                        <button class="btn btn-primary btn-sm" id="btn-resume-from-detail" data-vid="${historyItem.vid}" data-time="${historyItem.currentTime}">
                            <i class="fa-solid fa-play"></i> Lanjutkan Nonton (${timeStr})
                        </button>
                    `;

                    document.getElementById('btn-resume-from-detail').addEventListener('click', () => {
                        playVideo(historyItem.vid, historyItem.currentTime);
                    });
                } else {
                    resumeBanner.style.display = 'none';
                }
            }

            // Format Synopsis nicely
            const cleanDesc = cat.desc_anime ? cat.desc_anime.replace(/<p>/gi, '').replace(/<\/p>/gi, '\n\n').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim() : 'No synopsis available.';
            if (synopsisEl) synopsisEl.innerText = cleanDesc;

            currentDetailEpisodes = (data.episodes || []).slice();
            // Sort ascending Ep 1 to N by default
            currentDetailEpisodes.sort((a, b) => a.vid - b.vid);

            currentEpRangeIndex = 0;
            if (epCountEl) epCountEl.textContent = currentDetailEpisodes.length;

            renderEpisodeRangeTabs(currentDetailEpisodes.length);

            const initialSlice = currentDetailEpisodes.length > 30 ? currentDetailEpisodes.slice(0, 50) : currentDetailEpisodes;
            renderEpisodesGrid(initialSlice);

            if (btnToggleOrder) {
                btnToggleOrder.onclick = () => {
                    isEpAscending = !isEpAscending;
                    if (epOrderText) epOrderText.textContent = isEpAscending ? '1 → N' : 'N → 1';
                    currentDetailEpisodes.reverse();
                    currentEpRangeIndex = 0;
                    renderEpisodeRangeTabs(currentDetailEpisodes.length);
                    const slice = currentDetailEpisodes.length > 30 ? currentDetailEpisodes.slice(0, 50) : currentDetailEpisodes;
                    renderEpisodesGrid(slice);
                };
            }

            if (epSearchInput) {
                epSearchInput.oninput = (e) => {
                    const q = e.target.value.toLowerCase().trim();
                    if (!q) {
                        const start = currentEpRangeIndex * 50;
                        const end = start + 50;
                        renderEpisodesGrid(currentDetailEpisodes.slice(start, end));
                    } else {
                        const filtered = currentDetailEpisodes.filter(ep => 
                            ep.video_title.toLowerCase().includes(q) || ep.vid.toString().includes(q)
                        );
                        renderEpisodesGrid(filtered);
                    }
                };
            }
        } catch (err) {
            console.error('Error opening detail modal:', err);
            if (titleEl) titleEl.textContent = 'Anime Detail';
            if (epListEl) epListEl.innerHTML = '<p style="grid-column: 1/-1; color: var(--red); text-align: center;">Gagal memuat episode. Silakan coba lagi.</p>';
        }
    }



    async function playVideo(vid, resumeTime = 0) {
        // Track if we came from detail modal so back button returns there
        const wasDetailOpen = detailModal.classList.contains('active');
        if (wasDetailOpen) {
            // Only update cameFromDetail when coming from detail (not when switching episodes inside player)
            cameFromDetail = true;
        }
        
        const btnBack = document.getElementById('btn-back-to-detail');
        if (btnBack) {
            btnBack.style.display = cameFromDetail ? 'inline-flex' : 'none';
        }

        detailModal.classList.remove('active');
        videoModal.classList.add('active');
        playerEpTitle.textContent = 'Loading video stream...';

        const alertBox = document.getElementById('player-status-alert');
        if (alertBox) alertBox.style.display = 'none';

        try {
            const res = await fetch(`/api/v1/anime/episode/${vid}`);
            const data = await res.json();
            
            playerEpTitle.textContent = data.video_title;
            currentStreams = data.streams;

            const epMatch = data.video_title.match(/Eps?\s*(\d+)/i) || data.video_title.match(/(\d+)/);
            const epNum = epMatch ? parseInt(epMatch[1]) : 1;

            currentPlayingMeta = {
                vid: data.vid,
                cid: data.cat_id,
                animeTitle: data.category_name,
                epTitle: data.video_title,
                epNumber: epNum,
                poster: data.video_thumbnail
            };

            const rawUrl = currentStreams.quality_720p || currentStreams.quality_480p || currentStreams.quality_360p || currentStreams.quality_1080p || 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
            setupVideoStream(rawUrl, resumeTime);

            renderNextEpisodes(data.vid, data.cat_id);

        } catch (err) {
            console.error('Error playing video:', err);
            setupVideoStream('http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', resumeTime);
        }
    }

    async function renderNextEpisodes(currentVid, cid) {
        const section = document.getElementById('next-episodes-section');
        const grid = document.getElementById('next-episodes-list');
        if (!section || !grid) return;
        
        section.style.display = 'none';
        
        let episodes = [];
        try {
            const res = await fetch(`/api/v1/anime/detail/${cid}`);
            if (!res.ok) return;
            const data = await res.json();
            episodes = (data.episodes || []).slice();
            episodes.sort((a, b) => {
                const epA = parseInt(a.video_title.match(/Eps?\s*(\d+)/i)?.[1] || a.vid);
                const epB = parseInt(b.video_title.match(/Eps?\s*(\d+)/i)?.[1] || b.vid);
                return epA - epB;
            });
        } catch (err) {
            console.error(err);
            return;
        }
        
        const currentIndex = episodes.findIndex(ep => ep.vid === currentVid);
        if (currentIndex === -1 || currentIndex === episodes.length - 1) {
            return; // Not found or is the latest episode, hide next episodes
        }

        const nextEps = episodes.slice(currentIndex + 1, currentIndex + 6);
        if (nextEps.length === 0) return;

        section.style.display = 'block';
        grid.innerHTML = nextEps.map(ep => `
            <button class="ep-btn" data-vid="${ep.vid}">
                <i class="fa-solid fa-play"></i> 
                ${ep.video_title.replace(/^.*?(Eps?\s*\d+)/i, '$1').trim() || 'Next Ep'}
            </button>
        `).join('');

        // Wire up click handlers (can't use inline onclick since playVideo is inside DOMContentLoaded scope)
        grid.querySelectorAll('.ep-btn[data-vid]').forEach(btn => {
            btn.addEventListener('click', () => {
                playVideo(parseInt(btn.dataset.vid));
            });
        });
    }

    async function loadLatestEpisodes() {
        const latestGrid = document.getElementById('latest-episodes-grid');
        if (!latestGrid) return;

        try {
            const res = await fetch('/api/v1/anime/latest?limit=10');
            const data = await res.json();
            
            if (data.items && data.items.length > 0) {
                latestGrid.innerHTML = data.items.map(item => {
                    const epTitle = item.latest_video_title || `${item.category_name} Latest Episode`;
                    const vid = item.latest_vid || (item.cid * 1000 + 1);
                    return `
                        <div class="latest-card" data-vid="${vid}" data-cid="${item.cid}">
                            <div class="latest-poster">
                                <img src="${item.category_image}" alt="${item.category_name}" loading="lazy" onerror="handleImgError(this, '${item.category_image}')">
                                <span class="latest-badge-ep"><i class="fa-solid fa-bolt"></i> EP BARU</span>
                                <div class="latest-play-btn"><i class="fa-solid fa-play"></i></div>
                            </div>
                            <div class="latest-body">
                                <h4 class="latest-ep-title">${epTitle}</h4>
                                <p class="latest-cat-name">${item.category_name}</p>
                                <div class="latest-meta">
                                    <span><i class="fa-solid fa-star text-gold"></i> ${item.rating || '8.0'}</span>
                                    <span><i class="fa-solid fa-clock"></i> ${item.update_date_time || 'Recent'}</span>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');

                latestGrid.querySelectorAll('.latest-card').forEach(card => {
                    card.addEventListener('click', () => {
                        const vid = parseInt(card.dataset.vid);
                        if (vid) {
                            playVideo(vid);
                        } else {
                            openDetailModal(parseInt(card.dataset.cid));
                        }
                    });
                });
            }
        } catch (err) {
            console.error('Error loading latest episodes:', err);
        }
    }

    function setupVideoStream(rawUrl, resumeTime = 0) {
        const alertBox = document.getElementById('player-status-alert');
        const alertText = document.getElementById('player-status-text');
        
        let attempts = 0;
        
        videoPlayer.onerror = function() {
            attempts++;
            if (attempts >= 1) {
                if (alertBox && alertText) {
                    alertText.textContent = 'Server stream unavailable. Playing HD Backup Stream.';
                    alertBox.style.display = 'flex';
                }
                videoPlayer.src = 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
                videoPlayer.load();
                videoPlayer.play().catch(() => {});
                videoPlayer.onerror = null;
            }
        };

        videoPlayer.ontimeupdate = () => {
            if (videoPlayer.currentTime > 2) {
                saveWatchProgress(videoPlayer.currentTime, videoPlayer.duration);
            }
        };

        if (rawUrl && rawUrl.startsWith('http://')) {
            const proxyUrl = `/api/v1/anime/proxy-video?url=${encodeURIComponent(rawUrl)}`;
            videoPlayer.src = proxyUrl;
        } else {
            videoPlayer.src = rawUrl;
        }
        videoPlayer.load();

        videoPlayer.onloadedmetadata = () => {
            if (resumeTime && resumeTime > 2) {
                videoPlayer.currentTime = resumeTime;
            }
        };

        videoPlayer.play().catch(() => {});
    }


    async function loadPopularSection() {
        const grid = document.getElementById('popular-grid');
        if (!grid) return;

        try {
            const res = await fetch('/api/v1/anime/popular?limit=6');
            const data = await res.json();
            
            if (data.items && data.items.length > 0) {
                grid.innerHTML = data.items.map(item => `
                    <div class="anime-card" data-cid="${item.cid}">
                        <div class="card-poster">
                            <img src="${item.category_image}" alt="${item.category_name}" loading="lazy" onerror="handleImgError(this, '${item.category_image}')">
                            <span class="card-badge-status ${item.status_video}">${item.status_video}</span>
                            <span class="card-rating"><i class="fa-solid fa-star"></i> ${item.rating}</span>
                            <div class="card-overlay-btn"><i class="fa-solid fa-play"></i></div>
                        </div>
                        <div class="card-body">
                            <h3 class="card-title">${item.category_name}</h3>
                            <div class="card-info">
                                <span>${item.year}</span>
                                <span>${item.video_count} Eps</span>
                            </div>
                        </div>
                    </div>
                `).join('');

                grid.querySelectorAll('.anime-card').forEach(card => {
                    card.addEventListener('click', () => {
                        openDetailModal(parseInt(card.dataset.cid));
                    });
                });
            }
        } catch (err) {
            console.error('Error loading popular section:', err);
        }
    }

    async function loadCompleteSection() {
        const grid = document.getElementById('complete-grid');
        if (!grid) return;

        try {
            const res = await fetch('/api/v1/anime/complete?limit=6');
            const data = await res.json();
            
            if (data.items && data.items.length > 0) {
                grid.innerHTML = data.items.map(item => `
                    <div class="anime-card" data-cid="${item.cid}">
                        <div class="card-poster">
                            <img src="${item.category_image}" alt="${item.category_name}" loading="lazy" onerror="handleImgError(this, '${item.category_image}')">
                            <span class="card-badge-status Complete">Complete</span>
                            <span class="card-rating"><i class="fa-solid fa-star"></i> ${item.rating}</span>
                            <div class="card-overlay-btn"><i class="fa-solid fa-play"></i></div>
                        </div>
                        <div class="card-body">
                            <h3 class="card-title">${item.category_name}</h3>
                            <div class="card-info">
                                <span>${item.year}</span>
                                <span>${item.video_count} Eps</span>
                            </div>
                        </div>
                    </div>
                `).join('');

                grid.querySelectorAll('.anime-card').forEach(card => {
                    card.addEventListener('click', () => {
                        openDetailModal(parseInt(card.dataset.cid));
                    });
                });
            }
        } catch (err) {
            console.error('Error loading complete section:', err);
        }
    }

    function setupEventListeners() {
        // Nav Tab Switcher
        document.querySelectorAll('[data-view]').forEach(item => {
            item.addEventListener('click', (e) => {
                const viewName = item.dataset.view;
                if (viewName) {
                    switchView(viewName);
                }
            });
        });

        // Genre Pills
        document.querySelectorAll('.genre-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                document.querySelectorAll('.genre-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                currentGenre = pill.dataset.genre;
                currentPage = 1;
                fetchCatalog();
            });
        });

        // Clear All History Handler
        const btnClearHistory = document.getElementById('btn-clear-all-history');
        if (btnClearHistory) {
            btnClearHistory.addEventListener('click', () => {
                if (confirm('Apakah Anda yakin ingin menghapus semua riwayat nonton?')) {
                    clearAllHistory();
                }
            });
        }

        // Day Tab Click Listeners
        document.querySelectorAll('.day-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const day = btn.dataset.day;
                if (day) fetchScheduleData(day);
            });
        });




        // Search Input Debounce
        let searchTimer;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimer);
            currentQuery = e.target.value;
            clearSearchBtn.style.display = currentQuery ? 'block' : 'none';
            searchTimer = setTimeout(() => {
                currentPage = 1;
                fetchCatalog();
            }, 400);
        });

        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            currentQuery = '';
            clearSearchBtn.style.display = 'none';
            currentPage = 1;
            fetchCatalog();
        });

        // Filters
        filterStatus.addEventListener('change', (e) => {
            currentStatus = e.target.value;
            currentPage = 1;
            fetchCatalog();
        });

        filterSort.addEventListener('change', (e) => {
            currentSort = e.target.value;
            currentPage = 1;
            fetchCatalog();
        });

        // Hero buttons

        btnHeroPlay.addEventListener('click', () => playVideo(89739));
        btnHeroDetail.addEventListener('click', () => openDetailModal(heroCid));

        // Quality Selectors
        document.querySelectorAll('.quality-btn').forEach(qBtn => {
            qBtn.addEventListener('click', () => {
                document.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('active'));
                qBtn.classList.add('active');
                const quality = qBtn.dataset.quality;
                if (currentStreams) {
                    let newUrl = currentStreams[`quality_${quality}`];
                    if (newUrl) {
                        const curTime = videoPlayer.currentTime;
                        setupVideoStream(newUrl);
                        videoPlayer.currentTime = curTime;
                    }
                }
            });
        });

        // Modal Close triggers
        const closeVideoModalInline = document.getElementById('close-video-modal-inline');
        const btnBackToDetail = document.getElementById('btn-back-to-detail');

        if (closeVideoModalInline) closeVideoModalInline.addEventListener('click', () => {
            videoModal.classList.remove('active');
            videoPlayer.pause();
            cameFromDetail = false; // Reset when fully closing
        });

        if (btnBackToDetail) btnBackToDetail.addEventListener('click', () => {
            videoModal.classList.remove('active');
            videoPlayer.pause();
            detailModal.classList.add('active'); // Always go back to detail
            cameFromDetail = false; // Reset after going back
        });


        document.getElementById('video-backdrop').addEventListener('click', () => {
            videoModal.classList.remove('active');
            videoPlayer.pause();
            cameFromDetail = false; // Reset when closing via backdrop
        });

        closeDetailModal.addEventListener('click', () => detailModal.classList.remove('active'));
        document.getElementById('detail-backdrop').addEventListener('click', () => detailModal.classList.remove('active'));

        // API Tester Modal
        btnOpenApiTester.addEventListener('click', () => apiTesterModal.classList.add('active'));
        closeApiTester.addEventListener('click', () => apiTesterModal.classList.remove('active'));
        document.getElementById('api-tester-backdrop').addEventListener('click', () => apiTesterModal.classList.remove('active'));

        btnRunApiTest.addEventListener('click', async () => {
            const endpoint = apiEndpointSelect.value;
            const startTime = performance.now();
            try {
                const res = await fetch(endpoint);
                const data = await res.json();
                const duration = Math.round(performance.now() - startTime);
                document.getElementById('api-status-badge').className = 'badge badge-success';
                document.getElementById('api-status-badge').textContent = `HTTP ${res.status} OK`;
                document.getElementById('api-response-time').textContent = `Time: ${duration}ms`;
                apiJsonOutput.textContent = JSON.stringify(data, null, 2);
            } catch (err) {
                document.getElementById('api-status-badge').className = 'badge badge-status';
                document.getElementById('api-status-badge').textContent = `ERROR`;
                apiJsonOutput.textContent = err.toString();
            }
        });
    }
});


