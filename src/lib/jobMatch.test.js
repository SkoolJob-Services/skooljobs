import { describe, expect, it } from "vitest";
import { computeJobMatch } from "./jobMatch";

describe("computeJobMatch", () => {
  it("scores a strong match higher than a weak one", () => {
    const job = { subject: "Mathematics", qualifications: "B.Ed required" };
    const strong = computeJobMatch(job, {
      teacherData: { mainSubject: "Mathematics", highestQualificationOne: "B.Ed" },
      experiences: [{ startDate: "2015-01-01", endDate: "2023-01-01" }],
    });
    const weak = computeJobMatch(job, {
      teacherData: { mainSubject: "History", highestQualificationOne: "B.A" },
    });
    expect(strong).toBeGreaterThan(weak);
  });

  it("uses the 'Other' free-text subject when the teacher picked Other", () => {
    const job = { subject: "Robotics" };
    const withOther = computeJobMatch(job, {
      teacherData: { mainSubject: "Other", mainSubjectOther: "Robotics" },
    });
    const withoutOther = computeJobMatch(job, {
      teacherData: { mainSubject: "Other", mainSubjectOther: "Music" },
    });
    expect(withOther).toBeGreaterThan(withoutOther);
  });

  it("keeps the score within the 35-99 display range", () => {
    expect(computeJobMatch({})).toBeGreaterThanOrEqual(35);
    const maxed = computeJobMatch(
      { subject: "Physics", qualifications: "M.Sc" },
      {
        teacherData: { mainSubject: "Physics", highestQualificationOne: "M.Sc" },
        experiences: [{ startDate: "1990-01-01", endDate: "2020-01-01" }],
      },
    );
    expect(maxed).toBeLessThanOrEqual(99);
  });
});
