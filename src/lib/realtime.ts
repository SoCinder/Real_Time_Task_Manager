import Ably from "ably";

const ably = new Ably.Rest(process.env.ABLY_API_KEY!);
const channel = ably.channels.get("tasks");

export function publish(event: string, payload: any) {
  channel.publish(event, payload);
}