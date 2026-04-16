import type { TherapeuticIntention } from "@/models/storyBrief.model";
import { checkVagueIntention } from "@/agent1/pre-check/vague-intention";

function makeIntention(feel: string, because: string): TherapeuticIntention {
  return { feel, because };
}

describe("checkVagueIntention — pattern matches (Rule 1)", () => {
  it('matches "they can be brave"', () => {
    const r = checkVagueIntention(
      makeIntention("That they feel calm", "they can be brave"),
    );
    expect(r).toEqual({ isVague: true, matchedPattern: "they can be brave" });
  });

  it('matches "everything will be okay" as substring', () => {
    const r = checkVagueIntention(
      makeIntention(
        "I want them to know",
        "that everything will be okay in the end",
      ),
    );
    expect(r).toEqual({
      isVague: true,
      matchedPattern: "everything will be okay",
    });
  });

  it('matches "it will be fine"', () => {
    const r = checkVagueIntention(
      makeIntention("Calm", "it will be fine now"),
    );
    expect(r).toEqual({ isVague: true, matchedPattern: "it will be fine" });
  });

  it('matches "it will be alright"', () => {
    const r = checkVagueIntention(
      makeIntention("Calm", "it will be alright"),
    );
    expect(r).toEqual({ isVague: true, matchedPattern: "it will be alright" });
  });

  it('matches "there\'s nothing to be scared of"', () => {
    const r = checkVagueIntention(
      makeIntention("Calm", "there's nothing to be scared of here"),
    );
    expect(r).toEqual({
      isVague: true,
      matchedPattern: "there's nothing to be scared of",
    });
  });

  it('matches "nothing to worry about"', () => {
    const r = checkVagueIntention(
      makeIntention("Calm", "nothing to worry about"),
    );
    expect(r).toEqual({
      isVague: true,
      matchedPattern: "nothing to worry about",
    });
  });

  it('matches "they are safe"', () => {
    const r = checkVagueIntention(
      makeIntention("Calm", "they are safe"),
    );
    expect(r).toEqual({ isVague: true, matchedPattern: "they are safe" });
  });

  it('matches "they are loved"', () => {
    const r = checkVagueIntention(
      makeIntention("Calm", "they are loved"),
    );
    expect(r).toEqual({ isVague: true, matchedPattern: "they are loved" });
  });

  it('matches "they can do it"', () => {
    const r = checkVagueIntention(
      makeIntention("Calm", "they can do it"),
    );
    expect(r).toEqual({ isVague: true, matchedPattern: "they can do it" });
  });

  it('matches "they can handle it"', () => {
    const r = checkVagueIntention(
      makeIntention("Calm", "they can handle it"),
    );
    expect(r).toEqual({ isVague: true, matchedPattern: "they can handle it" });
  });

  it('matches "it\'s not that bad"', () => {
    const r = checkVagueIntention(
      makeIntention("Calm", "it's not that bad"),
    );
    expect(r).toEqual({ isVague: true, matchedPattern: "it's not that bad" });
  });

  it('matches "it\'s not so scary"', () => {
    const r = checkVagueIntention(
      makeIntention("Calm", "it's not so scary"),
    );
    expect(r).toEqual({ isVague: true, matchedPattern: "it's not so scary" });
  });

  it('matches "feel better" in the feel half', () => {
    const r = checkVagueIntention(
      makeIntention("feel better", "they understand their emotions"),
    );
    expect(r).toEqual({ isVague: true, matchedPattern: "feel better" });
  });
});

describe("checkVagueIntention — case insensitivity", () => {
  it("normalizes case before matching patterns", () => {
    const r = checkVagueIntention(
      makeIntention("That They Can Be Brave", "and strong"),
    );
    expect(r).toEqual({ isVague: true, matchedPattern: "they can be brave" });
  });
});

describe("checkVagueIntention — whitespace trimming", () => {
  it("trims each half before building the concatenation", () => {
    const r = checkVagueIntention(
      makeIntention("  feel better  ", "  because reasons  "),
    );
    expect(r).toEqual({ isVague: true, matchedPattern: "feel better" });
  });
});

describe("checkVagueIntention — short-second-half heuristic (Rule 2)", () => {
  it("flags short because with only short/stop tokens", () => {
    const r = checkVagueIntention(
      makeIntention("That they feel calm", "so they can"),
    );
    expect(r).toEqual({
      isVague: true,
      matchedPattern: "short_second_half_no_concrete_noun",
    });
  });

  it("flags very short because with no long tokens", () => {
    const r = checkVagueIntention(
      makeIntention("That they feel calm", "it is ok"),
    );
    expect(r).toEqual({
      isVague: true,
      matchedPattern: "short_second_half_no_concrete_noun",
    });
  });

  it("flags empty because string", () => {
    const r = checkVagueIntention(makeIntention("That they feel calm", ""));
    expect(r).toEqual({
      isVague: true,
      matchedPattern: "short_second_half_no_concrete_noun",
    });
  });
});

describe("checkVagueIntention — short second half with concrete noun", () => {
  it("does not flag when a token is longer than 4 chars and not a stop word (bedtime)", () => {
    const r = checkVagueIntention(
      makeIntention("That they feel calm", "bedtime routine"),
    );
    expect(r).toEqual({ isVague: false });
  });

  it("does not flag when a token is longer than 4 chars and not a stop word (teacher)", () => {
    const r = checkVagueIntention(
      makeIntention("That they feel calm", "their teacher"),
    );
    expect(r).toEqual({ isVague: false });
  });
});

describe("checkVagueIntention — non-vague intentions", () => {
  it("returns false for long specific intention with no pattern match", () => {
    const r = checkVagueIntention(
      makeIntention(
        "That they can approach new social situations with curiosity instead of dread",
        "even when their body tells them to run away, they have tools they can use to stay present and engaged",
      ),
    );
    expect(r).toEqual({ isVague: false });
  });

  it("returns false for concrete specific second half", () => {
    const r = checkVagueIntention(
      makeIntention(
        "That they feel understood in their fear of the dark",
        "the specific monsters they imagine feel less powerful when named",
      ),
    );
    expect(r).toEqual({ isVague: false });
  });
});

describe("checkVagueIntention — edge cases for second-half length", () => {
  it("flags exactly 29 chars when no concrete noun", () => {
    const because29 = "a a a a a a a a a a a a a a a";
    expect(because29.length).toBe(29);
    const r = checkVagueIntention(
      makeIntention("That they feel calm", because29),
    );
    expect(r).toEqual({
      isVague: true,
      matchedPattern: "short_second_half_no_concrete_noun",
    });
  });

  it("does not flag exactly 30 chars when only stop-word tokens (threshold is < 30)", () => {
    const because30 = "the the the the the the the is";
    expect(because30.length).toBe(30);
    const r = checkVagueIntention(
      makeIntention("That they feel calm", because30),
    );
    expect(r).toEqual({ isVague: false });
  });
});
