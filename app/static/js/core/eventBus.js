// /app/static/js/core/eventBus.js

class EventBus {
    constructor() {
        this.events = new Map();
    }

    on(event, handler) {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }

        this.events.get(event).add(handler);

        // вернуть unsubscribe
        return () => this.off(event, handler);
    }

    off(event, handler) {
        if (!this.events.has(event)) return;

        this.events.get(event).delete(handler);
    }

    emit(event, payload) {
        if (!this.events.has(event)) return;

        for (const handler of this.events.get(event)) {
            handler(payload);
        }
    }

    clear(event) {
        if (event) {
            this.events.delete(event);
        } else {
            this.events.clear();
        }
    }
}

export const eventBus = new EventBus();