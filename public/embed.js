(function() {
  'use strict';

  // Get script attributes
  const currentScript = document.currentScript;
  const agentId = currentScript?.getAttribute('data-agent');
  const position = currentScript?.getAttribute('data-position') || 'bottom-right';
  const supabaseUrl = currentScript?.getAttribute('data-supabase-url');
  const supabaseAnonKey = currentScript?.getAttribute('data-supabase-anon-key');

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
      zIndex: '10000',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      ...pos
    });

    // Widget HTML with new design
    widget.innerHTML = `
      <div id="voicepilot-container" style="
        position: relative;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      ">
        <!-- Minimized State -->
        <div id="voicepilot-minimized" style="
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
          border-radius: 50%;
          box-shadow: 0 8px 32px rgba(59, 130, 246, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 3px solid rgba(255, 255, 255, 0.2);
        ">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="3" fill="white"/>
            <path d="M12 1v6m0 8v6m11-7h-6m-8 0H1" stroke="white" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>

        <!-- Expanded State -->
        <div id="voicepilot-expanded" style="
          width: 320px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
          border: 1px solid rgba(0, 0, 0, 0.1);
          overflow: hidden;
          display: none;
          position: absolute;
          bottom: 0;
          right: 0;
          transform-origin: bottom right;
        ">
          <!-- Header -->
          <div style="
            background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
            padding: 16px;
            color: white;
            position: relative;
          ">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="
                  width: 32px;
                  height: 32px;
                  background: rgba(255, 255, 255, 0.2);
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                ">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="3" fill="white"/>
                    <path d="M12 1v6m0 8v6m11-7h-6m-8 0H1" stroke="white" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                </div>
                <div>
                  <div style="font-weight: 600; font-size: 14px;">Voice Pilot</div>
                  <div id="voicepilot-status-text" style="font-size: 12px; opacity: 0.9;">Ready to help</div>
                </div>
              </div>
              <button id="voicepilot-close" style="
                background: rgba(255, 255, 255, 0.2);
                border: none;
                border-radius: 50%;
                width: 28px;
                height: 28px;
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
              ">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Content -->
          <div id="voicepilot-content" style="padding: 20px;">
            <!-- Ready State -->
            <div id="voicepilot-ready" style="text-align: center;">
              <div style="
                width: 48px;
                height: 48px;
                background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 16px;
                opacity: 0.1;
              ">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="white"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="white" stroke-width="2" stroke-linecap="round"/>
                  <line x1="12" y1="19" x2="12" y2="23" stroke="white" stroke-width="2" stroke-linecap="round"/>
                  <line x1="8" y1="23" x2="16" y2="23" stroke="white" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
              <h3 style="margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #1F2937;">Start Voice Chat</h3>
              <p style="margin: 0 0 20px; font-size: 14px; color: #6B7280; line-height: 1.4;">
                Get instant help and guidance through voice conversation
              </p>
              <button id="voicepilot-start" style="
                width: 100%;
                background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
                color: white;
                border: none;
                border-radius: 8px;
                padding: 12px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
              ">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="currentColor"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                Start Call
              </button>
            </div>

            <!-- Connecting State -->
            <div id="voicepilot-connecting" style="text-align: center; display: none;">
              <div style="
                width: 48px;
                height: 48px;
                background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 16px;
                animation: pulse 2s infinite;
              ">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="white" stroke-width="2"/>
                  <path d="M12 6v6l4 2" stroke="white" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
              <h3 style="margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #1F2937;">Connecting...</h3>
              <p style="margin: 0; font-size: 14px; color: #6B7280;">
                Setting up your voice connection
              </p>
            </div>

            <!-- Active State -->
            <div id="voicepilot-active" style="display: none;">
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                <div style="
                  width: 12px;
                  height: 12px;
                  background: #10B981;
                  border-radius: 50%;
                  animation: pulse 2s infinite;
                "></div>
                <span style="font-size: 14px; font-weight: 600; color: #1F2937;">Live Call</span>
                <span id="voicepilot-duration" style="font-size: 12px; color: #6B7280; margin-left: auto;">00:00</span>
              </div>

              <!-- Transcript -->
              <div id="voicepilot-transcript" style="
                background: #F9FAFB;
                border: 1px solid #E5E7EB;
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 16px;
                max-height: 120px;
                overflow-y: auto;
                font-size: 13px;
                line-height: 1.4;
                color: #374151;
                display: none;
              "></div>

              <!-- Controls -->
              <div style="display: flex; gap: 8px;">
                <button id="voicepilot-mute" style="
                  flex: 1;
                  background: #F3F4F6;
                  color: #374151;
                  border: 1px solid #D1D5DB;
                  border-radius: 8px;
                  padding: 10px;
                  font-size: 13px;
                  font-weight: 500;
                  cursor: pointer;
                  transition: all 0.2s;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 6px;
                ">
                  <svg id="voicepilot-mic-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="currentColor"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                  <span id="voicepilot-mute-text">Mute</span>
                </button>
                <button id="voicepilot-end" style="
                  flex: 1;
                  background: #EF4444;
                  color: white;
                  border: none;
                  border-radius: 8px;
                  padding: 10px;
                  font-size: 13px;
                  font-weight: 500;
                  cursor: pointer;
                  transition: all 0.2s;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 6px;
                ">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 5.5C3 14.06 9.94 21 18.5 21c.386 0 .77-.014 1.148-.042.435-.032.852-.08 1.262-.144V16.5a1 1 0 0 0-1-1H15a2 2 0 0 1-2-2v-2.5a1 1 0 0 0-1-1H8a2 2 0 0 1-2-2V5a1 1 0 0 0-1-1H3.5a1 1 0 0 0-1 1v.5z" fill="currentColor"/>
                  </svg>
                  End Call
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        #voicepilot-minimized:hover {
          transform: scale(1.05);
          box-shadow: 0 12px 40px rgba(59, 130, 246, 0.4);
        }
        
        #voicepilot-start:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
        }
        
        #voicepilot-mute:hover {
          background: #E5E7EB;
          border-color: #9CA3AF;
        }
        
        #voicepilot-end:hover {
          background: #DC2626;
        }
        
        #voicepilot-close:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      </style>
    `;

    document.body.appendChild(widget);

    // Get elements
    const minimized = widget.querySelector('#voicepilot-minimized');
    const expanded = widget.querySelector('#voicepilot-expanded');
    const closeBtn = widget.querySelector('#voicepilot-close');
    const startBtn = widget.querySelector('#voicepilot-start');
    const muteBtn = widget.querySelector('#voicepilot-mute');
    const endBtn = widget.querySelector('#voicepilot-end');
    const statusText = widget.querySelector('#voicepilot-status-text');
    const readyState = widget.querySelector('#voicepilot-ready');
    const connectingState = widget.querySelector('#voicepilot-connecting');
    const activeState = widget.querySelector('#voicepilot-active');
    const transcriptDiv = widget.querySelector('#voicepilot-transcript');
    const durationSpan = widget.querySelector('#voicepilot-duration');
    const micIcon = widget.querySelector('#voicepilot-mic-icon');
    const muteText = widget.querySelector('#voicepilot-mute-text');

    let isExpanded = false;
    let isCallActive = false;
    let websocket = null;
    let isMuted = false;
    let callDuration = 0;
    let durationInterval = null;

    // State management
    function showState(state) {
      readyState.style.display = state === 'ready' ? 'block' : 'none';
      connectingState.style.display = state === 'connecting' ? 'block' : 'none';
      activeState.style.display = state === 'active' ? 'block' : 'none';
    }

    function expand() {
      isExpanded = true;
      minimized.style.display = 'none';
      expanded.style.display = 'block';
      expanded.style.animation = 'voicepilot-expand 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    }

    function minimize() {
      isExpanded = false;
      expanded.style.display = 'none';
      minimized.style.display = 'flex';
    }

    function updateDuration() {
      const minutes = Math.floor(callDuration / 60);
      const seconds = callDuration % 60;
      durationSpan.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Event listeners
    minimized.addEventListener('click', expand);
    closeBtn.addEventListener('click', minimize);

    // Start call function
    async function startCall() {
      if (isCallActive) return;

      try {
        showState('connecting');
        statusText.textContent = 'Connecting...';

        // Get configuration
        const supabaseUrl = window.voicepilotSupabaseUrl || 'https://ljfidzppyflrrszkgusa.supabase.co';
        const supabaseAnonKey = window.voicepilotSupabaseKey || '';

        console.log('[VoicePilot] Starting call with configuration:', {
          hasSupabaseUrl: !!supabaseUrl,
          hasSupabaseKey: !!supabaseAnonKey,
          agentId: agentId
        });

        // Use relay through Supabase Edge Functions
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
          showState('active');
          statusText.textContent = 'Connected';
          
          // Start duration timer
          callDuration = 0;
          durationInterval = setInterval(() => {
            callDuration++;
            updateDuration();
          }, 1000);

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
          try {
            const data = JSON.parse(event.data);
            
            // Handle AI speech transcription
            if (data.serverContent?.outputTranscription?.text) {
              const text = data.serverContent.outputTranscription.text;
              transcriptDiv.textContent += text;
              transcriptDiv.style.display = 'block';
              transcriptDiv.scrollTop = transcriptDiv.scrollHeight;
              
              // Highlight elements mentioned by AI
              if (window.voicePilotHighlightStream) {
                window.voicePilotHighlightStream(text);
              }
            }
          } catch (err) {
            console.log('[VoicePilot] Received non-JSON message (likely audio data)');
          }
        };

        websocket.onerror = (error) => {
          console.error('[VoicePilot] WebSocket error:', error);
          statusText.textContent = 'Connection failed';
          showState('ready');
        };

        websocket.onclose = () => {
          console.log('[VoicePilot] WebSocket closed');
          endCall();
        };

      } catch (error) {
        console.error('[VoicePilot] Failed to start call:', error);
        statusText.textContent = 'Connection failed';
        showState('ready');
        alert('Failed to start call: ' + error.message);
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

        if (durationInterval) {
          clearInterval(durationInterval);
          durationInterval = null;
        }

        isCallActive = false;
        isMuted = false;
        callDuration = 0;
        transcriptDiv.textContent = '';
        transcriptDiv.style.display = 'none';
        
        showState('ready');
        statusText.textContent = 'Ready to help';
        
        // Clear any highlights
        if (window.voicePilotClearHighlights) {
          window.voicePilotClearHighlights();
        }

        console.log('[VoicePilot] Call ended');

      } catch (error) {
        console.error('[VoicePilot] Error ending call:', error);
      }
    }

    // Mute/unmute function
    function toggleMute() {
      isMuted = !isMuted;
      
      if (isMuted) {
        muteBtn.style.background = '#EF4444';
        muteBtn.style.color = 'white';
        muteBtn.style.borderColor = '#EF4444';
        muteText.textContent = 'Unmute';
        micIcon.innerHTML = `
          <path d="M1 1l22 22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" fill="currentColor"/>
          <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        `;
      } else {
        muteBtn.style.background = '#F3F4F6';
        muteBtn.style.color = '#374151';
        muteBtn.style.borderColor = '#D1D5DB';
        muteText.textContent = 'Mute';
        micIcon.innerHTML = `
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="currentColor"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        `;
      }
    }

    // Event listeners
    startBtn.addEventListener('click', startCall);
    muteBtn.addEventListener('click', toggleMute);
    endBtn.addEventListener('click', endCall);

    // Add expand animation CSS
    const style = document.createElement('style');
    style.textContent = `
      @keyframes voicepilot-expand {
        0% {
          opacity: 0;
          transform: scale(0.8) translateY(20px);
        }
        100% {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }
    `;
    document.head.appendChild(style);

    // Return widget API
    return {
      show: () => expand(),
      hide: () => minimize(),
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