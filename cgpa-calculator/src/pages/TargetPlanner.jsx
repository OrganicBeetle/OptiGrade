import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import { courseMap } from "../utils/CourseMap";
import { dpMinGradeSolver } from "../utils/GradeSolver";
import { useNavigate } from "react-router-dom";
import { saveUpcomingTarget } from "../utils/upcomingTargetService.jsx";
import { toast } from "react-toastify";
import { FiArrowLeft } from "react-icons/fi";


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
  10: 10,
  9: 9,
  8: 8,
  7: 7,
  6: 6,
  5: 5,
  4: 4,
  0: 0,
};

const TargetPlanner = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [targetCPI, setTargetCPI] = useState(0);
  const [currentCPI, setCurrentCPI] = useState(null);
  const [semesters, setSemesters] = useState([]);
  const [latestSemester, setLatestSemester] = useState(null);
  const [requiredSPI, setRequiredSPI] = useState(null);
  const [partialInputs, setPartialInputs] = useState({});
  const [gradeResult, setGradeResult] = useState(null);
  const [calcError, setCalcError] = useState(null);
  const [branch, setBranch] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) setBranch(userSnap.data().branch);
    };
    fetchUserData();
  }, [user]);

  useEffect(() => {
    const fetchSemesters = async () => {
      setLoading(true); // show loader
      const snap = await getDocs(collection(db, "semesters", user.uid, "data"));
      const list = [];
      snap.forEach((doc) => list.push(doc.data()));
      list.sort((a, b) => a.semester - b.semester);
      setSemesters(list);

      if (list.length > 0) {
        const totalPoints = list.reduce(
          (sum, sem) =>
            sum +
            sem.courses.reduce(
              (s, c) => s + gradePoints[c.grade] * c.credits,
              0
            ),
          0
        );
        const totalCredits = list.reduce(
          (sum, sem) => sum + sem.courses.reduce((s, c) => s + c.credits, 0),
          0
        );
        setCurrentCPI((totalPoints / totalCredits).toFixed(2));
        setLatestSemester(list[list.length - 1].semester);
      }
      setLoading(false); // hide loader
    };
    if (user) fetchSemesters();
  }, [user]);

  useEffect(() => {
    const fetchSemesters = async () => {
      const snap = await getDocs(collection(db, "semesters", user.uid, "data"));
      const list = [];
      snap.forEach((doc) => list.push(doc.data()));
      list.sort((a, b) => a.semester - b.semester);
      setSemesters(list);

      if (list.length > 0) {
        const totalPoints = list.reduce(
          (sum, sem) =>
            sum +
            sem.courses.reduce(
              (s, c) => s + gradePoints[c.grade] * c.credits,
              0
            ),
          0
        );
        const totalCredits = list.reduce(
          (sum, sem) => sum + sem.courses.reduce((s, c) => s + c.credits, 0),
          0
        );
        setCurrentCPI((totalPoints / totalCredits).toFixed(2));
        setLatestSemester(list[list.length - 1].semester);
      }
    };
    if (user) fetchSemesters();
  }, [user]);

  const handleCalculate = () => {
    const upcomingCourses = courseMap[branch]?.[latestSemester + 1] || [];
    const upcomingCredits = upcomingCourses.reduce(
      (sum, c) => sum + c.credits,
      0
    );
    const prevCredits = semesters.reduce(
      (sum, sem) => sum + sem.courses.reduce((s, c) => s + c.credits, 0),
      0
    );
    const totalCredits = prevCredits + upcomingCredits;

    const requiredTotalPoints = targetCPI * totalCredits;
    const currentTotalPoints = semesters.reduce(
      (sum, sem) =>
        sum +
        sem.courses.reduce((s, c) => s + gradePoints[c.grade] * c.credits, 0),
      0
    );

    const neededPoints = requiredTotalPoints - currentTotalPoints;
    const reqSPI = neededPoints / upcomingCredits;
    setRequiredSPI(reqSPI.toFixed(2));
  };

  const handleSaveTarget = async () => {
    if (saving) return;
    setSaving(true);

    const upcomingCourses = courseMap[branch]?.[latestSemester + 1] || [];

    const known = Object.entries(partialInputs)
      .filter(([_, g]) => g && gradePoints[g])
      .map(([name, grade]) => {
        const course = upcomingCourses.find((c) => c.name === name);
        return { ...course, grade };
      });

    const computed = gradeResult.map(({ name, grade }) => {
      const course = upcomingCourses.find((c) => c.name === name);
      return { ...course, grade };
    });

    const finalCourses = [...known, ...computed];

    try {
      await saveUpcomingTarget(
        user.uid,
        latestSemester + 1,
        requiredSPI,
        finalCourses
      );
      toast.success("✅ Target saved successfully!");
      setTimeout(() => navigate("/dashboard"), 1200);
    } catch (err) {
      console.error(err);
      toast.error("❌ Failed to save target.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
    </div>
  );
}
const computeGlobalStats = (usersData) => {
  const maxSem = Math.max(...usersData.map(u => u.semesters.length));
  const avgSPI = Array(maxSem).fill(0);
  const counts = Array(maxSem).fill(0);
  const topUser = usersData.reduce((a, b) => (a.cgpa > b.cgpa ? a : b));

  usersData.forEach(user => {
    user.semesters.forEach((sem, idx) => {
      avgSPI[idx] += parseFloat(sem.spi);
      counts[idx]++;
    });
  });

  return {
    avgSPI: avgSPI.map((sum, i) => (counts[i] ? sum / counts[i] : null)),
    topSPI: topUser.semesters.map(s => parseFloat(s.spi)),
  };
};


  return (
    <div className="relative">
      {/* Back Button */}
      <button
        onClick={() => navigate("/dashboard")}
        className="
          flex items-center gap-2
          px-4 py-2
          rounded-full
          bg-blue-50
          text-blue-700
          shadow
          hover:bg-blue-100 hover:text-blue-900
          transition
          focus:outline-none focus:ring-2 focus:ring-blue-400
          absolute left-6 top-6
          z-10
        "
        aria-label="Back to Dashboard"
      >
        <FiArrowLeft className="text-xl" />
        <span className="font-medium text-base hidden sm:inline">Back</span>
      </button>
      {semesters.length === 0 ? (
        <div className="max-w-xl mx-auto p-6 bg-white shadow-lg rounded-xl mt-5 text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            📋 No Semester Data Found
          </h2>
          <p className="text-gray-600 mb-4">
            Please add your past semester grades from the Dashboard.
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      ) : (
        <div className="max-w-xl mx-auto p-6 bg-white shadow-lg rounded-xl mt-5">

          <div className="max-w-xl mx-auto p-6 bg-white shadow-lg rounded-xl mt-5">
            <h2 className="text-2xl font-semibold text-blue-700 mb-4">
              🎯 Target CPI Planner
            </h2>
            <p className="text-gray-700 mb-4">
              Current CPI:{" "}
              <span className="font-bold text-green-600">
                {currentCPI || "Loading..."}
              </span>
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Enter your target CPI
            </label>
            <input
              type="number"
              step="0.01"
              value={targetCPI}
              onChange={(e) => setTargetCPI(parseFloat(e.target.value))}
              className="w-full mb-4 p-2 border rounded"
            />

            <button
              onClick={handleCalculate}
              className="cursor-pointer w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Calculate Required SPI
            </button>

            {requiredSPI && (
              <div className="mt-6 text-center">
                <p className="text-gray-800 mb-1">
                  Required SPI in Semester {latestSemester + 1}:
                </p>
                <p className="text-2xl font-bold text-blue-700">
                  {requiredSPI}
                </p>
              </div>
            )}

            {requiredSPI && (
              <div className="bg-white rounded-xl shadow p-6 mt-10">
                <h3 className="text-xl font-semibold text-blue-700 mb-4">
                  📘 Partial Grade Planner
                </h3>
                <p className="text-gray-600 mb-6">
                  Fill in known grades for some subjects. We'll compute the{" "}
                  <span className="font-semibold">minimum required grades</span>{" "}
                  to meet your target SPI of{" "}
                  <span className="text-blue-600 font-bold">{requiredSPI}</span>
                  .
                </p>

                <div className="grid grid-cols-3 gap-4 font-semibold text-gray-800 border-b pb-2 mb-2">
                  <div>Course Name</div>
                  <div className="text-center">Credits</div>
                  <div className="text-center">Your Grade (if known)</div>
                </div>

                <div className="space-y-2">
                  {(courseMap[branch]?.[latestSemester + 1] || []).map(
                    (course, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-3 gap-4 items-center py-2 border-b last:border-b-0"
                      >
                        <div className="text-gray-700">{course.name}</div>
                        <div className="text-center text-gray-600">
                          {course.credits}
                        </div>
                        <div className="flex justify-center">
                          <input
                            type="text"
                            className="w-24 border p-1 rounded text-center"
                            placeholder="Grade"
                            value={partialInputs[course.name] || ""}
                            onChange={(e) =>
                              setPartialInputs((prev) => ({
                                ...prev,
                                [course.name]: e.target.value.toUpperCase(),
                              }))
                            }
                          />
                        </div>
                      </div>
                    )
                  )}
                </div>

                <button
                  onClick={() => {
                    const known = [];
                    const unknown = [];

                    for (const course of courseMap[branch][
                      latestSemester + 1
                    ]) {
                      const grade = partialInputs[course.name];
                      if (grade && gradePoints[grade]) {
                        known.push({ ...course, grade });
                      } else {
                        unknown.push(course);
                      }
                    }

                    const result = dpMinGradeSolver(
                      known,
                      unknown,
                      requiredSPI
                    );

                    if (result === null) {
                      setCalcError(
                        "❌ It's impossible to reach your target SPI with these constraints."
                      );
                      setGradeResult(null);
                    } else {
                      setCalcError(null);
                      setGradeResult(
                        unknown.map((c, i) => ({
                          name: c.name,
                          grade: result[i],
                        }))
                      );
                    }
                  }}
                  className="cursor-pointer mt-6 py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Calculate Minimum Grades
                </button>

                {calcError && (
                  <p className="mt-4 text-red-600 font-medium">{calcError}</p>
                )}

                {gradeResult && (
                  <>
                    <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="text-lg font-semibold mb-2 text-green-800">
                        📊 Minimum Grades Required:
                      </h4>
                      <ul className="list-disc pl-6 text-gray-700">
                        {gradeResult.map((r, idx) => (
                          <li key={idx}>
                            {r.name}:{" "}
                            <span className="font-bold text-blue-700">
                              {r.grade}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      onClick={handleSaveTarget}
                      disabled={saving}
                      className={`cursor-pointer mt-4 px-4 py-2 text-white rounded ${
                        saving
                          ? "bg-yellow-300 cursor-not-allowed"
                          : "bg-yellow-500 hover:bg-yellow-600"
                      }`}
                    >
                      {saving ? "Saving..." : "📌 Save as Upcoming Target"}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TargetPlanner;
