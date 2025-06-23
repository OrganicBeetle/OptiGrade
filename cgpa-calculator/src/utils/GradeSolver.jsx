const gradePoints = {
  F: 0,
  D: 4,
  "C-": 5,
  C: 6,
  "B-": 7,
  B: 8,
  "A-": 9,
  A: 10,
  "A*": 10,
};

const gradeOrder = ["A", "A-", "B", "B-", "C", "C-", "D"];

/**
 * Computes optimal grades for unknown courses to just meet or slightly exceed target SPI.
 * Prioritizes giving high grades to low-credit courses and minimal grades to high-credit courses.
 *
 * @param {Array} knownCourses - [{ name, credits, grade }]
 * @param {Array} unknownCourses - [{ name, credits }]
 * @param {Number} targetSPI - Required SPI (e.g., 8.5)
 * @returns {Array|null} - Array of grades for unknownCourses (in order), or null if impossible
 */

export function dpMinGradeSolver(knownCourses, unknownCourses, targetSPI) {
  const scale = 100;
  const totalCredits = [...knownCourses, ...unknownCourses].reduce(
    (sum, c) => sum + c.credits,
    0
  );

  const requiredPoints = Math.ceil(targetSPI * totalCredits * scale);
  const knownPoints = knownCourses.reduce(
    (sum, c) => sum + gradePoints[c.grade] * c.credits * scale,
    0
  );

  const needFromUnknown = requiredPoints - knownPoints;
  if (needFromUnknown <= 0) return unknownCourses.map(() => "D");

  const n = unknownCourses.length;
  const indexedCourses = unknownCourses
    .map((c, i) => ({ ...c, index: i }))
    .sort((a, b) => a.credits - b.credits);

  const dp = Array.from({ length: n + 1 }, () => new Map());
  dp[0].set(0, []);

  for (let i = 0; i < n; i++) {
    const { credits, index } = indexedCourses[i];

    for (const [currPoints, path] of dp[i]) {
      for (let g = 0; g < gradeOrder.length; g++) {
        const grade = gradeOrder[g];
        const gradeVal = gradePoints[grade];
        const addedPoints = gradeVal * credits * scale;
        const newPoints = currPoints + addedPoints;

        if (!dp[i + 1].has(newPoints)) {
          dp[i + 1].set(newPoints, [...path, { index, grade }]);
        }
      }
    }
  }

  const finalMap = dp[n];
  const sortedKeys = Array.from(finalMap.keys()).sort((a, b) => a - b);

  for (const points of sortedKeys) {
    if (points >= needFromUnknown) {
      const solvedGrades = finalMap.get(points)
        .sort((a, b) => a.index - b.index)
        .map((x) => x.grade);
      return solvedGrades;
    }
  }

  return null;
}
