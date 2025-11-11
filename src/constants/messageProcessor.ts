/**
 * Regex patterns to convert Skype-specific markup to standard HTML.
 * Applied in order: emoji tags, links, formatting, then removal of unwanted elements.
 */
export const CONTENT_PATTERNS = [
  [/<ss type="[^"]+">([^<]*)<\/ss>/g, "$1"], // Extract emoji text
  [
    /<a href="([^"]+)">([^<]*)<\/a>/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$2</a>',
  ], // Convert links with security attributes
  [/<b>([^<]*)<\/b>/g, "<strong>$1</strong>"], // Bold formatting
  [/<at id="[^"]+">([^<]*)<\/at>/g, "<strong>@$1</strong>"], // Mentions
  [/<(?:location|context|c_i)[^>]*>(?:<\/\w+>)?/g, ""], // Remove location/context tags
  [/<e_m[^>]*\/>/g, ""], // Remove empty emoji tags
  [/<bing-response>(.*?)<\/bing-response>/gs, "$1"], // Extract Bing response content
  [/<attribution[^>]*>.*?<\/attribution>/g, ""], // Remove attribution tags
] as const;

export const PURIFY_CONFIG = {
  ALLOWED_TAGS: ["strong", "a", "br", "sup", "em"],
  ALLOWED_ATTR: ["href", "target", "rel"],
};

export const THREAD_ACTIVITY_PATTERNS = {
  AddMember: /<target>([^<]+)<\/target>/g,
  Value: /<value>([^<]+)<\/value>/,
} as const;

export const CALL_EVENT_PATTERNS = {
  Type: /<partlist[^>]*type="([^"]+)"/i,
  Part: /<part[^>]*identity="([^"]+)"[^>]*>([\s\S]*?)<\/part>/gi,
  Name: /<name>([^<]+)<\/name>/i,
  Duration: /<duration>([^<]+)<\/duration>/i,
} as const;

export const STRIP_HTML_PATTERN = /<[^>]+>/g;
export const STRIP_SKYPE_PATTERN = /<ss[^>]*>([^<]*)<\/ss>/g;
export const PREVIEW_MAX_LENGTH = 100;

