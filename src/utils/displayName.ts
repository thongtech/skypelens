/**
 * Removes the numeric prefix from Skype display names.
 * Skype IDs often have a format like "8:username" or "8:live:username".
 * This function removes the leading number and colon to show a cleaner name.
 */
export function cleanDisplayName(
  displayName: string | null | undefined,
): string | null {
  if (!displayName) return null;

  const match = displayName.match(/^(\d+):(.+)$/);
  if (match) {
    return match[2];
  }

  return displayName;
}
