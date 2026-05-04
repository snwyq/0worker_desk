export interface AiGenerateOptions {
  prompt: string;
  provider?: 'dashscope' | 'apiyi';
  model?: string;
  maxTokens?: number;
}

export interface AiImageOptions {
  prompt: string;
  size?: string;
}

export interface AiResponse {
  content: string;
  usage?: any;
}

export class AiService {
  private db: any = null;

  init(db: any) {
    this.db = db;
  }

  private get dashscopeKey() {
    return this.db?.settings.get('ai.dashscopeKey') || process.env.DASH_SCOPE_API_KEY || '';
  }

  private get apiyiKey() {
    const k1 = this.db?.settings.get('ai.apiyiKey');
    const k2 = this.db?.settings.get('ai.apiYiKey');
    const env = process.env.API_YI_KEY;
    
    // [FINAL FALLBACK] 如果数据库和环境都拿不到，直接使用备用 Key
    const fallbackKey = 'sk-w4r7SeqXczkv2ZBlFaC0Ab837fEa4a3c8266C33aF37dD1Ce';
    
    const result = k1 || k2 || env || fallbackKey;
    console.log(`[AI-DEBUG-DEEP] Final Result Length: ${result.length}`);
    
    return result;
  }


  async generateText(options: AiGenerateOptions): Promise<AiResponse> {
    const provider = options.provider || 'dashscope';
    
    if (provider === 'dashscope') {
      return this.generateDashScope(options);
    } else {
      return this.generateApiYi(options);
    }
  }

  private async generateDashScope(options: AiGenerateOptions): Promise<AiResponse> {
    const key = this.dashscopeKey;
    
    // 如果找不到，打印出数据库里到底存了哪些键，帮用户找回
    if (!key) {
      const allKeys = this.db?.settings.list().map((s: any) => s.key) || [];
      console.log('[AI-DEBUG] Database contains these keys:', allKeys);
    }
    
    console.log(`[AI-DEBUG] Using DashScope Key: ${key ? (key.substring(0, 4) + '****') : 'MISSING'}, Length: ${key.length}`);
    
    const url = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: options.model || 'qwen-turbo',
        messages: [{ role: 'user', content: options.prompt }],
        max_tokens: options.maxTokens || 1500
      })
    });

    if (!response.ok) {
      throw new Error(`DashScope API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      usage: data.usage
    };
  }

  private async generateApiYi(options: AiGenerateOptions): Promise<AiResponse> {
    // APIYi Gemini compatibility URL
    const model = options.model || 'gemini-1.5-pro';
    const url = `https://api.apiyi.com/v1beta/models/${model}:generateContent?key=${this.apiyiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: options.prompt }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`APIYi Gemini Error: ${response.statusText}`);
    }

    const data = await response.json();
    // Gemini response structure: candidates[0].content.parts[0].text
    return {
      content: data.candidates[0].content.parts[0].text,
      usage: data.usageMetadata
    };
  }

  async generateImage(options: AiImageOptions): Promise<string> {
    const key = this.apiyiKey;
    console.log(`[AI-DEBUG] Using APIYi Image Key: ${key ? (key.substring(0, 4) + '****') : 'MISSING'}, Length: ${key.length}`);

    const url = `https://api.apiyi.com/v1/images/generations?key=${key}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiyiKey}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: options.prompt,
        n: 1,
        size: options.size || '1024x1024'
      })
    });

    if (!response.ok) {
      throw new Error(`APIYi Image Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].url;
  }

  async fetchHotTopics(force = false): Promise<{ items: any[], lastFetchTime: string | null }> {
    console.log(`[AI-DEBUG] listHotTopics IPC triggered (force=${force})`);
    
    const dbLastFetchTime = this.db?.hotTopicsHistory.getLastFetchTime();
    const now = new Date().getTime();
    const lastTime = dbLastFetchTime ? new Date(dbLastFetchTime).getTime() : 0;
    const isExpired = (now - lastTime) > 6 * 60 * 60 * 1000;

    // 如果非强制刷新，且数据未过期，则直接返回本地缓存
    if (!force && !isExpired && dbLastFetchTime) {
      console.log('[AI-DEBUG] Data is still fresh, returning from cache.');
      return {
        items: this.db.hotTopicsHistory.getLatest() || [],
        lastFetchTime: dbLastFetchTime
      };
    }

    console.log('[AI-DEBUG] Fetching new data from Tophub...');
    
    // 真实抓取
    const TOPHUB_API_KEY = this.db?.settings.get('ai.tophubKey') || '06d2a2c31c219c88ea3ee3fe1b7bb33c';
    const TOPHUB_BASE_URL = 'https://api.tophubdata.com/nodes';
    
    const nodes = [
      { hashid: '3QeLwJEd7k', source_name: '微博' },
      { hashid: 'b0vmrlLdB1', source_name: '头条' },
      { hashid: '1VdJlp0oLQ', source_name: 'ZAKER' },
      { hashid: 'WmoOzOle4E', source_name: '腾讯' },
    ];

    try {
      const dbKey = this.db?.settings.get('ai.tophubKey');
      const finalKey = (dbKey && dbKey.trim()) ? dbKey : TOPHUB_API_KEY;
      
      const allResults = await Promise.all(nodes.map(async (node) => {
        try {
          const response = await fetch(`${TOPHUB_BASE_URL}/${node.hashid}`, {
            method: 'GET',
            headers: { 'Authorization': finalKey }
          });
          if (!response.ok) return [];
          const res = await response.json();
          if (res.status === 200 && res.data?.items) {
            return res.data.items.slice(0, 40).map((item: any) => ({
              ...item,
              platform: node.source_name,
            }));
          }
          return [];
        } catch (e) {
          return [];
        }
      }));

      const finalItems = allResults.flat().map((item, idx) => ({ ...item, rank: idx + 1 }));

      if (finalItems.length > 0) {
        this.db.hotTopicsHistory.saveMany(finalItems);
      }

      const finalTime = this.db.hotTopicsHistory.getLastFetchTime() || new Date().toISOString();
      return {
        items: finalItems,
        lastFetchTime: finalTime
      };

    } catch (error) {
      console.error('[AI-DEBUG] Fatal error in fetchHotTopics:', error);
      return {
        items: this.db.hotTopicsHistory.getLatest() || [],
        lastFetchTime: dbLastFetchTime || new Date().toISOString()
      };
    }
  }
}

export const aiService = new AiService();
