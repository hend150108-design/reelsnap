/**
 * ReelSnap - Frontend Application Logic
 * Vanilla JavaScript (ES6+) with Lucide Icons, Media Support (Video & Photo),
 * Cookie Settings Management, and Demo Mode.
 */

(function () {
  'use strict';

  // -------------------------------------------------------------------------
  // DOM Elements
  // -------------------------------------------------------------------------
  const htmlRoot = document.documentElement;
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const cookieStatusDot = document.getElementById('cookie-status-dot');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileDrawer = document.getElementById('mobile-drawer');

  // Form Elements
  const reelsForm = document.getElementById('reels-form');
  const urlInput = document.getElementById('url-input');
  const clearBtn = document.getElementById('clear-btn');
  const pasteBtn = document.getElementById('paste-btn');
  const submitBtn = document.getElementById('submit-btn');

  // Quick Action Buttons
  const cookiePillBtn = document.getElementById('cookie-pill-btn');
  const cookiePillLabel = document.getElementById('cookie-pill-label');
  const errorCookieBtn = document.getElementById('error-cookie-btn');

  // State Containers
  const loadingState = document.getElementById('loading-state');
  const loadingTitle = document.getElementById('loading-title');
  const loadingDesc = document.getElementById('loading-desc');
  const errorState = document.getElementById('error-state');
  const errorMessage = document.getElementById('error-message');
  const retryBtn = document.getElementById('retry-btn');
  const successState = document.getElementById('success-state');

  // Result Elements
  const resultVideoPlayer = document.getElementById('result-video-player');
  const photoPreviewBox = document.getElementById('photo-preview-box');
  const resultPhotoImg = document.getElementById('result-photo-img');
  const videoThumbnailFallback = document.getElementById('video-thumbnail-fallback');
  const resultThumbnailImg = document.getElementById('result-thumbnail-img');
  const mediaQualityBadge = document.getElementById('media-quality-badge');
  const successBadgeText = document.getElementById('success-badge-text');
  const creatorUsername = document.getElementById('creator-username');
  const creatorFullname = document.getElementById('creator-fullname');
  const videoCaptionText = document.getElementById('video-caption-text');
  const badgeDuration = document.getElementById('badge-duration');
  const durationVal = document.getElementById('duration-val');
  const badgeLikes = document.getElementById('badge-likes');
  const likesVal = document.getElementById('likes-val');
  const realDownloadBtn = document.getElementById('real-download-btn');
  const downloadBtnLabel = document.getElementById('download-btn-label');
  const downloadCoverBtn = document.getElementById('download-cover-btn');
  const copyVideoLinkBtn = document.getElementById('copy-video-link-btn');
  const resetResultBtn = document.getElementById('reset-result-btn');

  // Cookie Modal Elements
  const cookieModal = document.getElementById('cookie-modal');
  const cookieStatusTag = document.getElementById('cookie-status-tag');
  const cookieConfigForm = document.getElementById('cookie-config-form');
  const cookieInputField = document.getElementById('cookie-input-field');
  const toggleGuideBtn = document.getElementById('toggle-guide-btn');
  const guideStepsBody = document.getElementById('guide-steps-body');
  const removeCookieBtn = document.getElementById('remove-cookie-btn');

  // Toast Container
  const toastContainer = document.getElementById('toast');

  // App State
  let isProcessing = false;
  let currentReelData = null;

  // -------------------------------------------------------------------------
  // 1. Theme Toggle (Dark / Light Mode)
  // -------------------------------------------------------------------------
  function initTheme() {
    const savedTheme = localStorage.getItem('reelsnap_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');

    setTheme(initialTheme);

    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        const currentTheme = htmlRoot.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        showToast(`Mode ${newTheme === 'dark' ? 'Gelap' : 'Terang'} diaktifkan`, 'info', 2000);
      });
    }
  }

  function setTheme(theme) {
    htmlRoot.setAttribute('data-theme', theme);
    localStorage.setItem('reelsnap_theme', theme);
    refreshIcons();
  }

  // -------------------------------------------------------------------------
  // 2. Mobile Menu Drawer
  // -------------------------------------------------------------------------
  function initMobileMenu() {
    if (!mobileMenuBtn || !mobileDrawer) return;

    mobileMenuBtn.addEventListener('click', () => {
      const isOpen = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
      const newState = !isOpen;
      mobileMenuBtn.setAttribute('aria-expanded', String(newState));
      mobileDrawer.classList.toggle('open', newState);
      mobileDrawer.setAttribute('aria-hidden', String(!newState));
      refreshIcons();
    });

    const drawerLinks = mobileDrawer.querySelectorAll('.mobile-nav-link');
    drawerLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
        mobileDrawer.classList.remove('open');
        mobileDrawer.setAttribute('aria-hidden', 'true');
        refreshIcons();
      });
    });
  }

  // -------------------------------------------------------------------------
  // 3. Form Input & Clipboard Helper
  // -------------------------------------------------------------------------
  function initForm() {
    // Show/hide clear button
    urlInput.addEventListener('input', () => {
      const hasValue = urlInput.value.trim().length > 0;
      clearBtn.style.display = hasValue ? 'inline-flex' : 'none';
      if (hasValue) hideStates();
    });

    clearBtn.addEventListener('click', () => {
      urlInput.value = '';
      clearBtn.style.display = 'none';
      urlInput.focus();
      hideStates();
    });

    // Paste from clipboard
    pasteBtn.addEventListener('click', async () => {
      try {
        if (!navigator.clipboard || !navigator.clipboard.readText) {
          showToast('Fitur clipboard tidak didukung di browser ini. Silakan tempel secara manual.', 'error');
          urlInput.focus();
          return;
        }

        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          urlInput.value = text.trim();
          clearBtn.style.display = 'inline-flex';
          showToast('Tautan berhasil ditempel dari clipboard!', 'success', 2500);
          hideStates();
          validateAndFetch(text.trim());
        } else {
          showToast('Clipboard Anda masih kosong.', 'info');
        }
      } catch {
        showToast('Izin akses clipboard ditolak. Silakan tempel secara manual.', 'error');
        urlInput.focus();
      }
    });

    // Form submit
    reelsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const rawUrl = urlInput.value.trim();
      validateAndFetch(rawUrl);
    });

    // Retry button
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        const rawUrl = urlInput.value.trim();
        if (rawUrl) {
          validateAndFetch(rawUrl);
        } else {
          urlInput.focus();
        }
      });
    }

    if (resetResultBtn) {
      resetResultBtn.addEventListener('click', () => {
        hideStates();
        urlInput.value = '';
        clearBtn.style.display = 'none';
        urlInput.focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    if (copyVideoLinkBtn) {
      copyVideoLinkBtn.addEventListener('click', async () => {
        if (!currentReelData || !currentReelData.mediaUrl) return;
        try {
          await navigator.clipboard.writeText(currentReelData.mediaUrl);
          showToast('Tautan file media berhasil disalin ke clipboard!', 'success');
        } catch {
          showToast('Gagal menyalin tautan.', 'error');
        }
      });
    }

    if (realDownloadBtn) {
      realDownloadBtn.addEventListener('click', () => {
        showToast('Menyiapkan file unduhan...', 'info', 2500);
      });
    }
  }

  // -------------------------------------------------------------------------
  // 4. Cookie Management & Settings Modal
  // -------------------------------------------------------------------------
  function initCookieSettings() {
    checkCookieStatus();

    // Open modal buttons
    const openButtons = [settingsBtn, cookiePillBtn, errorCookieBtn];
    openButtons.forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => openModal(cookieModal));
      }
    });

    // Toggle guide
    if (toggleGuideBtn && guideStepsBody) {
      toggleGuideBtn.addEventListener('click', () => {
        const isClosed = guideStepsBody.style.display === 'none';
        guideStepsBody.style.display = isClosed ? 'block' : 'none';
        toggleGuideBtn.classList.toggle('open', isClosed);
      });
    }

    // Save cookie
    if (cookieConfigForm) {
      cookieConfigForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const cookieVal = (cookieInputField.value || '').trim();
        if (!cookieVal) {
          showToast('Harap masukkan nilai cookie atau session ID.', 'error');
          return;
        }

        if (
          cookieVal.startsWith('http://') ||
          cookieVal.startsWith('https://') ||
          cookieVal.includes('instagram.com') ||
          cookieVal.includes('/reel/') ||
          cookieVal.includes('/p/')
        ) {
          showToast(
            'Yang Anda tempel adalah URL tautan Reels, BUKAN sessionid! Silakan ikuti panduan 6 langkah di bawah.',
            'error',
            6000
          );
          return;
        }

        try {
          const res = await fetch('/api/reels/cookie', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cookie: cookieVal }),
          });
          const result = await res.json();
          if (result.success) {
            updateCookieUI(true);
            closeModal(cookieModal);
            showToast('Cookie Instagram berhasil disimpan dan diterapkan!', 'success', 4000);
            // Re-fetch current input if filled
            const currentUrl = urlInput.value.trim();
            if (currentUrl && currentUrl !== 'demo') {
              validateAndFetch(currentUrl);
            }
          } else {
            showToast('Gagal menyimpan cookie: ' + result.error, 'error');
          }
        } catch {
          showToast('Gagal terhubung ke server untuk menyimpan cookie.', 'error');
        }
      });
    }

    // Remove cookie
    if (removeCookieBtn) {
      removeCookieBtn.addEventListener('click', async () => {
        try {
          const res = await fetch('/api/reels/cookie', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cookie: '' }),
          });
          const result = await res.json();
          if (result.success) {
            cookieInputField.value = '';
            updateCookieUI(false);
            showToast('Cookie Instagram telah dihapus.', 'info');
          }
        } catch {
          showToast('Gagal menghapus cookie.', 'error');
        }
      });
    }
  }

  async function checkCookieStatus() {
    try {
      const res = await fetch('/api/reels/cookie');
      const data = await res.json();
      updateCookieUI(Boolean(data.hasCookie));
    } catch {
      // Ignore network errors on init
    }
  }

  function updateCookieUI(hasCookie) {
    if (cookieStatusDot) {
      cookieStatusDot.classList.toggle('active', hasCookie);
    }
    if (cookiePillBtn) {
      cookiePillBtn.classList.toggle('connected', hasCookie);
    }
    if (cookiePillLabel) {
      cookiePillLabel.textContent = hasCookie ? 'Koneksi: Aktif (Siap Download)' : 'Koneksi: Pasang Cookie Akun';
    }
    if (cookieStatusTag) {
      cookieStatusTag.className = `status-tag ${hasCookie ? 'status-online' : 'status-offline'}`;
      cookieStatusTag.textContent = hasCookie ? 'Terpasang & Siap' : 'Belum Terpasang';
    }
  }

  // -------------------------------------------------------------------------
  // 5. URL Validation & API Request
  // -------------------------------------------------------------------------
  function validateAndFetch(url) {
    if (isProcessing) return;

    if (!url) {
      showToast('Harap masukkan tautan Instagram terlebih dahulu.', 'error');
      urlInput.focus();
      return;
    }

    const trimmed = url.trim();

    // Client-side regex check (Reels, Posts, Photos)
    const instagramRegex = /^(https?:\/\/)?(www\.|m\.)?instagram\.com\/(reel|p|tv|share\/reel)\/([A-Za-z0-9_-]+)/i;
    if (!instagramRegex.test(trimmed)) {
      showError(
        'Tautan tidak valid. Pastikan tautan berasal dari Instagram Reels atau Foto (contoh: https://www.instagram.com/reel/... atau https://www.instagram.com/p/...).'
      );
      return;
    }

    fetchReelInfo(trimmed);
  }

  async function fetchReelInfo(url) {
    setProcessing(true);
    showLoading();

    try {
      const response = await fetch('/api/reels/info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const message = result.error || 'Gagal memproses tautan Instagram ini.';
        showError(message, result.needsCookie);
        return;
      }

      const reelData = result.data;
      if (!reelData || !reelData.mediaUrl) {
        showError('Sumber media tidak ditemukan atau telah kedaluwarsa.');
        return;
      }

      currentReelData = reelData;
      renderSuccessResult(reelData);
      showToast(
        reelData.mediaType === 'image'
          ? 'Foto Instagram berhasil ditemukan!'
          : 'Video Reels berhasil ditemukan!',
        'success'
      );
    } catch {
      showError('Gagal terhubung ke server backend. Periksa koneksi internet Anda atau coba sesaat lagi.');
    } finally {
      setProcessing(false);
    }
  }

  function setProcessing(processing) {
    isProcessing = processing;
    submitBtn.disabled = processing;
    pasteBtn.disabled = processing;

    const btnText = submitBtn.querySelector('.btn-text');
    if (btnText) {
      btnText.textContent = processing ? 'Memproses...' : 'Download';
    }
  }

  // -------------------------------------------------------------------------
  // 6. Render Results (Loading, Error, Success)
  // -------------------------------------------------------------------------
  function hideStates() {
    loadingState.style.display = 'none';
    errorState.style.display = 'none';
    successState.style.display = 'none';
    if (resultVideoPlayer) {
      resultVideoPlayer.pause();
      resultVideoPlayer.removeAttribute('src');
    }
    if (photoPreviewBox) {
      photoPreviewBox.style.display = 'none';
    }
    if (downloadCoverBtn) {
      downloadCoverBtn.style.display = 'none';
    }
  }

  function showLoading() {
    hideStates();
    loadingState.style.display = 'flex';
    loadingTitle.textContent = 'Memproses Tautan Instagram...';
    loadingDesc.textContent = 'Menghubungi server Instagram dan mengambil data media publik.';
    scrollToResult();
    refreshIcons();
  }

  function showError(msg, needsCookie = false) {
    hideStates();
    errorState.style.display = 'flex';
    errorMessage.textContent = msg;
    if (errorCookieBtn) {
      errorCookieBtn.style.display = 'inline-flex';
    }
    scrollToResult();
    refreshIcons();
  }

  function renderSuccessResult(data) {
    hideStates();
    successState.style.display = 'block';

    const isImage = data.mediaType === 'image' || !data.videoUrl;

    // Creator info
    const author = data.author || {};
    creatorUsername.textContent = author.username ? `@${author.username}` : '@instagram_user';
    creatorFullname.textContent = author.name || 'Kreator Instagram';

    // Caption
    videoCaptionText.textContent = data.caption || data.title || 'Tidak ada deskripsi teks.';

    // Header Badge
    if (successBadgeText) {
      successBadgeText.textContent = isImage ? 'Foto Siap Diunduh' : 'Video Siap Diunduh';
    }
    if (mediaQualityBadge) {
      mediaQualityBadge.textContent = isImage ? 'Foto • HD Asli' : 'MP4 • HD Original';
    }

    // Duration badge
    if (!isImage && data.duration && data.duration > 0) {
      badgeDuration.style.display = 'inline-flex';
      durationVal.textContent = `${data.duration} detik`;
    } else {
      badgeDuration.style.display = 'none';
    }

    // Likes badge
    if (data.stats && data.stats.likes) {
      badgeLikes.style.display = 'inline-flex';
      likesVal.textContent = formatNumber(data.stats.likes);
    } else {
      badgeLikes.style.display = 'none';
    }

    // Media Preview Handling (Video vs Photo)
    if (isImage) {
      // Photo Mode
      if (resultVideoPlayer) resultVideoPlayer.style.display = 'none';
      if (photoPreviewBox) photoPreviewBox.style.display = 'flex';
      if (resultPhotoImg) {
        resultPhotoImg.src = data.imageUrl || data.thumbnail || data.mediaUrl;
      }
      if (videoThumbnailFallback) videoThumbnailFallback.style.display = 'none';
    } else {
      // Video Mode
      if (photoPreviewBox) photoPreviewBox.style.display = 'none';
      if (resultVideoPlayer) {
        resultVideoPlayer.style.display = 'block';
        resultVideoPlayer.src = data.videoUrl;
        if (data.thumbnail) {
          resultVideoPlayer.poster = data.thumbnail;
        }
        resultVideoPlayer.load();

        resultVideoPlayer.onerror = () => {
          if (data.thumbnail) {
            resultVideoPlayer.style.display = 'none';
            videoThumbnailFallback.style.display = 'block';
            resultThumbnailImg.src = data.thumbnail;
          }
        };
        resultVideoPlayer.onloadeddata = () => {
          resultVideoPlayer.style.display = 'block';
          videoThumbnailFallback.style.display = 'none';
        };
      }
    }

    // Real download button link & label
    const downloadUrl = data.downloadUrl || data.mediaUrl;
    realDownloadBtn.href = downloadUrl;
    const fileExt = isImage ? 'jpg' : 'mp4';
    realDownloadBtn.setAttribute('download', `reelsnap-${data.shortcode || 'media'}.${fileExt}`);

    if (downloadBtnLabel) {
      downloadBtnLabel.textContent = isImage ? 'Unduh Foto (.JPG)' : 'Unduh Video (.MP4)';
    }

    // Format badge
    const formatVal = document.getElementById('format-val');
    const formatBadgeIcon = document.getElementById('format-badge-icon');
    if (formatVal) {
      formatVal.textContent = isImage ? 'Format JPG' : 'Format MP4';
    }
    if (formatBadgeIcon) {
      formatBadgeIcon.setAttribute('data-lucide', isImage ? 'image' : 'file-video');
    }

    // Cover download button
    if (downloadCoverBtn) {
      if (!isImage && data.thumbnail) {
        downloadCoverBtn.style.display = 'inline-flex';
        downloadCoverBtn.href = `/api/reels/download?url=${encodeURIComponent(data.thumbnail)}&code=${data.shortcode || 'media'}_cover&type=image`;
        downloadCoverBtn.setAttribute('download', `reelsnap-${data.shortcode || 'media'}-cover.jpg`);
      } else {
        downloadCoverBtn.style.display = 'none';
      }
    }

    scrollToResult();
    refreshIcons();
  }

  function scrollToResult() {
    const resultsContainer = document.getElementById('results-container');
    if (resultsContainer) {
      resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  // -------------------------------------------------------------------------
  // 7. Interactive FAQ Accordion
  // -------------------------------------------------------------------------
  function initFaq() {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach((item) => {
      const questionBtn = item.querySelector('.faq-question');
      const answer = item.querySelector('.faq-answer');

      questionBtn.addEventListener('click', () => {
        const isCurrentActive = item.classList.contains('active');

        faqItems.forEach((otherItem) => {
          if (otherItem !== item) {
            otherItem.classList.remove('active');
            otherItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
            otherItem.querySelector('.faq-answer').style.maxHeight = null;
          }
        });

        if (isCurrentActive) {
          item.classList.remove('active');
          questionBtn.setAttribute('aria-expanded', 'false');
          answer.style.maxHeight = null;
        } else {
          item.classList.add('active');
          questionBtn.setAttribute('aria-expanded', 'true');
          answer.style.maxHeight = answer.scrollHeight + 'px';
        }
      });
    });
  }

  // -------------------------------------------------------------------------
  // 8. Modals (Privacy, Terms, Cookie)
  // -------------------------------------------------------------------------
  function openModal(modal) {
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    refreshIcons();
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function initModals() {
    const privacyBtn = document.getElementById('privacy-policy-btn');
    const termsBtn = document.getElementById('terms-of-service-btn');
    const privacyModal = document.getElementById('privacy-modal');
    const termsModal = document.getElementById('terms-modal');

    if (privacyBtn && privacyModal) {
      privacyBtn.addEventListener('click', () => openModal(privacyModal));
    }

    if (termsBtn && termsModal) {
      termsBtn.addEventListener('click', () => openModal(termsModal));
    }

    // Close buttons
    document.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close-modal');
        const modal = document.getElementById(modalId);
        closeModal(modal);
      });
    });

    // Close on backdrop click
    [privacyModal, termsModal, cookieModal].forEach((modal) => {
      if (!modal) return;
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal(modal);
        }
      });
    });

    // Close on ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal(privacyModal);
        closeModal(termsModal);
        closeModal(cookieModal);
      }
    });
  }

  // -------------------------------------------------------------------------
  // 9. Toast Notifications
  // -------------------------------------------------------------------------
  function showToast(message, type = 'info', duration = 3500) {
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-triangle';

    toast.innerHTML = `
      <i data-lucide="${iconName}"></i>
      <span>${escapeHtml(message)}</span>
    `;

    toastContainer.appendChild(toast);
    refreshIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // -------------------------------------------------------------------------
  // 10. Lucide Icons Refresh
  // -------------------------------------------------------------------------
  function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  // -------------------------------------------------------------------------
  // 11. App Initialization
  // -------------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initMobileMenu();
    initForm();
    initCookieSettings();
    initFaq();
    initModals();

    const yearSpan = document.getElementById('current-year');
    if (yearSpan) {
      yearSpan.textContent = new Date().getFullYear();
    }

    refreshIcons();
  });
})();
