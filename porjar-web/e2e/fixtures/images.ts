/**
 * Reusable test image buffers for upload tests.
 *
 * All buffers are valid (or intentionally invalid) binary data suitable for
 * exercising the PORJAR upload endpoint and avatar UI without hitting external
 * storage services during CI.
 */

// Minimal 1×1 white PNG (67 bytes) — passes magic-bytes check for image/png
export const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
)

// Minimal 1×1 JPEG (631 bytes) — passes magic-bytes check for image/jpeg
export const TINY_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVIP/2Q==',
  'base64'
)

// Invalid "image" — plain text that will fail a magic-bytes / MIME check
export const FAKE_IMAGE = Buffer.from('This is not a real image file')

// Oversized buffer (6 MB) — should trigger the server-side 5 MB size limit
export const OVERSIZED_IMAGE = Buffer.alloc(6 * 1024 * 1024, 0xff)
