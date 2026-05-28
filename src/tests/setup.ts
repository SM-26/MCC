import { vi } from 'vitest';

const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    clear: vi.fn(),
    removeItem: vi.fn(),
    length: 0,
    key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

vi.stubGlobal('fetch', vi.fn(() =>
    Promise.resolve({
        ok: true,
        text: () => Promise.resolve(''),
    })
));