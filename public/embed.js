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
          outline: 4px solid #000000 !important;
          outline-offset: 4px !important;
          box-shadow:
            0 0 0 2px #ffffff,
            0 0 0 8px #000000,
            0 0 20px rgba(0, 0, 0, 0.8),
            0 0 40px rgba(255, 255, 255, 0.6) !important;
          border-radius: 12px !important;
          background-color: rgba(255, 255, 255, 0.95) !important;
          transition: all 0.25s ease-in-out !important;
          z-index: 9999 !important;
          animation: pulse-ring 1.6s infinite ease-in-out;
        }
        
        .${this.highlightClass}::before {
          content: '';
          position: absolute;
          top: -8px;
          left: -8px;
          right: -8px;
          bottom: -8px;
          border: 3px solid #ff0000;
          border-radius: 16px;
          background: linear-gradient(45deg, 
            rgba(255, 0, 0, 0.1), 
            rgba(255, 255, 0, 0.1),
            rgba(255, 0, 0, 0.1));
          z-index: -1;
          animation: border-flash 0.8s infinite alternate;
          pointer-events: none;
        }
        
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.03); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes border-flash {
          0% { 
            border-color: #ff0000;
            box-shadow: 0 0 15px rgba(255, 0, 0, 0.8);
          }
          100% { 
            border-color: #ffff00;
            box-shadow: 0 0 15px rgba(255, 255, 0, 0.8);
          }
        }
        
        .${this.highlightClass}-badge {
          position: absolute;
          bottom: -25px;
          right: -10px;
          background: linear-gradient(135deg, #000000, #333333);
          color: #ffffff;
          font-size: 12px;
          font-weight: 700;
          padding: 6px 10px;
          border-radius: 8px;
          border: 2px solid #ffffff;
          box-shadow: 
            0 2px 8px rgba(0,0,0,0.5),
            0 0 0 1px #000000;
          z-index: 10000;
          animation: badge-pop 0.4s ease-out;
          pointer-events: none;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
        }
        
        @keyframes badge-pop {
          0% { opacity: 0; transform: translateY(8px) scale(0.7); }
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
        badge.textContent = 'Product Coach';
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

  // Expose global highlight functions
  window.voicePilotHighlight = text => { smartHighlighter.addText(text); return true; };
  window.voicePilotClearHighlights = () => {
    domHighlighter.clearHighlights();
    smartHighlighter.clear();
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

})();