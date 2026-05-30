import { apiClient } from './client';
import type { ApiResult } from './client';
import type { Vuid } from './videos';

export interface ChatMessage {
    role: 'user' | 'assistant'
    content: string
}

export interface ChatRequest {
    question: string
    history: ChatMessage[]
}

export interface ChatResponse {
    answer: string
}

function parseChatResponse(raw: unknown): ChatResponse | null {
    const isObject = raw !== null && typeof raw === 'object';
    if (!isObject) {
        return null;
    }

    const data = raw as Record<string, unknown>;
    const answer = data['answer'];

    if (typeof answer !== 'string') {
        return null;
    }

    return { answer };
}

class ChatApi {
    private readonly baseUrl = '/videos';

    async ask(vuid: Vuid, payload: ChatRequest): Promise<ApiResult<ChatResponse>> {
        return apiClient.postValidated(
            `${this.baseUrl}/${vuid}/chat`,
            parseChatResponse,
            { question: payload.question, history: payload.history },
        );
    }
}

export const chat = new ChatApi();
