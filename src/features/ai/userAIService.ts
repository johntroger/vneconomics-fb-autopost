import type { AIProvider, UserAIConfig } from '../../core/types/index.ts';
import { getLanguage } from '../../core/i18n/i18nService.ts';

const KEY_PROVIDER = 'vne_ai_provider';
const KEY_MODEL = 'vne_ai_model';
const KEY_API = 'vne_ai_key';
const KEY_STORAGE_MODE = 'vne_ai_storage_mode';

export const DEFAULT_MODELS: Record<AIProvider, string> = {
  gemini: 'gemini-2.5-flash',
  openai: 'gpt-4o-mini',
  openrouter: 'google/gemini-2.5-flash',
};

export const AI_UPDATED_EVENT = 'vne:ai-config-updated';

function getStorage(mode: 'local' | 'session'): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return mode === 'session' ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

export function getUserAIConfig(): UserAIConfig {
  if (typeof window === 'undefined') {
    return { provider: 'gemini', model: DEFAULT_MODELS.gemini, apiKey: '', storageMode: 'local' };
  }
  try {
    const sessionKey = window.sessionStorage.getItem(KEY_API);
    if (sessionKey) {
      const provider = (window.sessionStorage.getItem(KEY_PROVIDER) as AIProvider) || 'gemini';
      return {
        provider,
        model: window.sessionStorage.getItem(KEY_MODEL) || DEFAULT_MODELS[provider],
        apiKey: sessionKey,
        storageMode: 'session',
      };
    }

    const provider = (window.localStorage.getItem(KEY_PROVIDER) as AIProvider) || 'gemini';
    return {
      provider,
      model: window.localStorage.getItem(KEY_MODEL) || DEFAULT_MODELS[provider],
      apiKey: window.localStorage.getItem(KEY_API) || '',
      storageMode: (window.localStorage.getItem(KEY_STORAGE_MODE) as 'local' | 'session') || 'local',
    };
  } catch {
    return { provider: 'gemini', model: DEFAULT_MODELS.gemini, apiKey: '', storageMode: 'local' };
  }
}

export function saveUserAIConfig(config: UserAIConfig): void {
  const cleanKey = config.apiKey.trim();
  const cleanModel = config.model.trim() || DEFAULT_MODELS[config.provider];

  try {
    window.localStorage.removeItem(KEY_API);
    window.sessionStorage.removeItem(KEY_API);
    window.localStorage.setItem(KEY_STORAGE_MODE, config.storageMode);

    const target = getStorage(config.storageMode);
    if (target) {
      target.setItem(KEY_PROVIDER, config.provider);
      target.setItem(KEY_MODEL, cleanModel);
      target.setItem(KEY_API, cleanKey);
    }
    window.dispatchEvent(new CustomEvent(AI_UPDATED_EVENT));
  } catch {
    // Ignore storage write errors
  }
}

export function clearUserAIConfig(): void {
  try {
    for (const store of [window.localStorage, window.sessionStorage]) {
      store.removeItem(KEY_PROVIDER);
      store.removeItem(KEY_MODEL);
      store.removeItem(KEY_API);
      store.removeItem(KEY_STORAGE_MODE);
    }
    window.dispatchEvent(new CustomEvent(AI_UPDATED_EVENT));
  } catch {
    // Ignore
  }
}

export async function callUserAI(params: {
  prompt: string;
  systemPrompt?: string;
  configOverride?: UserAIConfig;
  maxTokens?: number;
}): Promise<string> {
  const en = getLanguage() === 'en';
  const cfg = params.configOverride ?? getUserAIConfig();
  const apiKey = cfg.apiKey.trim();
  if (!apiKey) {
    throw new Error(
      en
        ? 'You have not configured a personal AI API Key yet. Please set one up in AI Lab.'
        : 'Bạn chưa nhập AI API Key cá nhân. Vui lòng cài đặt tại AI Lab.',
    );
  }

  const model = cfg.model.trim() || DEFAULT_MODELS[cfg.provider];
  const systemText =
    params.systemPrompt ||
    (en
      ? 'You are VNEconomics AI Assistant specializing in Digital Economy, Digital Assets, AI, and academic research. Reply concisely in structured English based on factual evidence.'
      : 'Bạn là trợ lý phân tích Kinh tế số, Tài sản số, AI và Nghiên cứu khoa học của VNEconomics. Trả lời tiếng Việt súc tích, có cấu trúc, dựa trên dữ liệu thực tế.');

  if (cfg.provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemText }] },
        contents: [{ parts: [{ text: params.prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: params.maxTokens ?? 1200,
        },
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json?.error?.message || `Gemini HTTP ${res.status}`);
    }
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error(en ? 'Gemini returned an empty response.' : 'Gemini không trả về nội dung.');
    return String(text);
  }

  const endpoint =
    cfg.provider === 'openrouter'
      ? 'https://openrouter.ai/api/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
  if (cfg.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://vneconomics.com';
    headers['X-Title'] = 'VNEconomics BYOK AI';
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemText },
        { role: 'user', content: params.prompt },
      ],
      temperature: 0.4,
      max_tokens: params.maxTokens ?? 1200,
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error?.message || `${cfg.provider.toUpperCase()} HTTP ${res.status}`);
  }
  const text = json?.choices?.[0]?.message?.content;
  if (!text) throw new Error(en ? 'The AI model returned no content.' : 'Mô hình AI không trả về nội dung.');
  return String(text);
}

export async function testUserAIKey(config: UserAIConfig): Promise<{ ok: boolean; message: string }> {
  const en = getLanguage() === 'en';
  if (!config.apiKey.trim()) {
    return {
      ok: false,
      message: en ? 'Please enter an API Key before testing.' : 'Vui lòng nhập API Key trước khi kiểm tra.',
    };
  }
  try {
    const reply = await callUserAI({
      prompt: 'Reply with exactly 2 characters: OK',
      systemPrompt: 'Respond with OK only.',
      configOverride: config,
      maxTokens: 16,
    });
    return {
      ok: true,
      message: en
        ? `Connected to ${config.provider.toUpperCase()} (${config.model})! Response: ${reply.slice(0, 30)}`
        : `Kết nối ${config.provider.toUpperCase()} (${config.model}) thành công! Phản hồi: ${reply.slice(0, 30)}`,
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : en ? 'Unable to reach AI API.' : 'Không thể kết nối tới API.',
    };
  }
}
