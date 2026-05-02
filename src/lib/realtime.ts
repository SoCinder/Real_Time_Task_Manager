type Subscriber = (data: string) => void;

const subscribers = new Set<Subscriber>();

export function subscribe(fn: Subscriber) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export function publish(event: string, payload: any) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const s of subscribers) {
    try {
      s(msg);
    } catch (e) {
      // ignore
    }
  }
}
