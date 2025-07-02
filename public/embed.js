(function() {
  'use strict';

  // Get script attributes
  const currentScript = document.currentScript;
  const agentId = currentScript?.getAttribute('data-agent');
  const position = currentScript?.getAttribute('data-position') || 'bottom-right';
  const supabaseUrl = currentScript?.getAttribute('data-supabase-url');
  const supabaseAnonKey = currentScript?.getAttribute('data-supabase-anon-key');
  const googleApiKey = currentScript?.getAttribute('data-google-api-key');

  if (!agentId) {
    console.error('VoicePilot: data-agent attribute is required');
    return;
  }

  // Set global configuration if provided
  if (supabaseUrl) {
    window.voicepilotSupabaseUrl = supabaseUrl;
  }
  if (supabaseAnonKey) {
    window.voicepilotSupabaseKey = supabaseAnonKey;
  }
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
  // Enhanced DOM Highlighting System – EXPANDED ELEMENT SUPPORT
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

        /* VoicePilot Widget Styles */
        #voicepilot-widget {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          z-index: 999999;
          position: fixed;
        }

        .voicepilot-floating-button {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          border: none;
          cursor: pointer;
          box-shadow: 0 8px 32px rgba(59, 130, 246, 0.3);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .voicepilot-floating-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(59, 130, 246, 0.4);
        }

        .voicepilot-floating-button.pulse {
          animation: voicepilot-pulse 2s infinite;
        }

        @keyframes voicepilot-pulse {
          0% { box-shadow: 0 8px 32px rgba(59, 130, 246, 0.3); }
          50% { box-shadow: 0 8px 32px rgba(59, 130, 246, 0.6), 0 0 0 10px rgba(59, 130, 246, 0.1); }
          100% { box-shadow: 0 8px 32px rgba(59, 130, 246, 0.3); }
        }

        .voicepilot-logo {
          width: 28px;
          height: 28px;
          filter: brightness(0) invert(1);
        }

        .voicepilot-expanded-widget {
          width: 320px;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
          border: 1px solid rgba(0, 0, 0, 0.1);
          position: absolute;
          bottom: 72px;
          right: 0;
          opacity: 0;
          transform: translateY(20px) scale(0.95);
          visibility: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
        }

        .voicepilot-expanded-widget.is-visible {
          opacity: 1;
          transform: translateY(0) scale(1);
          visibility: visible;
        }

        .voicepilot-header {
          padding: 20px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .voicepilot-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .voicepilot-header-logo {
          width: 32px;
          height: 32px;
        }

        .voicepilot-header-title {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
        }

        .voicepilot-close-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #f8fafc;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          color: #64748b;
        }

        .voicepilot-close-btn:hover {
          background: #e2e8f0;
          color: #475569;
        }

        .voicepilot-status-area {
          padding: 20px;
          text-align: center;
        }

        .voicepilot-status-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 12px;
          font-size: 20px;
          transition: all 0.3s ease;
        }

        .voicepilot-status-icon.ready {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
        }

        .voicepilot-status-icon.connecting {
          background: #fbbf24;
          color: white;
        }

        .voicepilot-status-icon.connected {
          background: #10b981;
          color: white;
          animation: voicepilot-pulse 2s infinite;
        }

        .voicepilot-status-icon.error {
          background: #ef4444;
          color: white;
        }

        .voicepilot-status-text {
          font-size: 14px;
          color: #64748b;
          margin: 0;
        }

        .voicepilot-controls {
          padding: 0 20px 20px;
          display: flex;
          gap: 8px;
        }

        .voicepilot-btn {
          flex: 1;
          padding: 12px 16px;
          border-radius: 8px;
          border: none;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .voicepilot-btn-primary {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
        }

        .voicepilot-btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .voicepilot-btn-secondary {
          background: #f8fafc;
          color: #475569;
          border: 1px solid #e2e8f0;
        }

        .voicepilot-btn-secondary:hover {
          background: #f1f5f9;
        }

        .voicepilot-btn-danger {
          background: #ef4444;
          color: white;
        }

        .voicepilot-btn-danger:hover {
          background: #dc2626;
        }

        .voicepilot-transcript {
          margin: 0 20px 20px;
          padding: 16px;
          background: #f8fafc;
          border-radius: 8px;
          font-size: 13px;
          line-height: 1.5;
          color: #475569;
          max-height: 120px;
          overflow-y: auto;
          display: none;
        }

        .voicepilot-transcript.visible {
          display: block;
        }

        .voicepilot-error {
          margin: 0 20px 20px;
          padding: 12px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #dc2626;
          font-size: 13px;
          display: none;
        }

        .voicepilot-error.visible {
          display: block;
        }

        .voicepilot-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #ffffff;
          border-top: 2px solid transparent;
          border-radius: 50%;
          animation: voicepilot-spin 1s linear infinite;
        }

        @keyframes voicepilot-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .voicepilot-expanded-widget {
            background: #1e293b;
            border-color: #334155;
          }

          .voicepilot-header {
            border-bottom-color: #334155;
          }

          .voicepilot-header-title {
            color: #f1f5f9;
          }

          .voicepilot-close-btn {
            background: #334155;
            color: #94a3b8;
          }

          .voicepilot-close-btn:hover {
            background: #475569;
            color: #cbd5e1;
          }

          .voicepilot-status-icon {
            background: #334155;
          }

          .voicepilot-status-text {
            color: #94a3b8;
          }

          .voicepilot-btn-secondary {
            background: #334155;
            color: #cbd5e1;
            border-color: #475569;
          }

          .voicepilot-btn-secondary:hover {
            background: #475569;
          }

          .voicepilot-transcript {
            background: #334155;
            color: #cbd5e1;
          }
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

    // 🆕 EXPANDED: More comprehensive element selector
    getInteractiveElements() {
      const selectors = [
        // Original button/input selectors
        'button',
        'input[type="button"]',
        'input[type="submit"]',
        'input[type="reset"]',
        
        // 🆕 Form elements
        'input[type="text"]',
        'input[type="email"]',
        'input[type="password"]',
        'input[type="search"]',
        'input[type="tel"]',
        'input[type="url"]',
        'input[type="number"]',
        'input[type="date"]',
        'input[type="datetime-local"]',
        'input[type="time"]',
        'input[type="checkbox"]',
        'input[type="radio"]',
        'input[type="file"]',
        'textarea',
        'select',
        
        // 🆕 Navigation elements
        'a[href]',
        '[role="tab"]',
        '[role="tabpanel"]',
        '[data-tab]',
        '.tab',
        '.nav-item',
        '.navigation-item',
        
        // 🆕 Interactive UI elements
        '[role="button"]',
        '[role="menuitem"]',
        '[role="option"]',
        '[role="switch"]',
        '[role="slider"]',
        '[aria-expanded]',
        '[data-toggle]',
        '[data-action]',
        
        // 🆕 Common clickable elements
        '.dropdown-toggle',
        '.menu-item',
        '.clickable',
        '[onclick]',
        
        // 🆕 Cards and panels (if they're clickable)
        '.card[role="button"]',
        '.panel[role="button"]',
        '[data-clickable="true"]'
      ];

      return Array.from(
        document.querySelectorAll(selectors.join(','))
      ).filter(el => this.isElementVisible(el) && this.isElementInteractive(el));
    }

    // 🆕 Helper to determine if element is truly interactive
    isElementInteractive(el) {
      // Skip if disabled
      if (el.disabled || el.getAttribute('aria-disabled') === 'true') {
        return false;
      }

      // Skip if it's a label without for attribute (not directly interactive)
      if (el.tagName === 'LABEL' && !el.getAttribute('for')) {
        return false;
      }

      // For links, ensure they have href
      if (el.tagName === 'A' && !el.getAttribute('href')) {
        return false;
      }

      // Check if element has click handlers or interactive roles
      const hasClickHandler = el.onclick || 
                             el.getAttribute('onclick') || 
                             el.getAttribute('data-action') ||
                             el.getAttribute('data-toggle');
                             
      const isFormElement = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(el.tagName);
      
      const hasInteractiveRole = [
        'button', 'tab', 'menuitem', 'option', 'switch', 'slider'
      ].includes(el.getAttribute('role'));

      return isFormElement || hasClickHandler || hasInteractiveRole || el.tagName === 'A';
    }

    // 🆕 ENHANCED: Better text extraction for different element types
    getElementText(el) {
      let text = '';
      
      // For form inputs, prioritize labels and placeholders
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) {
        // Try to find associated label by ID
        const id = el.id;
        if (id) {
          const label = document.querySelector(`label[for="${id}"]`);
          if (label && label.textContent?.trim()) {
            text = label.textContent.trim();
          }
        }
        
        // 🆕 Try to find nearby labels (common pattern where label appears before input)
        if (!text) {
          // Look for label immediately before this element
          let previousElement = el.previousElementSibling;
          while (previousElement && !text) {
            if (previousElement.tagName === 'LABEL' && previousElement.textContent?.trim()) {
              text = previousElement.textContent.trim();
              break;
            }
            // Also check if the previous element contains a label
            const labelInPrev = previousElement.querySelector('label');
            if (labelInPrev && labelInPrev.textContent?.trim()) {
              text = labelInPrev.textContent.trim();
              break;
            }
            previousElement = previousElement.previousElementSibling;
          }
        }

        // 🆕 Try to find parent container with label
        if (!text) {
          let parent = el.parentElement;
          let depth = 0;
          while (parent && depth < 3) { // Don't go too far up
            const labelInParent = parent.querySelector('label');
            if (labelInParent && labelInParent.textContent?.trim()) {
              text = labelInParent.textContent.trim();
              break;
            }
            parent = parent.parentElement;
            depth++;
          }
        }
        
        // Fallback to placeholder or aria-label
        if (!text) {
          text = el.placeholder?.trim() || 
                 el.getAttribute('aria-label')?.trim() || 
                 el.getAttribute('title')?.trim() || 
                 el.value?.trim() || '';
        }
      }
      // For other elements, use text content or aria-label
      else {
        text = el.getAttribute('aria-label')?.trim() ||
               el.getAttribute('title')?.trim() ||
               el.textContent?.trim() ||
               el.value?.trim() || '';
      }

      return text;
    }

    // 🆕 ENHANCED: Smarter scoring system for different element types
    scoreMatch(element, searchPhrase) {
      const elementText = this.getElementText(element).toLowerCase();
      const phrase = searchPhrase.toLowerCase();
      
      if (!elementText || !phrase) return 0;

      // Exact match gets highest score
      if (elementText === phrase) return 10;
      
      // Word boundary matches get high score
      const wordBoundaryRegex = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
      if (wordBoundaryRegex.test(elementText)) return 8;
      
      // Starts with gets good score
      if (elementText.startsWith(phrase)) return 6;
      
      // Contains gets medium score
      if (elementText.includes(phrase)) return 4;
      
      // Fuzzy matching for slight variations
      const similarity = this.calculateSimilarity(elementText, phrase);
      if (similarity > 0.8) return 3;
      if (similarity > 0.6) return 2;
      
      return 0;
    }

    // 🆕 Simple similarity calculation for fuzzy matching
    calculateSimilarity(str1, str2) {
      const longer = str1.length > str2.length ? str1 : str2;
      const shorter = str1.length > str2.length ? str2 : str1;
      
      if (longer.length === 0) return 1.0;
      
      const editDistance = this.levenshteinDistance(longer, shorter);
      return (longer.length - editDistance) / longer.length;
    }

    levenshteinDistance(str1, str2) {
      const matrix = Array(str2.length + 1).fill(null).map(() => 
        Array(str1.length + 1).fill(null)
      );
      
      for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
      for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
      
      for (let j = 1; j <= str2.length; j++) {
        for (let i = 1; i <= str1.length; i++) {
          const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
          matrix[j][i] = Math.min(
            matrix[j][i - 1] + 1,
            matrix[j - 1][i] + 1,
            matrix[j - 1][i - 1] + indicator
          );
        }
      }
      
      return matrix[str2.length][str1.length];
    }

    highlightElement(searchText) {
      // Extract phrase from quotes or use full text
      let phrase = searchText.trim();
      const quotedMatch = phrase.match(/['"]([^'"]+)['"]/);
      if (quotedMatch) {
        phrase = quotedMatch[1];
      }

      phrase = phrase.toLowerCase();
      if (!phrase || phrase.length < 2) return false;

      // Get all interactive elements
      const elements = this.getInteractiveElements();
      
      // Score all matches
      const matches = elements
        .map(el => ({
          el,
          text: this.getElementText(el),
          score: this.scoreMatch(el, phrase)
        }))
        .filter(match => match.score > 0)
        .sort((a, b) => b.score - a.score);

      if (!matches.length) {
        console.log('[VoicePilot] No interactive elements matching:', phrase);
        return false;
      }

      // Highlight the best match
      this.clearHighlights();
      const bestMatch = matches[0];
      this.addHighlight(bestMatch.el, true);
      bestMatch.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      console.log('[VoicePilot] Highlighting element:', {
        text: bestMatch.text,
        type: bestMatch.el.tagName,
        score: bestMatch.score
      });
      
      return true;
    }

    addHighlight(el, isPrimary = false) {
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
        el.querySelectorAll(`.${this.highlightClass}-badge`)
          .forEach(badge => badge.remove());
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
  // SmartHighlighter (real-time highlighting as AI speaks)
  // ═══════════════════════════════════════════════
  class SmartHighlighter {
    constructor() {
      this.textBuffer = '';
      this.bufferTimeout = null;
      this.lastHighlightTime = 0;
      this.cooldown = 1500;   // Reduced from 2000ms
      this.delay    = 300;    // Reduced from 1500ms for faster response
      this.streamBuffer = ''; // New: for real-time streaming
      this.streamTimeout = null;
      this.lastStreamHighlight = 0;
    }

    // 🆕 NEW: Real-time highlighting for streaming text
    addStreamingText(txt) {
      if (!txt || !txt.trim()) return;
      
      // Clear existing timeout
      if (this.streamTimeout) clearTimeout(this.streamTimeout);
      
      // Add to stream buffer
      this.streamBuffer += (this.streamBuffer && !this.streamBuffer.endsWith(' ') && /^[A-Za-z]/.test(txt) ? ' ' : '') + txt;
      
      // Process immediately if we detect quoted text (highest priority)
      const quotedMatch = this.streamBuffer.match(/['"]([^'"]+)['"]/);
      if (quotedMatch && quotedMatch[1].length > 2) {
        this.processStream(quotedMatch[1]);
        return;
      }
      
      // Look for common UI element patterns in real-time
      const patterns = [
        /\b(click|tap|press)\s+(?:the\s+)?['"]?([^'".\s]+(?:\s+[^'".\s]+)*?)['"]?(?:\s+(?:button|link|tab|field|input|dropdown|menu))/i,
        /\b(go\s+to|open|select)\s+(?:the\s+)?['"]?([^'".\s]+(?:\s+[^'".\s]+)*?)['"]?(?:\s+(?:tab|section|page|menu))/i,
        /\b(fill\s+in|enter|type\s+in)\s+(?:the\s+)?['"]?([^'".\s]+(?:\s+[^'".\s]+)*?)['"]?(?:\s+(?:field|input|box|area))/i
      ];
      
      for (const pattern of patterns) {
        const match = this.streamBuffer.match(pattern);
        if (match && match[2] && match[2].length > 2) {
          this.processStream(match[2]);
          return;
        }
      }
      
      // Fallback: process with short delay for any other potential matches
      this.streamTimeout = setTimeout(() => this.processStreamBuffer(), 200);
    }

    processStream(elementText) {
      const now = Date.now();
      if (now - this.lastStreamHighlight < 800) return; // Shorter cooldown for streaming
      
      console.log('[VoicePilot] Real-time highlight attempt:', elementText);
      if (domHighlighter.highlightElement(elementText)) {
        this.lastStreamHighlight = now;
        this.streamBuffer = ''; // Clear buffer on successful highlight
      }
    }

    processStreamBuffer() {
      // Extract the most recent potential element name
      const words = this.streamBuffer.trim().split(/\s+/);
      if (words.length >= 2) {
        // Try last 2-4 words as potential element names
        for (let i = Math.min(4, words.length); i >= 2; i--) {
          const phrase = words.slice(-i).join(' ');
          if (phrase.length > 3 && phrase.length < 30) {
            this.processStream(phrase);
            break;
          }
        }
      }
    }

    // Original method for backward compatibility
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
      this.streamBuffer = '';
      if (this.bufferTimeout) clearTimeout(this.bufferTimeout);
      if (this.streamTimeout) clearTimeout(this.streamTimeout);
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

  // 🆕 NEW: Expose real-time streaming highlight function
  window.voicePilotHighlightStream = text => {
    if (text && text.trim()) {
      smartHighlighter.addStreamingText(text);
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
  // Widget creation
  // ────────────────────────────────────────────────────
  function createWidget() {
    // Create widget container
    const widget = document.createElement('div');
    widget.id = 'voicepilot-widget';
    
    // Position mapping
    const positions = {
      'bottom-right': { bottom: '24px', right: '24px' },
      'bottom-left': { bottom: '24px', left: '24px' },
      'top-right': { top: '24px', right: '24px' },
      'top-left': { top: '24px', left: '24px' }
    };
    
    const pos = positions[position] || positions['bottom-right'];
    
    // Apply styles
    Object.assign(widget.style, {
      position: 'fixed',
      zIndex: '999999',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      ...pos
    });

    // Widget HTML with new design
    widget.innerHTML = `
      <!-- Floating Button -->
      <button class="voicepilot-floating-button" id="voicepilot-floating-button">
        <img src="/logovp.png" alt="Voice Pilot" class="voicepilot-logo" />
      </button>

      <!-- Expanded Widget -->
      <div class="voicepilot-expanded-widget" id="voicepilot-expanded-widget">
        <!-- Header -->
        <div class="voicepilot-header">
          <div class="voicepilot-header-left">
            <img src="/logovp.png" alt="Voice Pilot" class="voicepilot-header-logo" />
            <h3 class="voicepilot-header-title">Voice Pilot</h3>
          </div>
          <button class="voicepilot-close-btn" id="voicepilot-close-expanded">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Status Area -->
        <div class="voicepilot-status-area">
          <div class="voicepilot-status-icon ready" id="voicepilot-status-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9,22 9,12 15,12 15,22"></polyline>
            </svg>
          </div>
          <p class="voicepilot-status-text" id="voicepilot-status-text">Ready to help</p>
        </div>

        <!-- Controls -->
        <div class="voicepilot-controls" id="voicepilot-controls">
          <button class="voicepilot-btn voicepilot-btn-primary" id="voicepilot-start-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            </svg>
            Start Call
          </button>
        </div>

        <!-- Transcript -->
        <div class="voicepilot-transcript" id="voicepilot-transcript"></div>

        <!-- Error Message -->
        <div class="voicepilot-error" id="voicepilot-error"></div>
      </div>
    `;

    document.body.appendChild(widget);

    // Get elements
    const floatingButton = widget.querySelector('#voicepilot-floating-button');
    const expandedWidget = widget.querySelector('#voicepilot-expanded-widget');
    const closeBtn = widget.querySelector('#voicepilot-close-expanded');
    const statusIcon = widget.querySelector('#voicepilot-status-icon');
    const statusText = widget.querySelector('#voicepilot-status-text');
    const controls = widget.querySelector('#voicepilot-controls');
    const transcript = widget.querySelector('#voicepilot-transcript');
    const errorDiv = widget.querySelector('#voicepilot-error');

    let isExpanded = false;
    let isCallActive = false;
    let websocket = null;

    // Toggle expanded widget
    function toggleExpandedWidget(show) {
      isExpanded = show;
      if (show) {
        expandedWidget.classList.add('is-visible');
        floatingButton.style.display = 'none';
      } else {
        expandedWidget.classList.remove('is-visible');
        floatingButton.style.display = 'flex';
      }
    }

    // Update status display
    function updateStatusDisplay(status, message) {
      // Clear existing classes
      statusIcon.className = 'voicepilot-status-icon';
      
      // Update icon and styling based on status
      switch (status) {
        case 'ready':
          statusIcon.classList.add('ready');
          statusIcon.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9,22 9,12 15,12 15,22"></polyline>
            </svg>
          `;
          floatingButton.classList.remove('pulse');
          break;
        case 'connecting':
          statusIcon.classList.add('connecting');
          statusIcon.innerHTML = '<div class="voicepilot-spinner"></div>';
          floatingButton.classList.add('pulse');
          break;
        case 'connected':
          statusIcon.classList.add('connected');
          statusIcon.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
          `;
          floatingButton.classList.add('pulse');
          break;
        case 'error':
          statusIcon.classList.add('error');
          statusIcon.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          `;
          floatingButton.classList.remove('pulse');
          break;
      }
      
      statusText.textContent = message;
    }

    // Update controls based on call state
    function updateControls() {
      if (!isCallActive) {
        controls.innerHTML = `
          <button class="voicepilot-btn voicepilot-btn-primary" id="voicepilot-start-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            </svg>
            Start Call
          </button>
        `;
        
        // Re-attach start button event
        const startBtn = controls.querySelector('#voicepilot-start-btn');
        startBtn.addEventListener('click', startCall);
      } else {
        controls.innerHTML = `
          <button class="voicepilot-btn voicepilot-btn-secondary" id="voicepilot-mute-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
          </button>
          <button class="voicepilot-btn voicepilot-btn-secondary" id="voicepilot-share-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </button>
          <button class="voicepilot-btn voicepilot-btn-danger" id="voicepilot-end-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              <line x1="18" y1="6" x2="6" y2="18"></line>
            </svg>
          </button>
        `;
        
        // Re-attach control event listeners
        const muteBtn = controls.querySelector('#voicepilot-mute-btn');
        const shareBtn = controls.querySelector('#voicepilot-share-btn');
        const endBtn = controls.querySelector('#voicepilot-end-btn');
        
        muteBtn.addEventListener('click', () => console.log('Mute clicked'));
        shareBtn.addEventListener('click', () => console.log('Share screen clicked'));
        endBtn.addEventListener('click', endCall);
      }
    }

    // Show error message
    function showError(message) {
      errorDiv.textContent = message;
      errorDiv.classList.add('visible');
      setTimeout(() => {
        errorDiv.classList.remove('visible');
      }, 5000);
    }

    // Start call function
    async function startCall() {
      if (isCallActive) return;

      try {
        updateStatusDisplay('connecting', 'Connecting...');

        // Get configuration - prioritize Google API key for direct connection
        const apiKey = window.voicepilotGoogleApiKey;
        const supabaseUrl = window.voicepilotSupabaseUrl || 'https://ljfidzppyflrrszkgusa.supabase.co';
        const supabaseAnonKey = window.voicepilotSupabaseKey || '';

        console.log('[VoicePilot] Configuration check:', {
          hasApiKey: !!apiKey,
          hasSupabaseUrl: !!supabaseUrl,
          hasSupabaseKey: !!supabaseAnonKey
        });

        if (apiKey) {
          // Direct connection to Gemini Live API
          console.log('[VoicePilot] Using direct Gemini Live API connection');
          
          const { GoogleGenerativeAI } = await import('https://esm.run/@google/generative-ai');
          const genAI = new GoogleGenerativeAI(apiKey);
          
          const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash-exp",
            systemInstruction: `You are VoicePilot, an AI assistant embedded in a SaaS application to help users navigate and use the app effectively. 

Your role:
- Help users complete tasks step-by-step
- Guide them through the interface with clear instructions
- Answer questions about features and functionality
- Provide contextual help based on what they're currently viewing

Context awareness:
- You can see the current page context through the page summary
- When you mention UI elements like buttons, forms, or links, they will be automatically highlighted
- Speak naturally and conversationally

Guidelines:
- Be concise but helpful
- Give step-by-step instructions when needed
- Ask clarifying questions if the user's request is unclear
- Stay focused on helping with the current application

Current page context: ${window.voicePilotGetPageContext ? window.voicePilotGetPageContext() : 'Unknown page'}`
          });

          // Start live session
          const geminiSession = model.startChat({
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 8192,
            }
          });

          isCallActive = true;
          updateStatusDisplay('connected', 'Connected - Speak now');
          updateControls();
          transcript.classList.add('visible');

          console.log('[VoicePilot] Direct Gemini connection established');

        } else if (supabaseUrl && supabaseAnonKey) {
          // Use relay through Supabase
          console.log('[VoicePilot] Using Supabase relay connection');

          const response = await fetch(`${supabaseUrl}/functions/v1/start-call`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({
              agentId: agentId,
              instructions: 'You are VoicePilot, an AI assistant embedded in a SaaS application to help users navigate and use the app effectively.',
              documentationUrls: []
            })
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to start call');
          }

          const { relayUrl } = await response.json();
          console.log('[VoicePilot] Got relay URL:', relayUrl);

          // Connect to WebSocket
          websocket = new WebSocket(relayUrl);

          websocket.onopen = () => {
            console.log('[VoicePilot] WebSocket connected');
            isCallActive = true;
            updateStatusDisplay('connected', 'Connected - Speak now');
            updateControls();
            transcript.classList.add('visible');

            // Send setup message
            const setupMsg = {
              setup: {
                model: 'models/gemini-2.0-flash-live-001',
                generationConfig: {
                  responseModalities: ['AUDIO'],
                  speechConfig: {
                    voiceConfig: {
                      prebuiltVoiceConfig: {
                        voiceName: 'Kore'
                      }
                    }
                  }
                },
                outputAudioTranscription: {},
                inputAudioTranscription: {},
                systemInstruction: {
                  parts: [{
                    text: `You are VoicePilot, an AI assistant embedded in a SaaS application to help users navigate and use the app effectively. 

Current page context: ${window.voicePilotGetPageContext ? window.voicePilotGetPageContext() : 'Unknown page'}

Your role:
- Help users complete tasks step-by-step
- Guide them through the interface with clear instructions
- Answer questions about features and functionality
- Provide contextual help based on what they're currently viewing

When you mention UI elements like buttons, forms, or links, they will be automatically highlighted. Speak naturally and conversationally.`
                  }]
                }
              }
            };

            websocket.send(JSON.stringify(setupMsg));
          };

          websocket.onmessage = (event) => {
            // Handle incoming messages
            console.log('[VoicePilot] Received message');
          };

          websocket.onerror = (error) => {
            console.error('[VoicePilot] WebSocket error:', error);
            updateStatusDisplay('error', 'Connection failed');
            showError('Connection failed');
          };

          websocket.onclose = () => {
            console.log('[VoicePilot] WebSocket closed');
            isCallActive = false;
            updateStatusDisplay('ready', 'Ready to help');
            updateControls();
            transcript.classList.remove('visible');
          };

        } else {
          throw new Error('No API configuration provided. Please provide either Google API key or Supabase configuration.');
        }

      } catch (error) {
        console.error('[VoicePilot] Failed to start call:', error);
        updateStatusDisplay('error', 'Connection failed');
        showError(error.message || 'Failed to start call');
      }
    }

    // End call function
    function endCall() {
      if (!isCallActive) return;

      try {
        if (websocket) {
          websocket.close();
          websocket = null;
        }

        isCallActive = false;
        updateStatusDisplay('ready', 'Ready to help');
        updateControls();
        transcript.classList.remove('visible');
        
        // Clear any highlights
        if (window.voicePilotClearHighlights) {
          window.voicePilotClearHighlights();
        }

        console.log('[VoicePilot] Call ended');

      } catch (error) {
        console.error('[VoicePilot] Error ending call:', error);
      }
    }

    // Event listeners
    floatingButton.addEventListener('click', () => toggleExpandedWidget(true));
    closeBtn.addEventListener('click', () => toggleExpandedWidget(false));

    // Click outside to close
    document.addEventListener('click', (event) => {
      if (isExpanded && !widget.contains(event.target)) {
        toggleExpandedWidget(false);
      }
    });

    // Initial control setup
    updateControls();

    // Return widget API
    return {
      show: () => widget.style.display = 'block',
      hide: () => widget.style.display = 'none',
      open: () => toggleExpandedWidget(true),
      close: () => toggleExpandedWidget(false),
      startCall,
      endCall,
      isActive: () => isCallActive
    };
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