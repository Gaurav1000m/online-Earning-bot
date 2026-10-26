/**
 * GigaPub Ad Network Integration for Telegram Mini App
 * Official docs: https://gigapub.tech & https://giga.pub
 */
class GigaPubManager {
  constructor() {
    this.projectId = null;
    this.isLoaded = false;
    this.isLoading = false;
  }

  /**
   * Initialize GigaPub with the project ID
   * Uses primary and fallback CDN rotation as recommended by GigaPub
   */
  async init(projectId) {
    if (!projectId || projectId === 'YOUR_GIGAPUB_PROJECT_ID') {
      console.warn('GigaPub: Using simulated ad mode (placeholder project ID detected).');
      this.isLoaded = true;
      return;
    }

    this.projectId = projectId;
    if (this.isLoaded || this.isLoading) return;
    this.isLoading = true;

    return new Promise((resolve) => {
      const domains = ['https://ad.gigapub.tech', 'https://ru-ad.gigapub.tech'];
      let domainIndex = 0;
      let timeoutHandle = null;

      const tryLoad = () => {
        const script = document.createElement('script');
        script.async = true;
        script.src = `${domains[domainIndex]}/script?id=${encodeURIComponent(projectId)}`;

        timeoutHandle = setTimeout(() => {
          script.onload = script.onerror = null;
          script.remove();
          domainIndex++;
          if (domainIndex < domains.length) {
            console.warn(`GigaPub: Primary CDN timed out, trying fallback ${domains[domainIndex]}...`);
            tryLoad();
          } else {
            console.warn('GigaPub: CDNs unreachable. Falling back to test simulator.');
            this.isLoading = false;
            this.isLoaded = true;
            resolve();
          }
        }, 12000);

        script.onload = () => {
          clearTimeout(timeoutHandle);
          this.isLoaded = true;
          this.isLoading = false;
          console.log('✅ GigaPub SDK loaded successfully!');
          resolve();
        };

        script.onerror = () => {
          clearTimeout(timeoutHandle);
          domainIndex++;
          if (domainIndex < domains.length) {
            console.warn(`GigaPub: Failed to load from primary CDN, switching to ${domains[domainIndex]}...`);
            tryLoad();
          } else {
            console.warn('GigaPub: All CDNs failed, enabling demo simulation.');
            this.isLoading = false;
            this.isLoaded = true;
            resolve();
          }
        };

        document.head.appendChild(script);
      };

      tryLoad();
    });
  }

  /**
   * Display a rewarded video ad
   * @returns {Promise<boolean>} Resolves true when ad watched to completion
   */
  async showRewardedAd() {
    // 1. If GigaPub official window.showGiga function exists
    if (typeof window.showGiga === 'function') {
      try {
        await window.showGiga();
        return true;
      } catch (err) {
        console.error('GigaPub error during ad playback:', err);
        throw new Error(err.message || 'Ad was skipped or failed to load. Please try again.');
      }
    }

    // 2. Interactive simulator modal for development / preview environments
    return this.showSimulatedAd();
  }

  /**
   * Interactive simulated ad modal for testing in localhost / preview
   */
  showSimulatedAd() {
    return new Promise((resolve, reject) => {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay open';
      modal.style.zIndex = '99999';

      let secondsLeft = 5;
      modal.innerHTML = `
        <div class="modal-content" style="text-align: center; max-width: 360px;">
          <div style="font-size: 3rem; margin-bottom: 12px;">🎬</div>
          <h3 class="text-xl font-bold" style="margin-bottom: 8px;">GigaPub Rewarded Ad</h3>
          <p class="text-sm text-muted" style="margin-bottom: 16px;">
            Simulating rewarded video ad playback.<br/>
            Reward unlocks when timer completes!
          </p>

          <div style="background: rgba(255,255,255,0.06); padding: 16px; border-radius: 14px; margin-bottom: 20px;">
            <div id="sim-ad-timer" class="text-3xl font-black text-primary">${secondsLeft}s</div>
            <div class="progress-bar" style="margin-top: 10px;">
              <div id="sim-ad-bar" class="progress-fill" style="width: 0%;"></div>
            </div>
          </div>

          <button id="sim-ad-cancel" class="btn btn-secondary btn-sm" style="margin-top: 8px;">
            Cancel Ad (No Reward)
          </button>
        </div>
      `;

      document.body.appendChild(modal);

      const timerEl = modal.querySelector('#sim-ad-timer');
      const barEl = modal.querySelector('#sim-ad-bar');
      const cancelBtn = modal.querySelector('#sim-ad-cancel');

      const interval = setInterval(() => {
        secondsLeft--;
        if (timerEl) timerEl.textContent = `${secondsLeft}s`;
        if (barEl) barEl.style.width = `${((5 - secondsLeft) / 5) * 100}%`;

        if (secondsLeft <= 0) {
          clearInterval(interval);
          modal.remove();
          resolve(true);
        }
      }, 1000);

      cancelBtn.addEventListener('click', () => {
        clearInterval(interval);
        modal.remove();
        reject(new Error('Ad was cancelled. No reward given.'));
      });
    });
  }
}

window.GigaPub = new GigaPubManager();
