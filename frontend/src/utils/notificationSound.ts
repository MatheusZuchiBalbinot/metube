interface WindowWithWebkit extends Window {
    webkitAudioContext?: typeof AudioContext;
}

let context: AudioContext | null = null;

function getContext(): AudioContext | null {
    const AudioContextCtor = window.AudioContext ?? (window as WindowWithWebkit).webkitAudioContext;
    const isAvailable = AudioContextCtor !== undefined;

    if (!isAvailable) {
        return null;
    }

    context ??= new AudioContextCtor();

    return context;
}

function scheduleTone(ctx: AudioContext, hz: number, startAt: number, duration: number, volume: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(hz, startAt);
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(volume, startAt + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
    osc.start(startAt);
    osc.stop(startAt + duration + 0.05);
}

export async function playNotificationSound(): Promise<void> {
    const ctx = getContext();

    if (ctx === null) {
        return;
    }

    const isSuspended = ctx.state === 'suspended';

    if (isSuspended) {
        await ctx.resume();
    }

    const now = ctx.currentTime;

    scheduleTone(ctx, 660, now, 0.22, 0.22);
    scheduleTone(ctx, 880, now + 0.09, 0.26, 0.18);
    scheduleTone(ctx, 1100, now + 0.20, 0.38, 0.14);
}
