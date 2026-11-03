import { describe, expect, it } from "vitest";
import { globPatternToLike } from "../lib/globPattern";

describe("globPatternToLike", () => {
  it("uses legacy substring normalization when there are no glob wildcards", () => {
    expect(globPatternToLike("new checkout")).toEqual({
      like: "%new%checkout%",
      escape: undefined,
    });
  });

  it("maps * and ? to SQL LIKE wildcards", () => {
    expect(globPatternToLike("checkout-*")).toEqual({
      like: "checkout-%",
      escape: "\\",
    });
    expect(globPatternToLike("v?")).toEqual({
      like: "v_",
      escape: "\\",
    });
  });

  it("escapes literal % and _ in glob patterns", () => {
    expect(globPatternToLike("sale_100%*")).toEqual({
      like: "sale\\_100\\%%",
      escape: "\\",
    });
  });
});
