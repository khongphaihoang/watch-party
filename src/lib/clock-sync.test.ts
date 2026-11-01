import { describe, expect, it } from "vitest";
import { offsetFromSample, pickServerOffset, type PingSample } from "./clock-sync";

function sample(t0: number, t1: number, t2: number): PingSample {
  return { t0, t1, t2 };
}

describe("offsetFromSample", () => {
  it("tính offset khi RTT đối xứng", () => {
    // Gửi lúc 1000, server 1200, nhận 1400 → RTT 400, offset 0 (chỉ lệch đường truyền đều).
    expect(offsetFromSample(sample(1_000, 1_200, 1_400))).toBe(0);
    // Đồng hồ client chậm 500ms so với server.
    expect(offsetFromSample(sample(1_000, 1_700, 1_400))).toBe(500);
  });

  it("bỏ mẫu không hợp lệ", () => {
    expect(offsetFromSample(sample(1_000, 1_200, 900))).toBeNull();
    expect(offsetFromSample(sample(Number.NaN, 1_200, 1_400))).toBeNull();
  });
});

describe("pickServerOffset", () => {
  it("cần ít nhất 3 mẫu", () => {
    expect(pickServerOffset([])).toBeNull();
    expect(pickServerOffset([sample(1_000, 1_200, 1_400)])).toBeNull();
    expect(
      pickServerOffset([sample(1_000, 1_200, 1_400), sample(1_000, 1_200, 1_400)]),
    ).toBeNull();
  });

  it("lấy trung vị để bỏ mẫu nhiễu", () => {
    const samples = [
      sample(1_000, 1_500, 1_400),
      sample(1_000, 1_500, 1_400),
      sample(1_000, 1_900, 1_400),
    ];
    expect(pickServerOffset(samples)).toBe(300);
  });

  it("trung bình hai mẫu giữa khi số mẫu chẵn", () => {
    const samples = [
      sample(1_000, 1_500, 1_400),
      sample(1_000, 1_700, 1_400),
    ];
    expect(pickServerOffset(samples)).toBeNull();
    expect(
      pickServerOffset([...samples, sample(1_000, 1_600, 1_400), sample(1_000, 1_700, 1_400)]),
    ).toBe(450);
  });
});
