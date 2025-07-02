(function() {
  'use strict';

  // Get script attributes
  const currentScript = document.currentScript;
  const agentId = currentScript?.getAttribute('data-agent');
  const position = currentScript?.getAttribute('data-position') || 'bottom-right';
  const supabaseUrl = currentScript?.getAttribute('data-supabase-url') || 'https://ljfidzppyflrrszkgusa.supabase.co';
  const supabaseAnonKey = currentScript?.getAttribute('data-supabase-anon-key') || '';

  if (!agentId) {
    console.error('VoicePilot: data-agent attribute is required');
    return;
  }

  // Set global Supabase configuration
  window.voicepilotSupabaseUrl = supabaseUrl;
  window.voicepilotSupabaseKey = supabaseAnonKey;

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
  // Live Call Context (simplified version of LiveCallContext)
  // ────────────────────────────────────────────────────
  class LiveCallContext {
    constructor() {
      this.status = 'idle';
      this.isScreenSharing = false;
      this.isMicrophoneActive = false;
      this.isVideoActive = false;
      this.errorMessage = null;
      this.transcript = '';
      this.duration = 0;
      this.highlightObjects = false;

      this.websocketRef = null;
      this.screenStream = null;
      this.microphoneStream = null;
      this.videoStream = null;
      this.audioContextRef = null;
      this.audioQueueTimeRef = 0;
      this.greetingSentRef = false;
      this.durationTimerRef = null;
      this.maxDurationTimerRef = null;
      this.usageRecordedRef = false;
      this.callEndedRef = false;
      this.agentOwnerIdRef = null;
      this.currentAgentIdRef = null;
      this.conversationIdRef = null;

      // ✅ TWO-BUFFER SYSTEM FOR REAL-TIME TRANSCRIPTION
      this.committedTextRef = '';
      this.partialTextRef = '';

      // ✅ PAGE CONTEXT MONITORING REFS
      this.currentPageContextRef = '';
      this.lastSentPageContextRef = '';
      this.pageContextIntervalRef = null;

      this.screenVideoRef = null;
      this.screenCanvasRef = null;
      this.screenIntervalRef = null;
      this.detectionInProgressRef = false;
    }

    // ✅ HELPER FUNCTION TO UPDATE TRANSCRIPT WITH TWO-BUFFER SYSTEM
    updateTranscriptDisplay() {
      const committed = this.committedTextRef;
      const partial = this.partialTextRef;
      
      // Smart spacing: add space between committed and partial if needed
      let fullText = committed;
      if (committed && partial) {
        const needsSpace = !committed.endsWith(' ') && !partial.startsWith(' ');
        fullText = committed + (needsSpace ? ' ' : '') + partial;
      } else if (partial) {
        fullText = partial;
      }
      
      this.transcript = fullText;
      this.onTranscriptUpdate?.(fullText);
    }

    async playAudioBuffer(pcmBlob) {
      try {
        console.log('[Live][Audio] Received audio buffer, size:', pcmBlob.size, 'bytes');
        
        const arrayBuffer = await pcmBlob.arrayBuffer();
        const pcm16 = new Int16Array(arrayBuffer);
        const float32 = new Float32Array(pcm16.length);
        for (let i = 0; i < pcm16.length; i++) {
          float32[i] = pcm16[i] / 32768;
        }

        if (!this.audioContextRef) {
          this.audioContextRef = new (window.AudioContext || window.webkitAudioContext)();
        }
        const audioCtx = this.audioContextRef;

        const buffer = audioCtx.createBuffer(1, float32.length, 24000);
        buffer.copyToChannel(float32, 0, 0);

        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);

        let startAt = audioCtx.currentTime;
        if (this.audioQueueTimeRef > audioCtx.currentTime) {
          startAt = this.audioQueueTimeRef;
        }
        source.start(startAt);
        this.audioQueueTimeRef = startAt + buffer.duration;
        
        console.log('[Live][Audio] Playing audio buffer, duration:', buffer.duration.toFixed(3), 'seconds');
      } catch (err) {
        console.error('[Live] playAudioBuffer() error decoding PCM16:', err);
      }
    }

    // ✅ NEW: Get page context for AI system instruction
    getPageContext() {
      try {
        if (typeof window !== 'undefined' && window.voicePilotGetPageContext) {
          return window.voicePilotGetPageContext();
        }
      } catch (error) {
        console.warn('[Live] Error getting page context:', error);
      }
      
      // Fallback context
      return `Page: ${document.title || 'Unknown'}, URL: ${window.location.pathname}`;
    }

    // ✅ NEW: Monitor page context changes during active call
    startPageContextMonitoring() {
      if (this.pageContextIntervalRef) {
        clearInterval(this.pageContextIntervalRef);
      }

      this.pageContextIntervalRef = setInterval(() => {
        if (this.status !== 'active' || !this.websocketRef || this.websocketRef.readyState !== WebSocket.OPEN) {
          return;
        }

        try {
          const newContext = this.getPageContext();
          this.currentPageContextRef = newContext;

          // Check if context has changed significantly
          if (newContext !== this.lastSentPageContextRef) {
            console.log('[Live] Page context changed, updating AI:', newContext);
            
            // Send page context update to AI
            const contextUpdateMessage = {
              clientContent: {
                turns: [
                  {
                    role: 'user',
                    parts: [{ 
                      text: `PAGE CONTEXT UPDATE: ${newContext}` 
                    }],
                  },
                ],
                turnComplete: true,
              },
            };

            this.websocketRef.send(JSON.stringify(contextUpdateMessage));
            this.lastSentPageContextRef = newContext;
            
            console.log('[Live] Sent page context update to AI');
          }
        } catch (error) {
          console.warn('[Live] Error monitoring page context:', error);
        }
      }, 2000); // Check every 2 seconds
    }

    stopPageContextMonitoring() {
      if (this.pageContextIntervalRef) {
        clearInterval(this.pageContextIntervalRef);
        this.pageContextIntervalRef = null;
      }
    }

    async startCall(systemInstruction, maxDuration, documentationUrls, agentId) {
      try {
        // ✅ IMPROVED: Check for existing WebSocket and handle stale connections
        if (this.websocketRef) {
          const ws = this.websocketRef;
          
          // Check the readyState of the existing WebSocket
          if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
            console.warn('[Live] startCall() called but WebSocket is already active or connecting.');
            return;
          } else if (ws.readyState === WebSocket.CLOSING || ws.readyState === WebSocket.CLOSED) {
            console.log('[Live] Clearing stale WebSocket reference (state:', ws.readyState, ')');
            // Attempt to close if still closing, then clear the reference
            if (ws.readyState === WebSocket.CLOSING) {
              try {
                ws.close();
              } catch (error) {
                console.warn('[Live] Error closing stale WebSocket:', error);
              }
            }
            this.websocketRef = null;
          }
        }

        this.errorMessage = null;
        this.duration = 0;
        this.usageRecordedRef = false;
        this.currentAgentIdRef = agentId || null;
        this.conversationIdRef = null;
        this.callEndedRef = false;
        
        // ✅ CLEAR BOTH BUFFERS AND TRANSCRIPT
        this.committedTextRef = '';
        this.partialTextRef = '';
        this.transcript = '';

        // Start duration timer
        this.durationTimerRef = setInterval(() => {
          this.duration += 1;
          this.onDurationUpdate?.(this.duration);
        }, 1000);

        // Set max duration timer if specified
        if (maxDuration) {
          this.maxDurationTimerRef = setTimeout(() => {
            this.endCall();
          }, maxDuration * 1000);
        }

        // ✅ NEW: Get relay URL from backend instead of direct Gemini connection
        const response = await fetch(`${supabaseUrl}/functions/v1/start-call`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({ 
            agentId, 
            instructions: systemInstruction, 
            documentationUrls 
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to start call');
        }

        const { relayUrl } = await response.json();
        console.log('[Live] Using relay URL:', relayUrl);

        const ws = new WebSocket(relayUrl);
        this.websocketRef = ws;

        ws.onopen = () => {
          console.log('[Live][WebSocket] onopen: connection established');
          this.status = 'connecting';
          this.onStatusChange?.('connecting');

          // ✅ Get current page context and initialize monitoring
          const pageContext = this.getPageContext();
          this.currentPageContextRef = pageContext;
          this.lastSentPageContextRef = pageContext;
          console.log('[Live] Initial page context:', pageContext);

          // Create URL context tools if documentation URLs are provided
          const tools = [];
          
          if (documentationUrls?.length) {
            tools.push({
              url_context: {
                urls: documentationUrls
              }
            });
          }

          // ✅ Enhanced system instruction with page context
          const enhancedSystemInstruction = `${systemInstruction || 'You are a helpful AI assistant.'} 

CURRENT PAGE CONTEXT: ${pageContext}

When responding, consider the user's current location and what they can see on the page. If they ask about something that doesn't match their current context, gently guide them or ask for clarification. When you mention specific UI elements, buttons, or parts of the interface in your responses, I will automatically highlight them for the user. Speak naturally about what you see and what actions the user might take.`;

          // Setup message with tools and Kore voice - AUDIO ONLY
          const setupMsg = {
            setup: {
              model: 'models/gemini-2.0-flash-live-001',
              generationConfig: {
                responseModalities: ['AUDIO'], // ✅ AUDIO ONLY - no TEXT
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: 'Kore'
                    }
                  }
                }
              },
              tools: tools.length > 0 ? tools : undefined,
              outputAudioTranscription: {}, // ✅ Enable transcription of AI speech
              inputAudioTranscription: {},  // ✅ Enable transcription of user speech
              systemInstruction: {
                parts: [
                  {
                    text: enhancedSystemInstruction,
                  },
                ],
              },
            },
          };

          console.log('[Live][WebSocket] Sending setup:', setupMsg);
          ws.send(JSON.stringify(setupMsg));
        };

        ws.onmessage = async (ev) => {
          let blob;

          // Chrome delivers ArrayBuffer, Firefox delivers Blob — handle both
          if (ev.data instanceof Blob) {
            blob = ev.data;                     // unchanged
          } else if (ev.data instanceof ArrayBuffer) {
            blob = new Blob([ev.data]);         // wrap the buffer
          } else {
            // unknown type – ignore
            return;
          }

          // ↓ everything that previously used ev.data continues to use `blob`
          let maybeText = null;
          try {
            maybeText = await blob.text();
          } catch {
            maybeText = null;
          }

          if (maybeText) {
            try {
              const parsed = JSON.parse(maybeText);
              console.log('[Live][Debug] incoming JSON frame:', parsed);

              if (parsed.setupComplete) {
                console.log('[Live][WebSocket] Received setupComplete ✅');
                this.status = 'active';
                this.onStatusChange?.('active');

                // ✅ Start page context monitoring when call becomes active
                this.startPageContextMonitoring();

                if (ws.readyState === WebSocket.OPEN && !this.greetingSentRef) {
                  const greeting = {
                    clientContent: {
                      turns: [
                        {
                          role: 'user',
                          parts: [{ text: 'Hello!' }],
                        },
                      ],
                      turnComplete: true,
                    },
                  };
                  ws.send(JSON.stringify(greeting));
                  this.greetingSentRef = true;
                  console.log('[Live] Sent initial text greeting: "Hello!"');
                }

                this.startMicStreaming();
                return;
              }

              if (parsed.serverContent) {
                const sc = parsed.serverContent;

                // ✅ HANDLE AI SPEECH TRANSCRIPTION WITH TWO-BUFFER SYSTEM
                if (sc.outputTranscription) {
                  const { text, finished } = sc.outputTranscription;
                  
                  if (text) {
                    // 1) ACCUMULATE fragments in the partial buffer (don't replace!)
                    this.partialTextRef += text;
                    
                    // 2) Update the display immediately with committed + partial
                    this.updateTranscriptDisplay();
                    
                    console.log('[Live] AI transcription fragment (partial):', text);
                  }

                  // 3) When finished, MOVE partial to committed and clear partial
                  if (finished && this.partialTextRef) {
                    const partialText = this.partialTextRef.trim();
                    
                    // Add to committed with smart spacing
                    if (this.committedTextRef && partialText) {
                      const needsSpace = !this.committedTextRef.endsWith(' ') && !partialText.startsWith(' ');
                      this.committedTextRef += (needsSpace ? ' ' : '') + partialText;
                    } else if (partialText) {
                      this.committedTextRef = partialText;
                    }
                    
                    // Clear partial buffer
                    this.partialTextRef = '';
                    
                    // Update display with committed text only
                    this.updateTranscriptDisplay();
                    
                    // ✅ HIGHLIGHT THE COMPLETE PHRASE
                    if (window.voicePilotHighlight && partialText) {
                      window.voicePilotHighlight(partialText);
                    }
                    
                    console.log('[Live] AI said (complete phrase):', partialText);
                  }
                }

                // ✅ HANDLE USER SPEECH TRANSCRIPTION
                if (sc.inputTranscription?.text) {
                  const userText = sc.inputTranscription.text.trim();
                  if (userText) {
                    // Add to committed text with smart spacing
                    if (this.committedTextRef) {
                      const needsSpace = !this.committedTextRef.endsWith(' ') && !userText.startsWith(' ');
                      this.committedTextRef += (needsSpace ? ' ' : '') + userText;
                    } else {
                      this.committedTextRef = userText;
                    }
                    
                    this.updateTranscriptDisplay();
                    console.log('[Live] User transcription:', userText);
                  }
                }

                // Handle audio data from modelTurn.parts
                const mt = sc.modelTurn;
                if (mt?.parts) {
                  for (const part of mt.parts) {
                    // Handle audio data
                    if (part.inlineData && typeof part.inlineData.data === 'string') {
                      try {
                        const base64str = part.inlineData.data;
                        const binaryStr = atob(base64str);
                        const len = binaryStr.length;
                        const rawBuffer = new Uint8Array(len);
                        for (let i = 0; i < len; i++) {
                          rawBuffer[i] = binaryStr.charCodeAt(i);
                        }
                        const pcmBlob = new Blob([rawBuffer.buffer], {
                          type: 'audio/pcm;rate=24000',
                        });
                        console.log('[Live][Debug] Decoded inlineData, scheduling audio playback');
                        this.playAudioBuffer(pcmBlob);
                      } catch (err) {
                        console.error('[Live] Error decoding inlineData audio:', err);
                      }
                    }
                  }
                  return; // ✅ BAIL OUT AFTER HANDLING AUDIO
                }

                // ✅ CHECK FOR TURN COMPLETE TO FORCE COMMIT PARTIAL BUFFER
                if (sc.turnComplete && this.partialTextRef) {
                  console.log('[Live] Turn complete - committing partial buffer');
                  const partialText = this.partialTextRef.trim();
                  
                  // Move partial to committed
                  if (this.committedTextRef && partialText) {
                    const needsSpace = !this.committedTextRef.endsWith(' ') && !partialText.startsWith(' ');
                    this.committedTextRef += (needsSpace ? ' ' : '') + partialText;
                  } else if (partialText) {
                    this.committedTextRef = partialText;
                  }
                  
                  // Clear partial buffer
                  this.partialTextRef = '';
                  
                  this.updateTranscriptDisplay();
                  
                  if (window.voicePilotHighlight && partialText) {
                    window.voicePilotHighlight(partialText);
                  }
                  
                  console.log('[Live] AI said (turn complete commit):', partialText);
                }
              }

              return;
            } catch (parseError) {
              console.error('[Live] JSON parse error:', parseError);
              // Continue to fallback for binary data
            }
          }

          console.log('[Live][Debug] incoming Blob is not JSON or not recognized → playing raw PCM');
          this.playAudioBuffer(blob);
        };

        ws.onerror = (err) => {
          console.error('[Live][WebSocket] onerror:', err);
          this.errorMessage = 'WebSocket encountered an error.';
          this.status = 'error';
          this.onStatusChange?.('error');
          this.onErrorChange?.('WebSocket encountered an error.');
        };

        ws.onclose = (ev) => {
          console.log(`[Live][WebSocket] onclose: code=${ev.code}, reason="${ev.reason}"`);
          this.status = 'ended';
          this.onStatusChange?.('ended');
          this.websocketRef = null;
          // ✅ Stop page context monitoring when call ends
          this.stopPageContextMonitoring();
        };
      } catch (err) {
        console.error('[Live] Failed to start call:', err);
        this.errorMessage = err.message ?? 'Failed to start call.';
        this.status = 'error';
        this.onStatusChange?.('error');
        this.onErrorChange?.(err.message ?? 'Failed to start call.');
      }
    }

    async startMicStreaming() {
      try {
        console.log('[Live][Audio] Requesting microphone access...');
        
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        this.microphoneStream = micStream;
        
        console.log('[Live][Audio] Microphone access granted, setting up audio processing...');

        if (!this.audioContextRef) {
          this.audioContextRef = new (window.AudioContext || window.webkitAudioContext)();
        }
        const audioCtx = this.audioContextRef;

        const sourceNode = audioCtx.createMediaStreamSource(micStream);
        const bufferSize = 4096;
        const processor = audioCtx.createScriptProcessor(bufferSize, 1, 1);

        sourceNode.connect(processor);
        processor.connect(audioCtx.destination);

        processor.onaudioprocess = (event) => {
          const float32Data = event.inputBuffer.getChannelData(0);
          const inRate = audioCtx.sampleRate;
          const outRate = 16000;
          const ratio = inRate / outRate;
          const outLength = Math.floor(float32Data.length / ratio);

          const pcm16 = new Int16Array(outLength);
          for (let i = 0; i < outLength; i++) {
            const idx = Math.floor(i * ratio);
            let sample = float32Data[idx];
            sample = Math.max(-1, Math.min(1, sample));
            pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
          }

          const u8 = new Uint8Array(pcm16.buffer);
          let binary = '';
          for (let i = 0; i < u8.byteLength; i++) {
            binary += String.fromCharCode(u8[i]);
          }
          const base64Audio = btoa(binary);

          const payload = {
            realtime_input: {
              audio: {
                data: base64Audio,
                mime_type: 'audio/pcm;rate=16000',
              },
            },
          };

          if (this.websocketRef?.readyState === WebSocket.OPEN) {
            this.websocketRef.send(JSON.stringify(payload));
            // ✅ ADDED: Log audio data transmission (throttled to avoid spam)
            if (Math.random() < 0.01) { // Log ~1% of audio chunks
              console.log(`[Live][Audio] Sent PCM16 chunk (${pcm16.byteLength * 2} bytes) to relay`);
            }
          }
        };

        this.isMicrophoneActive = true;
        this.onMicrophoneChange?.(true);
        console.log('[Live][Audio] Microphone streaming started successfully');
      } catch (err) {
        console.error('[Live] Mic streaming error:', err);
        this.errorMessage = 'Failed to capture microphone.';
        this.onErrorChange?.('Failed to capture microphone.');
      }
    }

    toggleMicrophone() {
      try {
        this.errorMessage = null;
        if (this.isMicrophoneActive && this.microphoneStream) {
          console.log('[Live][Audio] Stopping microphone...');
          if (this.audioContextRef) {
            this.audioContextRef.close().catch(() => {});
            this.audioContextRef = null;
            this.audioQueueTimeRef = 0;
          }
          this.microphoneStream.getTracks().forEach((t) => t.stop());
          this.microphoneStream = null;
          this.isMicrophoneActive = false;
          this.onMicrophoneChange?.(false);
          console.log('[Live][Audio] Microphone stopped');
        } else if (!this.isMicrophoneActive) {
          console.log('[Live][Audio] Starting microphone...');
          this.startMicStreaming().catch((err) => {
            console.error('[Live] toggleMicrophone start error:', err);
            this.errorMessage = 'Failed to start microphone.';
            this.onErrorChange?.('Failed to start microphone.');
          });
        }
      } catch (err) {
        console.error('[Live] toggleMicrophone error:', err);
        this.errorMessage = 'Failed to toggle microphone.';
        this.onErrorChange?.('Failed to toggle microphone.');
      }
    }

    endCall(fromUnload = false) {
      if (this.callEndedRef) {
        return;
      }
      this.callEndedRef = true;
      
      try {
        const finalDuration = this.duration;
        // ✅ GET FINAL TRANSCRIPT FROM BOTH BUFFERS
        const finalTranscript = (this.committedTextRef + this.partialTextRef).trim();
        const agentId = this.currentAgentIdRef;
        const conversationId = this.conversationIdRef;

        console.log('[Live] Ending call - Duration:', finalDuration, 'seconds, Transcript length:', finalTranscript.length);

        // Clear any DOM highlights
        if (window.voicePilotClearHighlights) {
          window.voicePilotClearHighlights();
        }

        if (this.durationTimerRef) {
          clearInterval(this.durationTimerRef);
          this.durationTimerRef = null;
        }
        if (this.maxDurationTimerRef) {
          clearTimeout(this.maxDurationTimerRef);
          this.maxDurationTimerRef = null;
        }

        // ✅ Stop page context monitoring
        this.stopPageContextMonitoring();

        if (this.websocketRef) {
          this.websocketRef.close();
          this.websocketRef = null;
        }
        
        [this.screenStream, this.microphoneStream, this.videoStream].forEach(
          (stream) => {
            if (stream) {
              stream.getTracks().forEach((t) => t.stop());
            }
          }
        );
        this.screenStream = null;
        this.microphoneStream = null;
        this.videoStream = null;
        if (this.audioContextRef) {
          this.audioContextRef.close().catch(() => {});
          this.audioContextRef = null;
          this.audioQueueTimeRef = 0;
        }
        this.isScreenSharing = false;
        this.isMicrophoneActive = false;
        this.isVideoActive = false;
        this.status = 'ended';
        this.onStatusChange?.('ended');
        this.agentOwnerIdRef = null;
        this.currentAgentIdRef = null;
        this.conversationIdRef = null;
        
        // ✅ CLEAR BOTH BUFFERS
        this.committedTextRef = '';
        this.partialTextRef = '';
      } catch (err) {
        console.error('[Live] Error ending call:', err);
        this.errorMessage = 'Error ending call.';
        this.status = 'error';
        this.onStatusChange?.('error');
        this.onErrorChange?.('Error ending call.');
      }
    }
  }

  // ────────────────────────────────────────────────────
  // Widget creation
  // ────────────────────────────────────────────────────
  function createWidget() {
    // Create widget container
    const widget = document.createElement('div');
    widget.id = 'voicepilot-widget';
    
    // Position mapping
    const positions = {
      'bottom-right': { bottom: '20px', right: '20px' },
      'bottom-left': { bottom: '20px', left: '20px' },
      'top-right': { top: '20px', right: '20px' },
      'top-left': { top: '20px', left: '20px' }
    };
    
    const pos = positions[position] || positions['bottom-right'];
    
    // Apply styles
    Object.assign(widget.style, {
      position: 'fixed',
      zIndex: '10000',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      ...pos
    });

    // Create live call context
    const liveCall = new LiveCallContext();
    let agent = null;
    let isExpanded = false;

    // Widget HTML
    widget.innerHTML = `
      <div id="voicepilot-container" style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 25px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        padding: 20px;
        min-width: 320px;
        max-width: 400px;
        color: white;
        transition: all 0.3s ease;
        display: none;
      ">
        <div id="voicepilot-header" style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 15px;
        ">
          <h3 style="margin: 0; font-size: 18px; font-weight: 600;">
            🎯 Voice Guide
          </h3>
          <button id="voicepilot-close" style="
            background: rgba(255,255,255,0.2);
            border: none;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            color: white;
            cursor: pointer;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">×</button>
        </div>
        
        <div id="voicepilot-status" style="
          text-align: center;
          margin-bottom: 20px;
        ">
          <div id="voicepilot-status-indicator" style="
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: rgba(255,255,255,0.2);
            margin: 0 auto 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
          ">🎤</div>
          <div id="voicepilot-status-text" style="
            font-size: 14px;
            opacity: 0.9;
          ">Ready to help</div>
        </div>
        
        <div id="voicepilot-controls" style="
          display: flex;
          gap: 10px;
          justify-content: center;
        ">
          <button id="voicepilot-start" style="
            background: rgba(255,255,255,0.2);
            border: none;
            border-radius: 20px;
            padding: 12px 24px;
            color: white;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
          ">Start Call</button>
          <button id="voicepilot-end" style="
            background: rgba(255,255,255,0.1);
            border: none;
            border-radius: 20px;
            padding: 12px 24px;
            color: white;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
            display: none;
          ">End Call</button>
        </div>
        
        <div id="voicepilot-transcript" style="
          margin-top: 15px;
          padding: 10px;
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
          font-size: 12px;
          max-height: 100px;
          overflow-y: auto;
          display: none;
        "></div>
      </div>

      <button id="voicepilot-fab" style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        border-radius: 50%;
        width: 60px;
        height: 60px;
        color: white;
        cursor: pointer;
        font-size: 24px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      ">🎤</button>
    `;

    document.body.appendChild(widget);

    // Get elements
    const container = widget.querySelector('#voicepilot-container');
    const fab = widget.querySelector('#voicepilot-fab');
    const closeBtn = widget.querySelector('#voicepilot-close');
    const startBtn = widget.querySelector('#voicepilot-start');
    const endBtn = widget.querySelector('#voicepilot-end');
    const statusIndicator = widget.querySelector('#voicepilot-status-indicator');
    const statusText = widget.querySelector('#voicepilot-status-text');
    const transcript = widget.querySelector('#voicepilot-transcript');

    // Load agent data
    async function loadAgent() {
      try {
        // Create a simple Supabase client
        const supabaseClient = {
          from: (table) => ({
            select: (columns) => ({
              eq: (column, value) => ({
                single: async () => {
                  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${column}=eq.${value}&select=${columns}`, {
                    headers: {
                      'apikey': supabaseAnonKey,
                      'Authorization': `Bearer ${supabaseAnonKey}`,
                      'Content-Type': 'application/json',
                    }
                  });
                  const data = await response.json();
                  return { data: data[0] || null, error: response.ok ? null : data };
                }
              })
            })
          })
        };

        const { data, error } = await supabaseClient
          .from('agents')
          .select('*')
          .eq('id', agentId)
          .single();

        if (error || !data) {
          console.error('Failed to load agent:', error);
          return;
        }

        agent = {
          id: data.id,
          name: data.name,
          instructions: data.instructions,
          status: data.status,
          canSeeScreenshare: data.can_see_screenshare,
          callDuration: data.call_duration,
          documentationUrls: data.documentation_urls || [],
        };

        console.log('Loaded agent:', agent);
      } catch (err) {
        console.error('Error loading agent:', err);
      }
    }

    // Set up event handlers for live call context
    liveCall.onStatusChange = (status) => {
      console.log('[Widget] Status changed to:', status);
      switch (status) {
        case 'connecting':
          statusText.textContent = 'Connecting...';
          statusIndicator.textContent = '⏳';
          break;
        case 'active':
          statusText.textContent = 'Connected - Speak now';
          statusIndicator.textContent = '🎯';
          startBtn.style.display = 'none';
          endBtn.style.display = 'block';
          transcript.style.display = 'block';
          fab.textContent = '🔴';
          break;
        case 'ended':
          statusText.textContent = 'Call ended';
          statusIndicator.textContent = '📞';
          startBtn.style.display = 'block';
          endBtn.style.display = 'none';
          transcript.style.display = 'none';
          fab.textContent = '🎤';
          setTimeout(() => {
            statusText.textContent = 'Ready to help';
            statusIndicator.textContent = '🎤';
          }, 2000);
          break;
        case 'error':
          statusText.textContent = 'Connection failed';
          statusIndicator.textContent = '❌';
          fab.textContent = '🎤';
          setTimeout(() => {
            statusText.textContent = 'Ready to help';
            statusIndicator.textContent = '🎤';
          }, 3000);
          break;
      }
    };

    liveCall.onTranscriptUpdate = (text) => {
      transcript.textContent = text;
    };

    liveCall.onErrorChange = (error) => {
      console.error('[Widget] Error:', error);
    };

    // Start call function
    async function startCall() {
      if (liveCall.status === 'active' || liveCall.status === 'connecting') return;

      try {
        if (!agent) {
          await loadAgent();
        }

        if (!agent) {
          throw new Error('Agent not found');
        }

        await liveCall.startCall(
          agent.instructions,
          agent.callDuration,
          agent.documentationUrls,
          agentId
        );

        console.log('[Widget] Call started successfully');
      } catch (error) {
        console.error('[Widget] Failed to start call:', error);
        statusText.textContent = 'Connection failed';
        statusIndicator.textContent = '❌';
        setTimeout(() => {
          statusText.textContent = 'Ready to help';
          statusIndicator.textContent = '🎤';
        }, 3000);
      }
    }

    // End call function
    function endCall() {
      liveCall.endCall();
      console.log('[Widget] Call ended');
    }

    // Toggle widget visibility
    function toggleWidget() {
      isExpanded = !isExpanded;
      container.style.display = isExpanded ? 'block' : 'none';
    }

    // Event listeners
    fab.addEventListener('click', () => {
      if (liveCall.status === 'idle' || liveCall.status === 'ended' || liveCall.status === 'error') {
        toggleWidget();
      } else {
        endCall();
      }
    });

    closeBtn.addEventListener('click', () => {
      toggleWidget();
    });

    startBtn.addEventListener('click', startCall);
    endBtn.addEventListener('click', endCall);

    // Hover effects
    startBtn.addEventListener('mouseenter', () => {
      startBtn.style.background = 'rgba(255,255,255,0.3)';
    });
    startBtn.addEventListener('mouseleave', () => {
      startBtn.style.background = 'rgba(255,255,255,0.2)';
    });

    endBtn.addEventListener('mouseenter', () => {
      endBtn.style.background = 'rgba(255,255,255,0.2)';
    });
    endBtn.addEventListener('mouseleave', () => {
      endBtn.style.background = 'rgba(255,255,255,0.1)';
    });

    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = 'rgba(255,255,255,0.3)';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'rgba(255,255,255,0.2)';
    });

    fab.addEventListener('mouseenter', () => {
      fab.style.transform = 'scale(1.1)';
    });
    fab.addEventListener('mouseleave', () => {
      fab.style.transform = 'scale(1)';
    });

    // Load agent data on initialization
    loadAgent();

    // Return widget API
    return {
      show: () => {
        isExpanded = true;
        container.style.display = 'block';
      },
      hide: () => {
        isExpanded = false;
        container.style.display = 'none';
      },
      startCall,
      endCall,
      isActive: () => liveCall.status === 'active'
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