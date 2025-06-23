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

  // Enhanced DOM Highlighting System
  class DOMHighlighter {
    constructor() {
      this.highlightedElements = new Set();
      this.highlightClass = 'voicepilot-highlight';
      this.highlightStyle = null;
      this.injectStyles();
    }

    injectStyles() {
      if (this.highlightStyle) {
        this.highlightStyle.remove();
      }

      this.highlightStyle = document.createElement('style');
      this.highlightStyle.id = 'voicepilot-highlight-styles';
      this.highlightStyle.textContent = `
        .${this.highlightClass} {
          position: relative !important;
          outline: 3px solid #3b82f6 !important;
          outline-offset: 2px !important;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3), 0 0 20px rgba(59, 130, 246, 0.2) !important;
          border-radius: 8px !important;
          background-color: rgba(59, 130, 246, 0.08) !important;
          transition: all 0.3s ease !important;
          z-index: 9999 !important;
        }
        
        .${this.highlightClass}::before {
          content: '';
          position: absolute;
          top: -6px;
          left: -6px;
          right: -6px;
          bottom: -6px;
          background: linear-gradient(45deg, rgba(59, 130, 246, 0.15), rgba(147, 51, 234, 0.15));
          border-radius: 12px;
          z-index: -1;
          animation: voicepilot-pulse 2s infinite;
          pointer-events: none;
        }
        
        @keyframes voicepilot-pulse {
          0%, 100% { 
            opacity: 0.4; 
            transform: scale(1); 
          }
          50% { 
            opacity: 0.8; 
            transform: scale(1.02); 
          }
        }
        
        .${this.highlightClass}-text {
          background: linear-gradient(120deg, #3b82f6, #8b5cf6) !important;
          -webkit-background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          background-clip: text !important;
          font-weight: 600 !important;
        }

        .${this.highlightClass}-badge {
          position: absolute;
          top: -12px;
          left: -8px;
          background: #3b82f6;
          color: white;
          font-size: 10px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 4px;
          z-index: 10000;
          pointer-events: none;
          animation: voicepilot-badge-appear 0.3s ease;
        }

        @keyframes voicepilot-badge-appear {
          0% { opacity: 0; transform: translateY(-5px) scale(0.8); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `;
      document.head.appendChild(this.highlightStyle);
    }

    extractSearchTerms(text) {
      // Enhanced term extraction with better UI element detection
      const commonWords = new Set([
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
        'click', 'press', 'tap', 'select', 'choose', 'find', 'locate', 'go', 'navigate', 'see',
        'can', 'could', 'would', 'should', 'will', 'shall', 'may', 'might', 'must',
        'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
        'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did'
      ]);

      // Extract quoted text first (highest priority)
      const quotedTerms = [];
      const quoteMatches = text.match(/"([^"]+)"|'([^']+)'/g);
      if (quoteMatches) {
        quoteMatches.forEach(match => {
          const term = match.slice(1, -1).trim();
          if (term.length > 1) quotedTerms.push(term);
        });
      }

      // Extract key phrases with specific patterns
      const keyPhrases = [];
      
      // Look for "new [something]" patterns
      const newPatterns = text.match(/\bnew\s+(\w+(?:\s+\w+)?)/gi);
      if (newPatterns) {
        newPatterns.forEach(match => {
          keyPhrases.push(match.trim());
          // Also add just the noun part
          const noun = match.replace(/^new\s+/i, '').trim();
          if (noun.length > 2) keyPhrases.push(noun);
        });
      }

      // Look for action + object patterns
      const actionPatterns = text.match(/\b(create|add|make|build|start|open|click|press|tap)\s+(\w+(?:\s+\w+)?)/gi);
      if (actionPatterns) {
        actionPatterns.forEach(match => {
          const parts = match.split(/\s+/);
          if (parts.length >= 2) {
            keyPhrases.push(parts.slice(1).join(' ')); // Just the object part
          }
        });
      }

      // Extract capitalized phrases (medium priority)
      const capitalizedPhrases = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
      
      // Extract general words (lower priority)
      const words = text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2 && !commonWords.has(word))
        .slice(0, 6);

      // Combine all terms with priority order
      return [...quotedTerms, ...keyPhrases, ...capitalizedPhrases, ...words];
    }

    calculateMatchConfidence(element, searchTerms) {
      const texts = [
        element.textContent?.toLowerCase() || '',
        element.getAttribute('aria-label')?.toLowerCase() || '',
        element.getAttribute('title')?.toLowerCase() || '',
        element.getAttribute('data-testid')?.toLowerCase() || '',
        element.getAttribute('data-agent-id')?.toLowerCase() || '',
        element.getAttribute('placeholder')?.toLowerCase() || '',
        element.className.toLowerCase(),
        element.id.toLowerCase()
      ].filter(Boolean);

      let totalScore = 0;
      let maxPossibleScore = searchTerms.length;

      searchTerms.forEach((term, index) => {
        let termScore = 0;
        const termLower = term.toLowerCase();
        
        texts.forEach((text, textIndex) => {
          // Weight different text sources
          const weights = [1.0, 0.95, 0.9, 0.85, 0.95, 0.8, 0.6, 0.7];
          const weight = weights[textIndex] || 0.5;
          
          if (text.includes(termLower)) {
            // Exact match bonus
            if (text === termLower) {
              termScore = Math.max(termScore, weight + 0.5);
            }
            // Word boundary match bonus
            else if (new RegExp(`\\b${termLower}\\b`).test(text)) {
              termScore = Math.max(termScore, weight + 0.3);
            }
            // Partial match
            else {
              termScore = Math.max(termScore, weight);
            }
          }
        });

        // Priority bonus for earlier terms (quoted text, key phrases, etc.)
        const priorityBonus = Math.max(0, (searchTerms.length - index) * 0.15);
        termScore += priorityBonus;

        totalScore += Math.min(1.2, termScore);
      });

      return totalScore / maxPossibleScore;
    }

    isElementVisible(element) {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        style.opacity !== '0' &&
        rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.right > 0
      );
    }

    searchElements(searchText) {
      const matches = [];
      const searchTerms = this.extractSearchTerms(searchText);
      
      if (searchTerms.length === 0) return matches;

      console.log('[VoicePilot] Searching for terms:', searchTerms);

      // Enhanced selectors with priority for buttons and interactive elements
      const selectors = [
        // High priority interactive elements
        'button',
        'a[href]',
        '[role="button"]',
        '[role="link"]',
        'input[type="button"]',
        'input[type="submit"]',
        
        // Medium priority elements
        '[data-testid]',
        '[data-agent-id]',
        '[aria-label]',
        '[onclick]',
        
        // UI component selectors
        '[class*="button"]',
        '[class*="btn"]',
        '[class*="link"]',
        '[class*="nav"]',
        '[class*="menu"]',
        '[class*="tab"]',
        
        // Form elements
        'form input',
        'form button',
        'form select',
        'form textarea',
        'label',
        
        // Content elements (lower priority)
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        '.card-title',
        '.title',
        '[class*="card"]',
        'nav a',
        'nav button',
        '[role="tab"]',
        '[role="menuitem"]'
      ];

      const elements = document.querySelectorAll(selectors.join(','));
      
      elements.forEach((element) => {
        if (!this.isElementVisible(element)) return;
        
        const confidence = this.calculateMatchConfidence(element, searchTerms);
        
        if (confidence > 0.15) {
          matches.push({
            element: element,
            text: this.getElementText(element),
            confidence: confidence,
            isInteractive: this.isInteractiveElement(element)
          });
        }
      });

      // Sort by confidence, but boost interactive elements
      const sortedMatches = matches.sort((a, b) => {
        const aScore = a.confidence + (a.isInteractive ? 0.2 : 0);
        const bScore = b.confidence + (b.isInteractive ? 0.2 : 0);
        return bScore - aScore;
      });

      console.log('[VoicePilot] Found matches:', sortedMatches.slice(0, 3).map(m => ({
        text: m.text,
        confidence: m.confidence.toFixed(2),
        interactive: m.isInteractive
      })));

      return sortedMatches;
    }

    isInteractiveElement(element) {
      const interactiveTags = ['button', 'a', 'input', 'select', 'textarea'];
      const interactiveRoles = ['button', 'link', 'tab', 'menuitem'];
      
      return (
        interactiveTags.includes(element.tagName.toLowerCase()) ||
        interactiveRoles.includes(element.getAttribute('role')) ||
        element.hasAttribute('onclick') ||
        element.classList.toString().match(/\b(button|btn|link|clickable)\b/i)
      );
    }

    getElementText(element) {
      return (
        element.getAttribute('aria-label') ||
        element.getAttribute('title') ||
        element.textContent?.trim() ||
        element.getAttribute('data-testid') ||
        element.getAttribute('placeholder') ||
        element.className ||
        'Element'
      ).substring(0, 50);
    }

    highlightElement(searchText) {
      const matches = this.searchElements(searchText);
      
      if (matches.length === 0) {
        console.log('[VoicePilot] No matches found for:', searchText);
        return false;
      }

      this.clearHighlights();

      const bestMatch = matches[0];
      console.log('[VoicePilot] Best match:', bestMatch.text, 'confidence:', bestMatch.confidence.toFixed(2));
      
      // More lenient threshold for highlighting
      const threshold = Math.max(0.25, bestMatch.confidence - 0.4);
      
      const elementsToHighlight = matches
        .filter(match => match.confidence >= threshold)
        .slice(0, 1) // Only highlight the best match to avoid confusion
        .map(match => match.element);

      elementsToHighlight.forEach((element, index) => {
        this.addHighlight(element, index === 0);
      });

      if (elementsToHighlight.length > 0) {
        this.scrollToElement(bestMatch.element);
      }

      // Auto-clear after 4 seconds
      setTimeout(() => {
        this.clearHighlights();
      }, 4000);

      return true;
    }

    addHighlight(element, isPrimary = false) {
      element.classList.add(this.highlightClass);
      this.highlightedElements.add(element);

      // Add badge for primary match
      if (isPrimary) {
        const badge = document.createElement('div');
        badge.className = `${this.highlightClass}-badge`;
        badge.textContent = 'AI';
        badge.style.position = 'absolute';
        
        // Position badge relative to element
        const rect = element.getBoundingClientRect();
        badge.style.top = '-12px';
        badge.style.left = '-8px';
        
        element.style.position = 'relative';
        element.appendChild(badge);
      }

      // Add text highlighting for text-only elements
      if (element.children.length === 0 && element.textContent?.trim()) {
        element.classList.add(`${this.highlightClass}-text`);
      }
    }

    scrollToElement(element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });
    }

    clearHighlights() {
      this.highlightedElements.forEach(element => {
        element.classList.remove(this.highlightClass, `${this.highlightClass}-text`);
        
        // Remove badges
        const badges = element.querySelectorAll(`.${this.highlightClass}-badge`);
        badges.forEach(badge => badge.remove());
      });
      this.highlightedElements.clear();
    }

    destroy() {
      this.clearHighlights();
      if (this.highlightStyle) {
        this.highlightStyle.remove();
        this.highlightStyle = null;
      }
    }
  }

  // Initialize DOM highlighter
  const domHighlighter = new DOMHighlighter();

  // Smart highlighting system with improved transcript processing
  class SmartHighlighter {
    constructor() {
      this.textBuffer = '';
      this.bufferTimeout = null;
      this.lastHighlightTime = 0;
      this.highlightCooldown = 3000; // 3 seconds between highlights
      this.bufferDelay = 2000; // Wait 2 seconds after last text before highlighting
      this.wordBuffer = []; // Buffer for building complete words
    }

    addText(text) {
      if (!text || text.trim().length === 0) return;
      
      // Process text to fix spacing issues
      const processedText = this.processTextSpacing(text);
      
      // Add to buffer
      this.textBuffer += processedText;
      
      // Clear existing timeout
      if (this.bufferTimeout) {
        clearTimeout(this.bufferTimeout);
      }
      
      // Set new timeout to process buffer
      this.bufferTimeout = setTimeout(() => {
        this.processBuffer();
      }, this.bufferDelay);
    }

    processTextSpacing(text) {
      // Clean up the text and fix common spacing issues
      let processed = text.trim();
      
      // If this looks like a broken word (single letters or very short fragments)
      if (processed.length <= 2 && /^[a-zA-Z!?.,]+$/.test(processed)) {
        // Add to word buffer
        this.wordBuffer.push(processed);
        
        // If we have accumulated enough fragments, try to form words
        if (this.wordBuffer.length > 1) {
          const combined = this.wordBuffer.join('');
          
          // If the combined text looks like a word or meaningful fragment
          if (combined.length >= 3) {
            this.wordBuffer = [];
            return this.addSpacing(combined);
          }
        }
        
        // Don't add single characters immediately
        return '';
      } else {
        // This is a longer text, flush any word buffer first
        let result = '';
        if (this.wordBuffer.length > 0) {
          result = this.addSpacing(this.wordBuffer.join(''));
          this.wordBuffer = [];
        }
        
        // Add the current text
        result += this.addSpacing(processed);
        return result;
      }
    }

    addSpacing(text) {
      if (!text) return '';
      
      // Add space before text if needed
      if (this.textBuffer.length > 0 && 
          !this.textBuffer.endsWith(' ') && 
          !this.textBuffer.endsWith('\n') &&
          !text.startsWith(' ') &&
          /^[a-zA-Z]/.test(text) &&
          /[a-zA-Z]$/.test(this.textBuffer)) {
        return ' ' + text;
      }
      return text;
    }

    processBuffer() {
      const now = Date.now();
      
      // Check cooldown
      if (now - this.lastHighlightTime < this.highlightCooldown) {
        console.log('[VoicePilot] Highlighting on cooldown, skipping');
        this.textBuffer = '';
        this.wordBuffer = [];
        return;
      }

      // Flush any remaining word buffer
      if (this.wordBuffer.length > 0) {
        this.textBuffer += this.addSpacing(this.wordBuffer.join(''));
        this.wordBuffer = [];
      }

      const textToProcess = this.textBuffer.trim();
      
      // Only highlight if we have substantial text
      if (textToProcess.length < 5) {
        this.textBuffer = '';
        return;
      }

      // Check if text contains actionable content
      if (this.shouldHighlight(textToProcess)) {
        console.log('[VoicePilot] Processing for highlight:', textToProcess);
        
        if (domHighlighter.highlightElement(textToProcess)) {
          this.lastHighlightTime = now;
        }
      } else {
        console.log('[VoicePilot] Text not suitable for highlighting:', textToProcess);
      }
      
      // Clear buffer
      this.textBuffer = '';
    }

    shouldHighlight(text) {
      const lowerText = text.toLowerCase();
      
      // Don't highlight if text is too short or just greetings
      if (text.length < 5) return false;
      
      // Don't highlight common greetings and filler words
      const skipPatterns = [
        /^(hi|hello|hey|good|thank|thanks|please|sorry|excuse|um|uh|well|so|now|okay|ok)\b/i,
        /^(how are you|how's it going|nice to meet|good morning|good afternoon|good evening)/i,
        /^(i am|i'm|you are|you're|we are|we're|they are|they're)/i,
        /^(yes|no|sure|of course|absolutely|definitely|maybe|perhaps)/i
      ];
      
      if (skipPatterns.some(pattern => pattern.test(text.trim()))) {
        return false;
      }
      
      // Highlight if text contains UI-related keywords or specific actions
      const uiKeywords = [
        'button', 'click', 'press', 'tap', 'select', 'choose', 'menu', 'link', 'tab',
        'sidebar', 'header', 'footer', 'navigation', 'nav', 'search', 'filter',
        'agent', 'new', 'create', 'add', 'edit', 'delete', 'save', 'cancel',
        'dashboard', 'settings', 'profile', 'help', 'logout', 'login', 'sign',
        'card', 'form', 'input', 'field', 'dropdown', 'checkbox', 'radio',
        'start', 'begin', 'open', 'close', 'show', 'hide', 'toggle'
      ];
      
      const hasUIKeywords = uiKeywords.some(keyword => lowerText.includes(keyword));
      
      // Highlight if text contains quoted content or specific references
      const hasQuotes = /["']([^"']+)["']/.test(text);
      const hasSpecificReferences = /\b(the|this|that)\s+\w+/.test(lowerText);
      
      // Highlight if text contains action phrases
      const hasActionPhrases = /\b(can you|could you|please|let me|show me|find the|locate the|click on|press the|tap the)\b/i.test(text);
      
      return hasUIKeywords || hasQuotes || hasSpecificReferences || hasActionPhrases;
    }

    clear() {
      this.textBuffer = '';
      this.wordBuffer = [];
      if (this.bufferTimeout) {
        clearTimeout(this.bufferTimeout);
        this.bufferTimeout = null;
      }
    }
  }

  // Initialize smart highlighter
  const smartHighlighter = new SmartHighlighter();

  // Expose global functions
  window.voicePilotHighlight = (text) => {
    console.log('[VoicePilot] Adding text to buffer:', text);
    smartHighlighter.addText(text);
    return true;
  };
  
  window.voicePilotClearHighlights = () => {
    console.log('[VoicePilot] Clearing highlights and buffer');
    domHighlighter.clearHighlights();
    smartHighlighter.clear();
  };

  // Legacy function for backward compatibility
  window.highlightTextMatch = window.voicePilotHighlight;

  // Widget creation and management
  function createWidget() {
    // Remove existing widget if present
    const existingWidget = document.getElementById('voicepilot-widget');
    if (existingWidget) {
      existingWidget.remove();
    }

    // Create widget container
    const widget = document.createElement('div');
    widget.id = 'voicepilot-widget';
    widget.style.cssText = `
      position: fixed;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Set position
    const spacing = '24px';
    switch (position) {
      case 'bottom-left':
        widget.style.bottom = spacing;
        widget.style.left = spacing;
        break;
      case 'top-right':
        widget.style.top = spacing;
        widget.style.right = spacing;
        break;
      case 'top-left':
        widget.style.top = spacing;
        widget.style.left = spacing;
        break;
      default:
        widget.style.bottom = spacing;
        widget.style.right = spacing;
        break;
    }

    // Widget state
    let isExpanded = false;
    let isCallActive = false;
    let callDuration = 0;
    let callTimer = null;
    let websocket = null;
    let microphoneStream = null;
    let audioContext = null;
    let audioQueueTime = 0;
    let transcript = '';

    // Create widget HTML
    function updateWidget() {
      widget.innerHTML = `
        <div id="voicepilot-expanded" style="
          display: ${isExpanded ? 'block' : 'none'};
          width: 320px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          border: 1px solid #e5e7eb;
          margin-bottom: 16px;
          overflow: hidden;
        ">
          <div style="
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            padding: 16px;
            color: white;
          ">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="
                  width: 40px;
                  height: 40px;
                  background: rgba(255, 255, 255, 0.2);
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                ">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                </div>
                <div>
                  <div style="font-weight: 600; font-size: 14px;">AI Assistant</div>
                  <div style="font-size: 12px; opacity: 0.9;">
                    ${isCallActive ? `${Math.floor(callDuration / 60)}:${(callDuration % 60).toString().padStart(2, '0')} elapsed` : 'Ready to help'}
                  </div>
                </div>
              </div>
              <button onclick="window.voicepilot.close()" style="
                width: 32px;
                height: 32px;
                background: rgba(255, 255, 255, 0.2);
                border: none;
                border-radius: 50%;
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
          
          <div style="padding: 16px;">
            ${!isCallActive ? `
              <div style="text-align: center;">
                <div style="
                  width: 64px;
                  height: 64px;
                  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1));
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin: 0 auto 16px;
                ">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                </div>
                <p style="color: #6b7280; font-size: 14px; margin-bottom: 16px;">
                  Start a voice conversation with your AI assistant
                </p>
                <button onclick="window.voicepilot.startCall()" style="
                  width: 100%;
                  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                  color: white;
                  border: none;
                  padding: 12px 16px;
                  border-radius: 12px;
                  font-weight: 600;
                  cursor: pointer;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 8px;
                ">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                  Start Voice Chat
                </button>
              </div>
            ` : `
              <div>
                <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 16px;">
                  <div style="width: 8px; height: 8px; background: #ef4444; border-radius: 50%; animation: pulse 2s infinite;"></div>
                  <span style="font-size: 12px; font-weight: 600; color: #6b7280;">LIVE</span>
                </div>
                
                ${transcript ? `
                  <div style="
                    background: #f9fafb;
                    border-radius: 8px;
                    padding: 12px;
                    max-height: 128px;
                    overflow-y: auto;
                    margin-bottom: 16px;
                  ">
                    <p style="font-size: 12px; color: #6b7280; line-height: 1.5; margin: 0;">
                      ${transcript}
                    </p>
                  </div>
                ` : ''}
                
                <button onclick="window.voicepilot.endCall()" style="
                  width: 100%;
                  background: #ef4444;
                  color: white;
                  border: none;
                  padding: 8px 12px;
                  border-radius: 8px;
                  font-weight: 600;
                  cursor: pointer;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 8px;
                ">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                  End Call
                </button>
              </div>
            `}
          </div>
        </div>
        
        <button onclick="window.voicepilot.${isExpanded ? 'close' : 'open'}()" style="
          background: black;
          color: white;
          border: none;
          border-radius: 50px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          cursor: pointer;
          display: flex;
          align-items: center;
          overflow: hidden;
          transition: all 0.3s ease;
          ${isCallActive && !isExpanded ? 'animation: pulse 2s infinite;' : ''}
        ">
          <div style="
            width: 56px;
            height: 56px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            position: relative;
          ">
            ${isCallActive ? '<div style="position: absolute; inset: 0; background: rgba(239, 68, 68, 0.2); border-radius: 50%; animation: pulse 2s infinite;"></div>' : ''}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
          </div>
          
          ${!isCallActive && !isExpanded ? `
            <div style="padding: 0 16px; white-space: nowrap;">
              <span style="font-weight: 600; font-size: 14px;">VOICE CHAT</span>
            </div>
          ` : ''}
          
          ${isCallActive && !isExpanded ? `
            <div style="padding: 0 16px; white-space: nowrap;">
              <span style="font-weight: 600; font-size: 12px; color: #fca5a5;">
                ${Math.floor(callDuration / 60)}:${(callDuration % 60).toString().padStart(2, '0')}
              </span>
            </div>
          ` : ''}
        </button>
        
        <style>
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        </style>
      `;
    }

    // Audio playback functionality
    async function playAudioBuffer(pcmBlob) {
      try {
        const arrayBuffer = await pcmBlob.arrayBuffer();
        const pcm16 = new Int16Array(arrayBuffer);
        const float32 = new Float32Array(pcm16.length);
        
        // Convert PCM16 to Float32
        for (let i = 0; i < pcm16.length; i++) {
          float32[i] = pcm16[i] / 32768;
        }

        if (!audioContext) {
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        const buffer = audioContext.createBuffer(1, float32.length, 24000);
        buffer.copyToChannel(float32, 0, 0);

        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);

        // Queue audio to play smoothly
        let startAt = audioContext.currentTime;
        if (audioQueueTime > audioContext.currentTime) {
          startAt = audioQueueTime;
        }
        source.start(startAt);
        audioQueueTime = startAt + buffer.duration;

        console.log('[VoicePilot] Playing audio buffer, duration:', buffer.duration);
      } catch (error) {
        console.error('[VoicePilot] Audio playback error:', error);
      }
    }

    // Voice call functionality
    async function startCall() {
      try {
        const apiKey = window.voicepilotGoogleApiKey;
        if (!apiKey) {
          throw new Error('Google API key not configured');
        }

        const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
        websocket = new WebSocket(wsUrl);

        websocket.onopen = () => {
          console.log('[VoicePilot] WebSocket connected');
          
          const setupMsg = {
            setup: {
              model: 'models/gemini-2.0-flash-live-001',
              generationConfig: {
                responseModalities: ['AUDIO'], // AUDIO only - no TEXT
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: 'Kore'
                    }
                  }
                }
              },
              outputAudioTranscription: {}, // Enable transcription of AI speech
              inputAudioTranscription: {},  // Enable transcription of user speech
              systemInstruction: {
                parts: [{
                  text: 'You are a helpful AI assistant. When you mention specific UI elements, buttons, or parts of the interface in your responses, I will automatically highlight them for the user. Speak naturally about what you see and what actions the user might take.'
                }]
              }
            }
          };

          websocket.send(JSON.stringify(setupMsg));
        };

        websocket.onmessage = async (event) => {
          if (!(event.data instanceof Blob)) return;

          try {
            const text = await event.data.text();
            const parsed = JSON.parse(text);

            if (parsed.setupComplete) {
              console.log('[VoicePilot] Setup complete');
              isCallActive = true;
              startCallTimer();
              startMicrophone();
              updateWidget();
              
              // Send greeting
              const greeting = {
                clientContent: {
                  turns: [{
                    role: 'user',
                    parts: [{ text: 'Hello!' }]
                  }],
                  turnComplete: true
                }
              };
              websocket.send(JSON.stringify(greeting));
            }

            if (parsed.serverContent) {
              // Handle AI speech transcription (what the AI is saying)
              if (parsed.serverContent.outputTranscription?.text) {
                const aiText = parsed.serverContent.outputTranscription.text.trim();
                
                // Add to transcript with proper spacing
                if (transcript.length > 0 && !transcript.endsWith(' ') && !aiText.startsWith(' ')) {
                  transcript += ' ';
                }
                transcript += aiText;
                updateWidget();
                
                // ✅ SMART HIGHLIGHTING BASED ON AI SPEECH TRANSCRIPTION
                console.log('[VoicePilot] AI said:', aiText);
                window.voicePilotHighlight(aiText);
              }

              // Handle user speech transcription (what the user is saying)
              if (parsed.serverContent.inputTranscription?.text) {
                const userText = parsed.serverContent.inputTranscription.text.trim();
                
                // Add to transcript with proper spacing
                if (transcript.length > 0 && !transcript.endsWith(' ') && !userText.startsWith(' ')) {
                  transcript += ' ';
                }
                transcript += userText;
                updateWidget();
              }

              // Handle audio data from AI responses
              const modelTurn = parsed.serverContent.modelTurn;
              if (modelTurn?.parts) {
                for (const part of modelTurn.parts) {
                  if (part.inlineData?.data) {
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
                      await playAudioBuffer(pcmBlob);
                    } catch (err) {
                      console.error('[VoicePilot] Error decoding audio:', err);
                    }
                  }
                }
              }
            }
          } catch (e) {
            // Handle binary audio data directly
            console.log('[VoicePilot] Received binary audio data');
            await playAudioBuffer(event.data);
          }
        };

        websocket.onerror = (error) => {
          console.error('[VoicePilot] WebSocket error:', error);
          endCall();
        };

        websocket.onclose = () => {
          console.log('[VoicePilot] WebSocket closed');
          endCall();
        };

      } catch (error) {
        console.error('[VoicePilot] Failed to start call:', error);
        alert('Failed to start voice chat: ' + error.message);
      }
    }

    async function startMicrophone() {
      try {
        microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        if (!audioContext) {
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const source = audioContext.createMediaStreamSource(microphoneStream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        
        source.connect(processor);
        processor.connect(audioContext.destination);
        
        processor.onaudioprocess = (event) => {
          if (!websocket || websocket.readyState !== WebSocket.OPEN) return;
          
          const inputData = event.inputBuffer.getChannelData(0);
          const inRate = audioContext.sampleRate;
          const outRate = 16000;
          const ratio = inRate / outRate;
          const outLength = Math.floor(inputData.length / ratio);

          const pcm16 = new Int16Array(outLength);
          for (let i = 0; i < outLength; i++) {
            const idx = Math.floor(i * ratio);
            let sample = inputData[idx];
            sample = Math.max(-1, Math.min(1, sample));
            pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
          }
          
          const u8 = new Uint8Array(pcm16.buffer);
          let binary = '';
          for (let i = 0; i < u8.byteLength; i++) {
            binary += String.fromCharCode(u8[i]);
          }
          const base64Audio = btoa(binary);
          
          websocket.send(JSON.stringify({
            realtime_input: {
              audio: {
                data: base64Audio,
                mime_type: 'audio/pcm;rate=16000'
              }
            }
          }));
        };
      } catch (error) {
        console.error('[VoicePilot] Microphone error:', error);
      }
    }

    function startCallTimer() {
      callDuration = 0;
      callTimer = setInterval(() => {
        callDuration++;
        updateWidget();
      }, 1000);
    }

    function endCall() {
      isCallActive = false;
      transcript = '';
      audioQueueTime = 0;
      
      if (callTimer) {
        clearInterval(callTimer);
        callTimer = null;
      }
      
      if (websocket) {
        websocket.close();
        websocket = null;
      }
      
      if (microphoneStream) {
        microphoneStream.getTracks().forEach(track => track.stop());
        microphoneStream = null;
      }
      
      if (audioContext) {
        audioContext.close();
        audioContext = null;
      }
      
      // Clear highlights and smart highlighter buffer
      window.voicePilotClearHighlights();
      updateWidget();
    }

    // Initialize widget
    updateWidget();
    document.body.appendChild(widget);

    // Return API
    return {
      open: () => {
        isExpanded = true;
        updateWidget();
      },
      close: () => {
        isExpanded = false;
        updateWidget();
      },
      startCall: startCall,
      endCall: endCall,
      setPulse: (enabled) => {
        // Pulse functionality if needed
      }
    };
  }

  // Initialize widget when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.voicepilot = createWidget();
    });
  } else {
    window.voicepilot = createWidget();
  }

})();