import { describe, it, expect } from 'vitest';
import { convertRSSItemsToBlogPosts, RSSFeedItem } from '../server/lib/rss';

describe('convertRSSItemsToBlogPosts', () => {
  const feedUrl = 'https://example.com/rss';

  it('should correctly convert a standard RSS item to a BlogPost', () => {
    const items: RSSFeedItem[] = [
      {
        title: 'Test Post',
        link: 'https://example.com/post/1',
        pubDate: 'Mon, 01 Jan 2024 00:00:00 GMT',
        creator: 'Test Author',
        content: 'This is the full content of the post.',
        contentSnippet: 'This is a snippet.',
        guid: 'guid-1',
        categories: ['tech', 'testing'],
        isoDate: '2024-01-01T00:00:00.000Z'
      }
    ];

    const result = convertRSSItemsToBlogPosts(feedUrl, items);

    expect(result).toHaveLength(1);
    const post = result[0];

    expect(post.title).toBe('Test Post');
    expect(post.url).toBe('https://example.com/post/1');
    expect(post.author).toBe('Test Author');
    expect(post.description).toBe('This is a snippet.');
    expect(post.tags).toEqual(['tech', 'testing']);
    expect(post.source).toBe('blog_rss');
    expect(post.feedUrl).toBe(feedUrl);
    // ID should be generated from guid
    expect(post.id).toBeDefined();
    // publishedAt should use isoDate if available
    expect(post.publishedAt).toBe('2024-01-01T00:00:00.000Z');
  });

  it('should return an empty array when input items list is empty', () => {
    const items: RSSFeedItem[] = [];
    const result = convertRSSItemsToBlogPosts(feedUrl, items);
    expect(result).toEqual([]);
  });

  it('should handle missing optional fields gracefully', () => {
    const items: RSSFeedItem[] = [
      {
        title: 'Minimal Post',
        link: 'https://example.com/post/minimal',
        // Missing pubDate, creator, content, contentSnippet, guid, categories, isoDate
      }
    ];

    const result = convertRSSItemsToBlogPosts(feedUrl, items);
    const post = result[0];

    expect(post.title).toBe('Minimal Post');
    expect(post.url).toBe('https://example.com/post/minimal');
    expect(post.author).toBeNull();
    expect(post.description).toBeNull();
    expect(post.tags).toEqual([]);
    expect(post.publishedAt).toBeDefined(); // Should fallback to new Date().toISOString()
  });

  it('should override author when provided', () => {
    const items: RSSFeedItem[] = [
      {
        title: 'Post with Author',
        link: 'https://example.com/post/author',
        creator: 'Original Author'
      }
    ];

    const authorOverride = 'Overridden Author';
    const result = convertRSSItemsToBlogPosts(feedUrl, items, authorOverride);

    expect(result[0].author).toBe(authorOverride);
  });

  it('should use content as description if contentSnippet is missing', () => {
    const longContent = 'A'.repeat(300);
    const items: RSSFeedItem[] = [
      {
        title: 'Content Post',
        link: 'https://example.com/post/content',
        content: longContent
      }
    ];

    const result = convertRSSItemsToBlogPosts(feedUrl, items);

    // It should substring to 200 chars
    expect(result[0].description).toBe(longContent.substring(0, 200));
  });

  it('should generate consistent IDs', () => {
    const items: RSSFeedItem[] = [
        {
          title: 'Post 1',
          link: 'https://example.com/post/1',
          guid: 'guid-1'
        }
      ];

      const result1 = convertRSSItemsToBlogPosts(feedUrl, items);
      const result2 = convertRSSItemsToBlogPosts(feedUrl, items);

      expect(result1[0].id).toBe(result2[0].id);
  });

  it('should generate different IDs for different items', () => {
      const items: RSSFeedItem[] = [
        {
          title: 'Post 1',
          link: 'https://example.com/post/1',
          guid: 'guid-1'
        },
        {
            title: 'Post 2',
            link: 'https://example.com/post/2',
            guid: 'guid-2'
        }
      ];

      const result = convertRSSItemsToBlogPosts(feedUrl, items);
      expect(result[0].id).not.toBe(result[1].id);
  });

  it('should fallback to link or index if guid is missing for ID generation', () => {
      const items: RSSFeedItem[] = [
          {
              title: 'Post No GUID',
              link: 'https://example.com/post/noguid'
          }
      ];

      const result = convertRSSItemsToBlogPosts(feedUrl, items);
      expect(result[0].id).toBeDefined();

      // Verify that it's using the link
      const uniqueId = 'https://example.com/post/noguid';
      const expectedId = Buffer.from(uniqueId).toString('base64').substring(0, 32);
      expect(result[0].id).toBe(expectedId);
  });

  it('should use index for ID if guid and link are missing (although link is required in RSSFeedItem)', () => {
      // While link is required in interface, let's see what happens if we force it to be empty string as per fetchRSSFeed fallback
      const items: RSSFeedItem[] = [
          {
              title: 'Post No GUID No Link',
              link: ''
          }
      ];

      const result = convertRSSItemsToBlogPosts(feedUrl, items);

      const uniqueId = `${feedUrl}-0`;
      const expectedId = Buffer.from(uniqueId).toString('base64').substring(0, 32);
      expect(result[0].id).toBe(expectedId);
  });
});
