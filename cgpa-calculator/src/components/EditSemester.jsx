import { useState } from "react";
import { toast } from "react-toastify";
import { db } from "../utils/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

const gradePoints = {
  "A*": 10,
  A: 10,
  "A-": 9,
  B: 8,
  "B-": 7,
  C: 6,
  "C-": 5,
  D: 4,
  F: 0,
  "10": 10,
  "9": 9,
  "8": 8,
  "7": 7,
  "6": 6,
  "5": 5,
  "4": 4,
  "0": 0,
};



const EditSemester = ({ semester: semesterData, onClose }) => {
  const { user } = useAuth();
  const [gradeInputs, setGradeInputs] = useState(() =>
    semesterData.courses.reduce((acc, course) => {
      acc[course.name] = course.grade;
      return acc;
    }, {})
  );

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const updatedCourses = semesterData.courses.map((course) => ({
        ...course,
        grade: (gradeInputs[course.name] || "").toUpperCase(),
      }));

      for (const course of updatedCourses) {
        if (!(course.grade in gradePoints)) {
          toast.error(`Invalid grade for ${course.name}`);
          setIsSaving(false);
          return;
        }
      }

      const totalCredits = updatedCourses.reduce((sum, c) => sum + c.credits, 0);
      const totalPoints = updatedCourses.reduce(
        (sum, c) => sum + gradePoints[c.grade] * c.credits,
        0
      );
      const newSPI = (totalPoints / totalCredits).toFixed(2);

      const ref = doc(db, "semesters", user.uid, "data", String(semesterData.semester));
      await setDoc(ref, {
        semester: semesterData.semester,
        courses: updatedCourses,
        spi: newSPI,
      });

      toast.success(`Semester ${semesterData.semester} updated!`);
      setTimeout(() => window.location.reload(), 1000); // Full reload after 1s
    } catch (err) {
      console.error("Update error:", err);
      toast.error("Failed to update semester");
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-xl max-w-xl mx-auto">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Edit Semester {semesterData.semester}
      </h2>

      <div className="space-y-4">
        {semesterData.courses.map((course, idx) => (
          <div key={idx} className="flex justify-between items-center">
            <span className="w-2/3 text-gray-700">{course.name}</span>
            <input
              type="text"
              className="w-24 border p-1 rounded text-center"
              value={gradeInputs[course.name] || ""}
              onChange={(e) =>
                setGradeInputs((prev) => ({
                  ...prev,
                  [course.name]: e.target.value.toUpperCase(),
                }))
              }
            />
          </div>
        ))}
      </div>

      <div className="mt-5 flex justify-end space-x-3">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded border border-gray-400 text-gray-600 hover:bg-gray-100"
          disabled={isSaving}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className={`px-4 py-2 rounded text-white ${
            isSaving ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
          }`}
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
};

export default EditSemester;
