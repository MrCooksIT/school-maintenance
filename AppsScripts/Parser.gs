// parser.gs - All parsing functions
function parseLocation(text) {
  text = text || "";
  
  var roomPattern = /room\s*(\d+)/i;
  var buildingPattern = /building\s*([a-z])/i;
  
  var location = "";
  
  var roomMatch = text.match(roomPattern);
  if (roomMatch) {
    location += "Room " + roomMatch[1];
  }
  
  var buildingMatch = text.match(buildingPattern);
  if (buildingMatch) {
    location = "Building " + buildingMatch[1].toUpperCase() +
               (location ? " - " + location : "");
  }
  
  return location || "Location not specified";
}
function parsePriority(text) {
  text = text || "";
  
  var highPriority = ["urgent", "emergency", "asap", "immediately"];
  var mediumPriority = ["soon", "moderate", "this week"];
  var lowPriority = ["when possible", "low priority", "sometime"];
  
  text = text.toLowerCase();
  
  if (highPriority.some(keyword => text.includes(keyword))) {
    return "high";
  }
  
  if (mediumPriority.some(keyword => text.includes(keyword))) {
    return "medium";
  }
  
  if (lowPriority.some(keyword => text.includes(keyword))) {
    return "low";
  }
  
  return "medium";
}
function parseDueDate(text) {
  text = text || "";
  text = text.toLowerCase();
  
  const today = new Date();
  
  // Specific date patterns
  const datePatterns = {
    tomorrow: /\b(tomorrow)\b/i,
    nextWeek: /\b(next week)\b/i,
    nextMonth: /\b(next month)\b/i,
    specificDate: /\b(\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*)\b/i,
    numericDate: /\b(\d{1,2})[/-](\d{1,2})(?:[/-]\d{2,4})?\b/
  };

  // Check for "tomorrow"
  if (text.match(datePatterns.tomorrow)) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  // Check for "next week"
  if (text.match(datePatterns.nextWeek)) {
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toISOString().split('T')[0];
  }

  // Check for "next month"
  if (text.match(datePatterns.nextMonth)) {
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth.toISOString().split('T')[0];
  }

  // If urgent/asap/emergency, set to today
  if (text.match(/\b(urgent|asap|emergency)\b/i)) {
    return today.toISOString().split('T')[0];
  }

  // Default to 2 weeks if no specific date found
  const twoWeeks = new Date(today);
  twoWeeks.setDate(twoWeeks.getDate() + 14);
  return twoWeeks.toISOString().split('T')[0];
}
function cleanDescription(text) {
  const signatureMarkers = [
    'Peace up, a-town down',
    'Head of EdTech',
    'St Joseph\'s Marist College',
    'Book a Meet with me',
    'Click here',
    'calendly.com',
    'A:',
    'M:',
    'P:',
    '+27',
    'Belmont Rd',
    'Rondebosch',
    'Cape Town',
    'Google Certified',
    '[image:',
    '<http',
    'Best regards',
    'Kind regards',
    'Regards',
    'Sent from my iPhone',
    'Get Outlook for iOS'
  ];

  let lines = text.split('\n');
  let cleanLines = [];
  let hitSignature = false;

  for (let line of lines) {
    // Check if this line contains any signature markers
    if (signatureMarkers.some(marker => line.includes(marker))) {
      hitSignature = true;
      continue;
    }

    // Keep lines before signature and non-empty lines
    if (!hitSignature && line.trim()) {
      cleanLines.push(line);
    }
  }

  // Join the lines and clean up any remaining HTML or special characters
  let cleanText = cleanLines.join('\n').trim()
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .replace(/\[.*?\]/g, '') // Remove square bracket content
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  return cleanText;
}