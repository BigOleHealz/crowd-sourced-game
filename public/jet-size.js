// F-35A dimensions in game metres (Lockheed Martin: 15.7 m by 10.7 m).
// The original visual and contact frame measured 6.03 m nose to tail.
export const jetLength=15.7;
export const jetWingspan=10.7;
export const jetScale=jetLength/6.03;
export const jetHalfLength=jetLength/2;
export const jetHalfSpan=jetWingspan/2;
// The old contact outline was wider than the downloaded airframe.
export const jetWidthScale=jetHalfSpan/(2.82*jetScale);
