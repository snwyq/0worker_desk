import { describe, expect, it } from 'vitest';
import { normalizeWeiboPostText } from '../../src/main/publisher/WeiboContent.js';

describe('Weibo content normalization', () => {
  it('converts rich HTML into plain Weibo text with paragraphs', () => {
    expect(normalizeWeiboPostText(
      '<p><span style="color:red">第一段&nbsp;内容</span></p><p>第二段<br>换行</p>',
    )).toBe('第一段 内容\n第二段\n换行');
  });

  it('removes styling tags and keeps useful links as text plus URL', () => {
    expect(normalizeWeiboPostText(
      '<span style="font-size:15px">Lisa跳舞</span><a target="_blank" href="https://video.weibo.com/show?fid=123" style="color:red"><img class="icon-link">微博视频</a>',
    )).toBe('Lisa跳舞微博视频 https://video.weibo.com/show?fid=123');
  });

  it('decodes escaped HTML instead of publishing entity noise', () => {
    expect(normalizeWeiboPostText('&lt;span&gt;不是标签&lt;/span&gt; &quot;引用&quot;')).toBe('<span>不是标签</span> "引用"');
  });
});
