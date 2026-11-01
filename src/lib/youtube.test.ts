import { describe, expect, it } from "vitest";
import { parseYouTubeId } from "./youtube";

describe("parseYouTubeId", () => {
  it("nhận id trần 11 ký tự", () => {
    expect(parseYouTubeId("M7lc1UVf-VE")).toBe("M7lc1UVf-VE");
  });

  it("nhận các dạng URL YouTube phổ biến", () => {
    const id = "M7lc1UVf-VE";
    expect(parseYouTubeId(`https://www.youtube.com/watch?v=${id}`)).toBe(id);
    expect(parseYouTubeId(`https://youtube.com/watch?v=${id}&t=30s`)).toBe(id);
    expect(parseYouTubeId(`https://m.youtube.com/watch?v=${id}`)).toBe(id);
    expect(parseYouTubeId(`https://music.youtube.com/watch?v=${id}`)).toBe(id);
    expect(parseYouTubeId(`https://youtu.be/${id}`)).toBe(id);
    expect(parseYouTubeId(`https://www.youtube.com/embed/${id}`)).toBe(id);
    expect(parseYouTubeId(`https://www.youtube.com/live/${id}`)).toBe(id);
    expect(parseYouTubeId(`https://www.youtube.com/shorts/${id}`)).toBe(id);
    expect(parseYouTubeId(`https://www.youtube-nocookie.com/embed/${id}`)).toBe(id);
    expect(parseYouTubeId(`youtube.com/watch?v=${id}`)).toBe(id);
    expect(parseYouTubeId(`  https://youtu.be/${id}?si=abc  `)).toBe(id);
  });

  it("từ chối host không phải YouTube", () => {
    expect(parseYouTubeId("https://evil.com/youtube.com/watch?v=M7lc1UVf-VE")).toBeNull();
    expect(parseYouTubeId("https://notyoutube.com/watch?v=M7lc1UVf-VE")).toBeNull();
    expect(parseYouTubeId("https://youtube.com.evil.com/watch?v=M7lc1UVf-VE")).toBeNull();
    expect(parseYouTubeId("https://127.0.0.1/youtube.com/watch?v=M7lc1UVf-VE")).toBeNull();
  });

  it("từ chối scheme nguy hiểm và id sai độ dài", () => {
    expect(parseYouTubeId("javascript:alert(1)//youtube.com/watch?v=M7lc1UVf-VE")).toBeNull();
    expect(parseYouTubeId("https://www.youtube.com/watch?v=abc")).toBeNull();
    expect(parseYouTubeId("https://www.youtube.com/watch")).toBeNull();
    expect(parseYouTubeId("")).toBeNull();
    expect(parseYouTubeId("   ")).toBeNull();
  });
});
