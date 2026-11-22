export const dogStrikePlumeTicks=108;

export function sharkBiteVoiceGain(contact,listener){
  const distance=Math.hypot(contact.x-listener.x,contact.y-listener.y,contact.z-listener.z);
  return Math.max(0,Math.min(1,(38-distance)/14));
}
