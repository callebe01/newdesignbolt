export interface HighlightMatch {
  element: HTMLElement;
  text: string;
  confidence: number;
}

export class DOMHighlighter {
  private highlightedElements: Set<HTMLElement> = new Set();
  private highlightClass = 'voice-agent-highlight';
  private highlightStyle: HTMLStyleElement | null = null;

  constructor() {
    this.injectStyles();
  }

  private injectStyles() {
    // Remove existing style if present
    if (this.highlightStyle) {
      this.highlightStyle.remove();
    }

    // Create and inject highlight styles
    this.highlightStyle = document.createElement('style');
    this.highlightStyle.id = 'voice-agent-highlight-styles';
    this.highlightStyle.textContent = `
      .${this.highlightClass} {
        position: relative !important;
        outline: 3px solid #3b82f6 !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3) !important;
        border-radius: 6px !important;
        background-color: rgba(59, 130, 246, 0.05) !important;
        transition: all 0.3s ease !important;
        z-index: 9999 !important;
      }
      
      .${this.highlightClass}::before {
        content: '';
        position: absolute;
        top: -8px;
        left: -8px;
        right: -8px;
        bottom: -8px;
        background: linear-gradient(45deg, rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.2));
        border-radius: 10px;
        z-index: -1;
        animation: voice-agent-pulse 2s infinite;
      }
      
      @keyframes voice-agent-pulse {
        0%, 100% { opacity: 0.3; transform: scale(1); }
        50% { opacity: 0.6; transform: scale(1.02); }
      }
      
      .${this.highlightClass}-text {
        background: linear-gradient(120deg, #3b82f6, #8b5cf6) !important;
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        background-clip: text !important;
        font-weight: 600 !important;
      }
    `;
    document.head.appendChild(this.highlightStyle);
  }

  /**
   * Search for elements in the DOM that match the given text
   */
  public searchElements(searchText: string): HighlightMatch[] {
    const matches: HighlightMatch[] = [];
    const searchTerms = this.extractSearchTerms(searchText);
    
    if (searchTerms.length === 0) return matches;

    // Get all interactive and text elements
    const selectors = [
      'button',
      'a',
      '[role="button"]',
      '[role="link"]',
      'input[type="button"]',
      'input[type="submit"]',
      '[data-testid]',
      '[aria-label]',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      '[class*="button"]',
      '[class*="btn"]',
      '[class*="link"]',
      '[class*="nav"]',
      '[class*="menu"]',
      'label',
      '.card-title',
      '.title',
      '[data-agent-id]'
    ];

    const elements = document.querySelectorAll(selectors.join(','));
    
    elements.forEach((element) => {
      const htmlElement = element as HTMLElement;
      
      // Skip if element is not visible
      if (!this.isElementVisible(htmlElement)) return;
      
      const confidence = this.calculateMatchConfidence(htmlElement, searchTerms);
      
      if (confidence > 0.3) { // Threshold for matching
        matches.push({
          element: htmlElement,
          text: this.getElementText(htmlElement),
          confidence
        });
      }
    });

    // Sort by confidence (highest first)
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Highlight the best matching element(s)
   */
  public highlightElement(searchText: string): boolean {
    const matches = this.searchElements(searchText);
    
    if (matches.length === 0) return false;

    // Clear previous highlights
    this.clearHighlights();

    // Highlight the best match (and potentially close matches)
    const bestMatch = matches[0];
    const threshold = Math.max(0.7, bestMatch.confidence - 0.2);
    
    const elementsToHighlight = matches
      .filter(match => match.confidence >= threshold)
      .slice(0, 3) // Limit to top 3 matches
      .map(match => match.element);

    elementsToHighlight.forEach(element => {
      this.addHighlight(element);
    });

    // Scroll the best match into view
    this.scrollToElement(bestMatch.element);

    // Auto-remove highlights after 5 seconds
    setTimeout(() => {
      this.clearHighlights();
    }, 5000);

    return true;
  }

  private extractSearchTerms(text: string): string[] {
    // Remove common words and extract meaningful terms
    const commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'click', 'press', 'tap', 'select', 'choose', 'find', 'locate', 'go', 'navigate',
      'button', 'link', 'menu', 'option', 'item', 'element'
    ]);

    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !commonWords.has(word))
      .slice(0, 5); // Limit to 5 most relevant terms
  }

  private calculateMatchConfidence(element: HTMLElement, searchTerms: string[]): number {
    const texts = [
      element.textContent?.toLowerCase() || '',
      element.getAttribute('aria-label')?.toLowerCase() || '',
      element.getAttribute('title')?.toLowerCase() || '',
      element.getAttribute('data-testid')?.toLowerCase() || '',
      element.getAttribute('data-agent-id')?.toLowerCase() || '',
      element.className.toLowerCase(),
      element.id.toLowerCase()
    ].filter(Boolean);

    let totalScore = 0;
    let maxPossibleScore = searchTerms.length;

    searchTerms.forEach(term => {
      let termScore = 0;
      
      texts.forEach((text, index) => {
        if (text.includes(term)) {
          // Weight different sources differently
          const weights = [1.0, 0.9, 0.8, 0.7, 0.9, 0.5, 0.6]; // textContent gets highest weight
          termScore = Math.max(termScore, weights[index] || 0.3);
        }
      });

      // Bonus for exact matches
      if (texts.some(text => text === term)) {
        termScore = Math.min(1.0, termScore + 0.3);
      }

      // Bonus for word boundaries
      if (texts.some(text => new RegExp(`\\b${term}\\b`).test(text))) {
        termScore = Math.min(1.0, termScore + 0.2);
      }

      totalScore += termScore;
    });

    return totalScore / maxPossibleScore;
  }

  private getElementText(element: HTMLElement): string {
    return (
      element.getAttribute('aria-label') ||
      element.getAttribute('title') ||
      element.textContent?.trim() ||
      element.getAttribute('data-testid') ||
      element.className ||
      'Element'
    ).substring(0, 50);
  }

  private isElementVisible(element: HTMLElement): boolean {
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

  private addHighlight(element: HTMLElement): void {
    element.classList.add(this.highlightClass);
    this.highlightedElements.add(element);

    // Also highlight text content if it's primarily text
    if (element.children.length === 0 && element.textContent?.trim()) {
      element.classList.add(`${this.highlightClass}-text`);
    }
  }

  private scrollToElement(element: HTMLElement): void {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center'
    });
  }

  public clearHighlights(): void {
    this.highlightedElements.forEach(element => {
      element.classList.remove(this.highlightClass, `${this.highlightClass}-text`);
    });
    this.highlightedElements.clear();
  }

  public destroy(): void {
    this.clearHighlights();
    if (this.highlightStyle) {
      this.highlightStyle.remove();
      this.highlightStyle = null;
    }
  }
}

// Global instance for use across the application
export const domHighlighter = new DOMHighlighter();

// Global function for external access (for embedded widgets)
declare global {
  interface Window {
    voicePilotHighlight?: (text: string) => boolean;
    voicePilotClearHighlights?: () => void;
  }
}

// Expose global functions
window.voicePilotHighlight = (text: string) => domHighlighter.highlightElement(text);
window.voicePilotClearHighlights = () => domHighlighter.clearHighlights();