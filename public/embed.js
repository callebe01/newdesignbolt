(function() {
  'use strict';

  // Get script attributes
  const currentScript = document.currentScript;
  const agentId = currentScript?.getAttribute('data-agent');
  const position = currentScript?.getAttribute('data-position') || 'bottom-right';
  const googleApiKey = currentScript?.getAttribute('data-google-api-key');

  if (!agentId) {
    console.error('VoicePilot: data-agent attribute is required');
    return;
  }

  // Set global API key if provided
  if (googleApiKey) {
    window.voicepilotGoogleApiKey = googleApiKey;
  }

  // ═══════════════════════════════════════════════
  // Enhanced Page Context Capture System - GENERIC APPROACH
  // ═══════════════════════════════════════════════
  class PageContextCapture {
    constructor() {
      this.lastContext = null;
      this.contextUpdateInterval = null;
      this.startContextMonitoring();
    }

    capturePageContext() {
      try {
        const context = {
          url: {
            pathname: window.location.pathname,
            search: window.location.search,
            hash: window.location.hash,
            hostname: window.location.hostname
          },
          page: {
            title: document.title || '',
            description: this.getMetaDescription(),
            mainHeading: this.getMainHeading(),
            breadcrumbs: this.getBreadcrumbs(),
            navigationItems: this.getNavigationItems(),
            currentScreen: this.getCurrentScreen()
          },
          ui: {
            visibleButtons: this.getVisibleButtons(),
            formElements: this.getFormElements(),
            activeSection: this.getActiveSection()
          },
          timestamp: new Date().toISOString()
        };

        this.lastContext = context;
        return context;
      } catch (error) {
        console.warn('[VoicePilot] Error capturing page context:', error);
        return {
          url: { pathname: window.location.pathname },
          page: { title: document.title || 'Unknown Page', currentScreen: 'Unknown' },
          ui: {},
          timestamp: new Date().toISOString()
        };
      }
    }

    getMetaDescription() {
      const metaDesc = document.querySelector('meta[name="description"]');
      return metaDesc ? metaDesc.getAttribute('content') || '' : '';
    }

    getMainHeading() {
      // Look for the most prominent heading in order of importance
      const h1 = document.querySelector('h1');
      if (h1 && h1.textContent?.trim()) {
        return h1.textContent.trim();
      }
      
      // Fallback to h2 if no h1
      const h2 = document.querySelector('h2');
      if (h2 && h2.textContent?.trim()) {
        return h2.textContent.trim();
      }

      // Fallback to h3 if no h2
      const h3 = document.querySelector('h3');
      if (h3 && h3.textContent?.trim()) {
        return h3.textContent.trim();
      }

      return '';
    }

    getCurrentScreen() {
      // ✅ GENERIC APPROACH - Focus on content, not specific URLs
      const mainHeading = this.getMainHeading().toLowerCase();
      const title = document.title.toLowerCase();
      const pathname = window.location.pathname.toLowerCase();
      
      // Look for common UI patterns and content indicators
      const indicators = [];
      
      // Check for form-related content
      if (mainHeading.includes('create') || mainHeading.includes('new') || mainHeading.includes('add')) {
        indicators.push('creation_form');
      }
      if (mainHeading.includes('edit') || mainHeading.includes('update') || mainHeading.includes('modify')) {
        indicators.push('edit_form');
      }
      if (mainHeading.includes('settings') || mainHeading.includes('preferences') || mainHeading.includes('configuration')) {
        indicators.push('settings_page');
      }
      if (mainHeading.includes('dashboard') || mainHeading.includes('overview') || mainHeading.includes('home')) {
        indicators.push('dashboard_page');
      }
      if (mainHeading.includes('list') || mainHeading.includes('browse') || document.querySelectorAll('table, .list, .grid').length > 0) {
        indicators.push('list_page');
      }
      if (mainHeading.includes('details') || mainHeading.includes('view') || mainHeading.includes('information')) {
        indicators.push('details_page');
      }
      if (mainHeading.includes('login') || mainHeading.includes('sign in') || title.includes('login')) {
        indicators.push('login_page');
      }
      if (mainHeading.includes('signup') || mainHeading.includes('register') || mainHeading.includes('sign up')) {
        indicators.push('signup_page');
      }

      // Check for specific form elements to determine page type
      const forms = document.querySelectorAll('form');
      if (forms.length > 0) {
        const hasPasswordField = document.querySelector('input[type="password"]');
        const hasEmailField = document.querySelector('input[type="email"]');
        
        if (hasPasswordField && hasEmailField) {
          if (mainHeading.includes('sign up') || mainHeading.includes('register')) {
            indicators.push('signup_form');
          } else {
            indicators.push('login_form');
          }
        } else if (forms.length === 1 && forms[0].querySelectorAll('input, textarea, select').length > 3) {
          indicators.push('data_entry_form');
        }
      }

      // Return the most specific indicator, or a generic description
      if (indicators.length > 0) {
        return indicators[0];
      }

      // Fallback to generic content description
      if (mainHeading) {
        return `content_page_${mainHeading.replace(/[^a-z0-9]/g, '_').substring(0, 20)}`;
      }

      return 'content_page';
    }

    getBreadcrumbs() {
      const breadcrumbs = [];
      
      // Common breadcrumb selectors
      const selectors = [
        '[aria-label*="breadcrumb"] a',
        '.breadcrumb a',
        '.breadcrumbs a',
        'nav[role="navigation"] a',
        '.nav-breadcrumb a'
      ];

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0 && elements.length < 10) { // Reasonable breadcrumb size
          elements.forEach(el => {
            const text = el.textContent?.trim();
            if (text && text.length > 0 && text.length < 100) {
              breadcrumbs.push(text);
            }
          });
          break; // Use first matching selector
        }
      }

      return breadcrumbs.slice(0, 5); // Limit to 5 items
    }

    getNavigationItems() {
      const navItems = [];
      
      // Look for main navigation - prioritize semantic navigation
      const navSelectors = [
        'nav[role="navigation"] a',
        'nav a',
        '[role="navigation"] a',
        'header nav a',
        '.navigation a',
        '.nav a'
      ];

      for (const selector of navSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0 && elements.length < 20) { // Reasonable nav size
          elements.forEach(el => {
            if (this.isElementVisible(el)) {
              const text = el.textContent?.trim();
              if (text && text.length > 0 && text.length < 50) {
                navItems.push(text);
              }
            }
          });
          if (navItems.length > 0) break; // Use first successful selector
        }
      }

      return navItems.slice(0, 10); // Limit to 10 items
    }

    getVisibleButtons() {
      const buttons = [];
      const buttonElements = document.querySelectorAll('button, input[type="button"], input[type="submit"], [role="button"]');
      
      buttonElements.forEach(el => {
        if (this.isElementVisible(el)) {
          const text = el.textContent?.trim() || 
                      el.value?.trim() || 
                      el.getAttribute('aria-label')?.trim() ||
                      el.getAttribute('title')?.trim();
          if (text && text.length > 0 && text.length < 50) {
            buttons.push(text);
          }
        }
      });

      return buttons.slice(0, 15); // Limit to 15 buttons
    }

    getFormElements() {
      const forms = [];
      const formElements = document.querySelectorAll('form');
      
      formElements.forEach(form => {
        if (this.isElementVisible(form)) {
          const inputs = form.querySelectorAll('input:not([type="hidden"]), textarea, select');
          const labels = [];
          
          inputs.forEach(input => {
            const label = this.getInputLabel(input);
            if (label && label.length < 50) {
              labels.push(label);
            }
          });

          if (labels.length > 0) {
            forms.push({
              action: form.action || '',
              fields: labels.slice(0, 10) // Limit fields per form
            });
          }
        }
      });

      return forms.slice(0, 3); // Limit to 3 forms
    }

    getInputLabel(input) {
      // Try various ways to get input label
      const id = input.id;
      if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label && label.textContent?.trim()) {
          return label.textContent.trim();
        }
      }

      // Check for parent label
      const parentLabel = input.closest('label');
      if (parentLabel && parentLabel.textContent?.trim()) {
        return parentLabel.textContent.trim();
      }

      const placeholder = input.placeholder?.trim();
      if (placeholder) return placeholder;

      const ariaLabel = input.getAttribute('aria-label')?.trim();
      if (ariaLabel) return ariaLabel;

      const title = input.getAttribute('title')?.trim();
      if (title) return title;

      return '';
    }

    getActiveSection() {
      // Try to determine what section of the page is most prominent
      const sections = document.querySelectorAll('main, section, article, .content, .main-content, [role="main"]');
      
      for (const section of sections) {
        if (this.isElementVisible(section)) {
          const heading = section.querySelector('h1, h2, h3');
          if (heading && heading.textContent?.trim()) {
            return heading.textContent.trim();
          }
        }
      }

      return '';
    }

    isElementVisible(el) {
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return (
        rect.width > 0 && rect.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        style.opacity !== '0'
      );
    }

    startContextMonitoring() {
      // Update context periodically and on navigation changes
      this.contextUpdateInterval = setInterval(() => {
        this.capturePageContext();
      }, 5000); // Update every 5 seconds

      // Listen for navigation changes
      let lastUrl = window.location.href;
      const observer = new MutationObserver(() => {
        if (window.location.href !== lastUrl) {
          lastUrl = window.location.href;
          setTimeout(() => this.capturePageContext(), 500); // Small delay for DOM updates
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      // Listen for popstate (back/forward navigation)
      window.addEventListener('popstate', () => {
        setTimeout(() => this.capturePageContext(), 500);
      });
    }

    getContextSummary() {
      const context = this.lastContext || this.capturePageContext();
      
      // Create a concise summary for the AI with prioritized current screen info
      const summary = [];
      
      // ✅ PRIORITIZE MAIN HEADING - Most descriptive context
      if (context.page.mainHeading) {
        summary.push(`Current page: "${context.page.mainHeading}"`);
      }

      // Page type context (if different from heading)
      if (context.page.currentScreen && !summary.join(' ').toLowerCase().includes(context.page.currentScreen.replace(/_/g, ' '))) {
        const screenType = context.page.currentScreen.replace(/_/g, ' ').replace(/page|form/, '').trim();
        if (screenType) {
          summary.push(`Page type: ${screenType}`);
        }
      }

      // Page title for additional context (if different from heading)
      if (context.page.title && !summary.join(' ').includes(context.page.title)) {
        summary.push(`Page title: "${context.page.title}"`);
      }
      
      // URL context (only if meaningful)
      if (context.url.pathname !== '/' && context.url.pathname.length > 1) {
        const pathParts = context.url.pathname.split('/').filter(p => p && p.length > 0);
        if (pathParts.length > 0) {
          summary.push(`URL path: /${pathParts.join('/')}`);
        }
      }

      // Navigation context
      if (context.page.breadcrumbs && context.page.breadcrumbs.length > 0) {
        summary.push(`Navigation: ${context.page.breadcrumbs.join(' > ')}`);
      }

      // Available actions (most relevant buttons)
      if (context.ui.visibleButtons && context.ui.visibleButtons.length > 0) {
        const buttons = context.ui.visibleButtons.slice(0, 5).join(', ');
        summary.push(`Available actions: ${buttons}`);
      }

      // Form context (if user is on a form)
      if (context.ui.formElements && context.ui.formElements.length > 0) {
        const formFields = context.ui.formElements[0].fields.slice(0, 3).join(', ');
        summary.push(`Form fields: ${formFields}`);
      }

      return summary.join('. ');
    }

    destroy() {
      if (this.contextUpdateInterval) {
        clearInterval(this.contextUpdateInterval);
      }
    }
  }

  const pageContextCapture = new PageContextCapture();

  // ═══════════════════════════════════════════════
  // Enhanced DOM Highlighting System – STRICT BUTTONS/INPUTS ONLY
  // ═══════════════════════════════════════════════
  class DOMHighlighter {
    constructor() {
      this.highlightedElements = new Set();
      this.highlightClass = 'voicepilot-highlight';
      this.highlightStyle = null;
      this.injectStyles();
    }

    injectStyles() {
      if (this.highlightStyle) this.highlightStyle.remove();
      this.highlightStyle = document.createElement('style');
      this.highlightStyle.id = 'voicepilot-highlight-styles';
      this.highlightStyle.textContent = `
        .${this.highlightClass} {
          position: relative !important;
          outline: 2px solid #f59e0b !important;
          outline-offset: 2px !important;
          box-shadow: 
            0 0 0 4px rgba(245, 158, 11, 0.2),
            0 0 12px rgba(245, 158, 11, 0.4) !important;
          border-radius: 8px !important;
          transition: all 0.3s ease !important;
          z-index: 9999 !important;
          animation: gentle-pulse 2s infinite ease-in-out;
        }
        
        @keyframes gentle-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        
        .${this.highlightClass}-badge {
          position: absolute;
          top: -12px;
          right: -8px;
          background: #f59e0b;
          color: #ffffff;
          font-size: 10px;
          font-weight: 600;
          padding: 3px 6px;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          z-index: 10000;
          animation: badge-appear 0.3s ease-out;
          pointer-events: none;
        }
        
        @keyframes badge-appear {
          0% { opacity: 0; transform: translateY(-4px) scale(0.8); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `;
      document.head.appendChild(this.highlightStyle);
    }

    isElementVisible(el) {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return (
        rect.width > 0 && rect.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        style.opacity !== '0' &&
        rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.right > 0
      );
    }

    highlightElement(searchText) {
      // 1) pull out anything in single or double quotes (highest priority)
      let phrase = searchText.trim();
      const qm = phrase.match(/['"]([^'"]+)['"]/);
      if (qm) {
        phrase = qm[1];      // e.g. "New Agent"
      }

      phrase = phrase.toLowerCase();
      if (!phrase) return false;

      // 2) grab _only_ buttons + clickable inputs
      const controls = Array.from(
        document.querySelectorAll(
          'button,' +
          'input[type="button"],' +
          'input[type="submit"],' +
          'input[type="reset"]'
        )
      ).filter(el => this.isElementVisible(el));

      // 3) score each by exact (2) → substring (1)
      const matches = controls
        .map(el => {
          const label = (el.getAttribute('aria-label')
                       || el.value
                       || el.textContent
                       || ''
                      ).trim();
          const lower = label.toLowerCase();
          let score = 0;
          if (lower === phrase)      score = 2;
          else if (lower.includes(phrase)) score = 1;
          return { el, label, score };
        })
        .filter(x => x.score > 0)
        .sort((a,b) => b.score - a.score);

      if (!matches.length) {
        console.log('[VoicePilot] No buttons/inputs matching:', phrase);
        return false;
      }

      // 4) highlight the top one
      this.clearHighlights();
      const best = matches[0].el;
      this.addHighlight(best, true);
      best.scrollIntoView({ behavior: 'smooth', block: 'center' });
      console.log('[VoicePilot] Highlighting control:', matches[0].label);
      return true;
    }

    addHighlight(el, isPrimary=false) {
      el.classList.add(this.highlightClass);
      this.highlightedElements.add(el);

      if (isPrimary) {
        const badge = document.createElement('div');
        badge.className = `${this.highlightClass}-badge`;
        badge.textContent = 'AI';
        badge.style.position = 'absolute';
        el.style.position = 'relative';
        el.appendChild(badge);
      }
    }

    clearHighlights() {
      this.highlightedElements.forEach(el => {
        el.classList.remove(this.highlightClass);
        el.querySelectorAll(`.voicepilot-highlight-badge`)
          .forEach(b => b.remove());
      });
      this.highlightedElements.clear();
    }

    destroy() {
      this.clearHighlights();
      if (this.highlightStyle) this.highlightStyle.remove();
      this.highlightStyle = null;
    }
  }

  const domHighlighter = new DOMHighlighter();

  // ═══════════════════════════════════════════════
  // SmartHighlighter (buffers AI‐speech → DOMHighlighter)
  // ═══════════════════════════════════════════════
  class SmartHighlighter {
    constructor() {
      this.textBuffer = '';
      this.bufferTimeout = null;
      this.lastHighlightTime = 0;
      this.cooldown = 2000;   // ms
      this.delay    = 1500;   // ms
    }
    addText(txt) {
      if (!txt || !txt.trim()) return;
      if (this.bufferTimeout) clearTimeout(this.bufferTimeout);
      this.textBuffer += (this.textBuffer && !this.textBuffer.endsWith(' ') && /^[A-Za-z]/.test(txt) ? ' ' : '') + txt;
      this.bufferTimeout = setTimeout(() => this.process(), this.delay);
    }
    process() {
      const now = Date.now();
      if (now - this.lastHighlightTime < this.cooldown) {
        this.textBuffer = '';
        return;
      }
      const phrase = this.textBuffer.trim();
      this.textBuffer = '';
      if (!phrase || phrase.length < 3) return;
      // simple filter to skip greetings
      if (/^(hi|hello|thanks?|please)$/i.test(phrase)) return;
      console.log('[VoicePilot] Trying to highlight:', phrase);
      if (domHighlighter.highlightElement(phrase)) {
        this.lastHighlightTime = now;
      }
    }
    clear() {
      this.textBuffer = '';
      if (this.bufferTimeout) clearTimeout(this.bufferTimeout);
    }
  }

  const smartHighlighter = new SmartHighlighter();

  // Expose global functions
  window.voicePilotHighlight = text => { 
    if (text && text.trim()) {
      smartHighlighter.addText(text); 
    }
    return true; 
  };
  
  window.voicePilotClearHighlights = () => {
    domHighlighter.clearHighlights();
    smartHighlighter.clear();
  };

  // ✅ NEW: Expose page context function
  window.voicePilotGetPageContext = () => {
    return pageContextCapture.getContextSummary();
  };

  // ────────────────────────────────────────────────────
  // Widget creation (unchanged)…
  // ────────────────────────────────────────────────────
  function createWidget() {
    /* … (all of your existing widget code—startCall, endCall, UI, etc.—
         remains exactly the same as before) … */
  }

  // Initialize widget
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.voicepilot = createWidget();
    });
  } else {
    window.voicepilot = createWidget();
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    pageContextCapture.destroy();
    domHighlighter.destroy();
  });

})();