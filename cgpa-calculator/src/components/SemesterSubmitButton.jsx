import { Button } from "@mui/material";
import { doc, setDoc, collection, getDocs, query } from "firebase/firestore";

const SemesterSubmitButton = ({
  selectedSemester,
  courseMap,
  gradeInputs,
  gradePoints,
  user,
  db,
  toast,
  setShowForm,
  setSelectedSemester,
  setGradeInputs,
  setSemesters,
  setGpaStats,
  computeGPA,
}) => {
  const handleClick = async () => {
    if (!selectedSemester || !courseMap[selectedSemester]) return;

    const courses = courseMap[selectedSemester].map((course) => {
      const raw = (gradeInputs[course.name] || "").toUpperCase();

      // If it's a valid letter grade (like A, B-), use it
      if (gradePoints.hasOwnProperty(raw)) {
        return { ...course, grade: raw };
      }

      // If it's a numeric input (like "9"), find the corresponding letter grade
      const numericToLetter = Object.entries(gradePoints).find(
        ([, val]) => val === Number(raw)
      );
      const letter = numericToLetter?.[0];

      return { ...course, grade: letter || "" };
    });

    for (const course of courses) {
      if (!course.grade || !(course.grade in gradePoints)) {
        toast.error(`Invalid or missing grade for: ${course.name}`);
        return;
      }
    }

    const totalCredits = courses.reduce((acc, c) => acc + c.credits, 0);
    const totalPoints = courses.reduce(
      (acc, c) => acc + (gradePoints[c.grade] ?? 0) * c.credits,
      0
    );
    const spi = totalCredits ? (totalPoints / totalCredits).toFixed(2) : "0";

    try {
      const ref = doc(
        db,
        "semesters",
        user.uid,
        "data",
        String(selectedSemester)
      );
      await setDoc(ref, {
        semester: selectedSemester,
        courses,
        spi,
      });

      toast.success(`Semester ${selectedSemester} saved successfully 🎉`);
      setShowForm(false);
      setSelectedSemester(null);
      setGradeInputs({});

      const semRef = collection(db, "semesters", user.uid, "data");
      const q = query(semRef);
      const snap = await getDocs(q);
      const sems = [];
      snap.forEach((doc) => sems.push(doc.data()));
      sems.sort((a, b) => a.semester - b.semester);

      setSemesters(sems);
      setGpaStats(computeGPA(sems));
      // Calculate CPI
      const totalCredits = sems.reduce((sum, sem) => {
        const semCredits = sem.courses.reduce((acc, c) => acc + c.credits, 0);
        return sum + semCredits;
      }, 0);

      const weightedPoints = sems.reduce((sum, sem) => {
        const semCredits = sem.courses.reduce((acc, c) => acc + c.credits, 0);
        return sum + parseFloat(sem.spi) * semCredits;
      }, 0);

      const cpi =
        totalCredits === 0
          ? 0
          : parseFloat((weightedPoints / totalCredits).toFixed(2));

      // Update CPI and semester count in Firestore
      await setDoc(
        doc(db, "users", user.uid),
        {
          cpi,
          semesterCount: sems.length,
        },
        { merge: true }
      );
    } catch (err) {
      console.error("Failed to submit semester", err);
      toast.error("Failed to save semester. Please try again.");
    }
  };

  return (
    <div className="flex justify-center mt-8">
      <Button className="mt-6" onClick={handleClick}>
        Submit Semester
      </Button>
    </div>
  );
};

export default SemesterSubmitButton;
