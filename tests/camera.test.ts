import { describe, expect, it } from "vitest";
import { cameraFor } from "../src/components/Stage";

const landscape = { w: 1280, h: 853 };
const phoneFrame = { w: 390, h: 440 };

describe("cameraFor", () => {
  it("fits the whole room in the frame when no stop is chosen, centred", () => {
    const cam = cameraFor(null, landscape, phoneFrame, 1536, 3);
    expect(cam.scale).toBeCloseTo(390 / 1280);
    expect(cam.tx).toBeCloseTo(0);
    expect(cam.ty).toBeCloseTo((440 - 853 * cam.scale) / 2); // letterboxed top and bottom
  });

  it("walking to a stop always fills the frame (no empty bars) and keeps the stop near the centre", () => {
    const box: [number, number, number, number] = [400, 450, 600, 550]; // a small object in the middle
    const cam = cameraFor(box, landscape, phoneFrame, 4000, 1);
    const cover = Math.max(390 / 1280, 440 / 853);
    expect(cam.scale).toBeGreaterThanOrEqual(cover - 1e-9);
    const cx = 0.5 * 1280 * cam.scale + cam.tx;
    const cy = 0.5 * 853 * cam.scale + cam.ty;
    expect(cx).toBeCloseTo(195, 0);
    expect(cy).toBeCloseTo(220, 0);
  });

  it("never shows more than 1.5 screen pixels per real photo pixel", () => {
    const tiny: [number, number, number, number] = [490, 490, 510, 510];
    const cam = cameraFor(tiny, landscape, { w: 940, h: 626 }, 1536, 2); // a retina laptop
    expect((landscape.w * cam.scale * 2) / 1536).toBeLessThanOrEqual(1.5 + 1e-9);
  });

  it("never pans past the photo's edge", () => {
    const corner: [number, number, number, number] = [0, 900, 100, 1000]; // top-right corner
    const cam = cameraFor(corner, landscape, phoneFrame, 4000, 1);
    expect(cam.tx).toBeLessThanOrEqual(0);
    expect(cam.tx).toBeGreaterThanOrEqual(phoneFrame.w - landscape.w * cam.scale - 1e-9);
    expect(cam.ty).toBeLessThanOrEqual(0);
  });

  it("is the old behaviour on a frame with the photo's own shape", () => {
    const cam = cameraFor(null, landscape, { w: 640, h: 426.5 }, 1536, 1);
    expect(cam.scale).toBeCloseTo(0.5);
    expect(cam.tx).toBeCloseTo(0);
    expect(cam.ty).toBeCloseTo(0);
  });
});
