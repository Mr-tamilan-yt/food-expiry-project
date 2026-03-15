// Enhanced date extraction utilities with better accuracy
export const dateExtractor = {
  // Enhanced expiry date patterns
  patterns: [
    // Standard date formats with different separators
    { pattern: /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b/, type: 'numeric' },
    { pattern: /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})\b/, type: 'numeric' },
    
    // Month name formats
    { pattern: /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})\b/i, type: 'text' },
    { pattern: /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})\b/i, type: 'text' },
    
    // Enhanced expiry-specific patterns
    { pattern: /expire?y?[\s:]*([^.\n]{1,50})/i, type: 'expiry' },
    { pattern: /use\s+by[\s:]*([^.\n]{1,50})/i, type: 'expiry' },
    { pattern: /best\s+before[\s:]*([^.\n]{1,50})/i, type: 'expiry' },
    { pattern: /use\s+before[\s:]*([^.\n]{1,50})/i, type: 'expiry' },
    { pattern: /sell\s+by[\s:]*([^.\n]{1,50})/i, type: 'expiry' },
    
    // European and other formats
    { pattern: /\b(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})\b/, type: 'european' },
  ],

  monthMap: {
    'jan': 0, 'january': 0,
    'feb': 1, 'february': 1,
    'mar': 2, 'march': 2,
    'apr': 3, 'april': 3,
    'may': 4,
    'jun': 5, 'june': 5,
    'jul': 6, 'july': 6,
    'aug': 7, 'august': 7,
    'sep': 8, 'september': 8,
    'oct': 9, 'october': 9,
    'nov': 10, 'november': 10,
    'dec': 11, 'december': 11
  },

  extractDate(text) {
    console.log('Processing text for date:', text);
    
    let bestMatch = null;
    
    for (const { pattern, type } of this.patterns) {
      const matches = text.match(pattern);
      if (matches) {
        console.log(`Pattern matched (${type}):`, matches);
        
        let dateStr = matches[1] ? matches[0] : matches[0];
        
        if (type === 'expiry') {
          const dateMatch = dateStr.match(/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/);
          if (dateMatch) {
            dateStr = dateMatch[0];
          }
        }
        
        const parsedDate = this.parseDateString(dateStr, type);
        if (parsedDate && this.isValidDate(parsedDate)) {
          if (!bestMatch || this.isBetterMatch(parsedDate, bestMatch)) {
            bestMatch = parsedDate;
          }
        }
      }
    }

    return bestMatch ? this.formatDateForInput(bestMatch) : null;
  },

  parseDateString(dateStr, type) {
    const cleanStr = dateStr.replace(/[^\d\w\/\-\.\s]/g, ' ').trim();
    
    if (type === 'text') {
      return this.parseTextDate(cleanStr);
    } else if (type === 'european') {
      return this.parseEuropeanDate(cleanStr);
    } else {
      return this.parseNumericDate(cleanStr);
    }
  },

  parseNumericDate(dateStr) {
    const separators = /[\/\-\.]/;
    const parts = dateStr.split(separators).filter(part => part.length > 0);
    
    if (parts.length === 3) {
      let day, month, year;
      
      if (parts[0].length === 4) {
        [year, month, day] = parts;
      } else if (parseInt(parts[0]) > 12 && parseInt(parts[0]) <= 31) {
        [day, month, year] = parts;
      } else {
        [month, day, year] = parts;
      }
      
      if (year.length === 2) {
        year = parseInt(year) < 50 ? '20' + year : '19' + year;
      }
      
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    return null;
  },

  parseEuropeanDate(dateStr) {
    const separators = /[\/\-\.]/;
    const parts = dateStr.split(separators).filter(part => part.length > 0);
    
    if (parts.length === 3 && parts[0].length === 4) {
      const [year, month, day] = parts;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    return null;
  },

  parseTextDate(dateStr) {
    const parts = dateStr.split(/\s+/);
    if (parts.length >= 3) {
      const monthStr = parts[0].toLowerCase();
      const day = parseInt(parts[1]);
      let year = parseInt(parts[2]);
      
      if (this.monthMap[monthStr] !== undefined && !isNaN(day) && !isNaN(year)) {
        if (year < 100) {
          year = year < 50 ? 2000 + year : 1900 + year;
        }
        return new Date(year, this.monthMap[monthStr], day);
      }
    }
    return null;
  },

  isValidDate(date) {
    if (!(date instanceof Date) || isNaN(date)) return false;
    
    const now = new Date();
    const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
    const fiveYearsFuture = new Date(now.getFullYear() + 5, now.getMonth(), now.getDate());
    
    return date >= twoYearsAgo && date <= fiveYearsFuture;
  },

  isBetterMatch(newDate, currentBest) {
    const now = new Date();
    const newIsFuture = newDate > now;
    const currentIsFuture = currentBest > now;
    
    if (newIsFuture && !currentIsFuture) return true;
    if (!newIsFuture && currentIsFuture) return false;
    
    const newDiff = Math.abs(newDate - now);
    const currentDiff = Math.abs(currentBest - now);
    
    return newDiff < currentDiff;
  },

  formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};