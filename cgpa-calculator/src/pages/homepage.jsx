import { useAuth } from "../context/AuthContext";
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  query,
  doc,
  getDoc,
  where,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import Header from "../components/header";
import { courseMap } from "../utils/CourseMap";
import SemesterSubmitButton from "../components/SemesterSubmitButton";
import EditSemester from "../components/EditSemester";
import DeleteSemester from "../components/DeleteSemester";
import { toast } from "react-toastify";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { useUpcomingTargets } from "../components/useUpcomingTargets.jsx";
import DeleteTarget from "../components/DeleteTarget.jsx";
import EditTarget from "../components/EditTarget.jsx";
import useBodyScrollLock from "../utils/DisableBodyScroll.jsx";
import AddSemester from "../components/AddSemester.jsx";

ChartJS.register(
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

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
const gradeLabels = {
  10: "A",
  9: "A-",
  8: "B",
  7: "B-",
  6: "C",
  5: "C-",
  4: "D",
  0: "F",
};

const computeGPA = (semesters) => {
  let totalCredits = 0,
    totalPoints = 0;
  for (const sem of semesters) {
    for (const course of sem.courses) {
      const gp = gradePoints[course.grade] ?? 0;
      totalPoints += gp * course.credits;
      totalCredits += course.credits;
    }
  }

  const latest = semesters[semesters.length - 1];
  let sgpa = 0;
  if (latest) {
    let c = 0,
      p = 0;
    for (const course of latest.courses) {
      const gp = gradePoints[course.grade] ?? 0;
      p += gp * course.credits;
      c += course.credits;
    }
    sgpa = c ? (p / c).toFixed(2) : 0;
  }

  const cgpa = totalCredits ? (totalPoints / totalCredits).toFixed(2) : 0;
  return { cgpa, sgpa };
};

const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gpaStats, setGpaStats] = useState({ cgpa: 0, sgpa: 0 });
  const [showForm, setShowForm] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [gradeInputs, setGradeInputs] = useState({});
  const [spi, setSpi] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeSemester, setActiveSemester] = useState(null);
  const [branch, setBranch] = useState(null);
  const [activeTarget, setActiveTarget] = useState(null);
  const [modalScrollY, setModalScrollY] = useState(0);
  const [globalAvgSPI, setGlobalAvgSPI] = useState([]);
  const [leaderSPI, setLeaderSPI] = useState([]);

  const branchCourses = useMemo(() => courseMap[branch] || {}, [branch]);
  const upcomingTargets = useUpcomingTargets(user?.uid);

  useBodyScrollLock(showForm);

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }

    const fetchUserData = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setBranch(userSnap.data().branch);
        }

        const semRef = collection(db, "semesters", user.uid, "data");
        const q = query(semRef);
        const snap = await getDocs(q);
        const sems = [];
        snap.forEach((doc) => sems.push(doc.data()));
        sems.sort((a, b) => a.semester - b.semester);

        setSemesters(sems);
        setGpaStats(computeGPA(sems));
      } catch (err) {
        console.error("Failed to fetch user/semester data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user, navigate]);

  useEffect(() => {
    if (!selectedSemester || Object.values(gradeInputs).includes("")) {
      setSpi(null);
      return;
    }

    const courses = branchCourses[selectedSemester];
    let totalCredits = 0,
      totalPoints = 0;

    for (const course of courses) {
      const grade = gradeInputs[course.name];
      const gp = gradePoints[grade];
      if (gp === undefined) {
        setSpi(null);
        return;
      }
      totalCredits += course.credits;
      totalPoints += gp * course.credits;
    }

    setSpi((totalPoints / totalCredits).toFixed(2));
  }, [gradeInputs, selectedSemester, branchCourses]);

  useEffect(() => {
    if (!user) return;

    const fetchGlobalStats = async () => {
      try {
        // Get current user's year and branch
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) return;
        const { year: myYear, branch: myBranch } = userSnap.data();

        // Fetch all public users of same year and branch
        const q = query(
          collection(db, "users"),
          where("isPublic", "==", true),
          where("year", "==", myYear),
          where("branch", "==", myBranch)
        );
        const snapshot = await getDocs(q);

        // For each user, fetch their semesters and compute SPI array and CGPA
        const usersData = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            const semSnap = await getDocs(
              collection(db, "semesters", docSnap.id, "data")
            );
            const sems = semSnap.docs
              .map((d) => d.data())
              .sort((a, b) => a.semester - b.semester);
            return {
              id: docSnap.id,
              semesters: sems,
              cgpa:
                sems.reduce(
                  (acc, s) =>
                    acc +
                    (s.courses?.reduce((a, c) => a + c.credits, 0) || 0) *
                      parseFloat(s.spi),
                  0
                ) /
                  sems.reduce(
                    (acc, s) =>
                      acc +
                      (s.courses?.reduce((a, c) => a + c.credits, 0) || 0),
                    0
                  ) || 0,
            };
          })
        );

        // Compute average SPI per semester
        const maxSem = Math.max(...usersData.map((u) => u.semesters.length));
        const avgSPI = Array(maxSem).fill(0);
        const counts = Array(maxSem).fill(0);

        usersData.forEach((user) => {
          user.semesters.forEach((sem, idx) => {
            avgSPI[idx] += parseFloat(sem.spi);
            counts[idx]++;
          });
        });

        const avgSPIResult = avgSPI.map((sum, i) =>
          counts[i] ? sum / counts[i] : null
        );

        // Find leader (highest CGPA)
        const leaderUser =
          usersData.reduce((a, b) => (a.cgpa > b.cgpa ? a : b), usersData[0]) ||
          {};
        const leaderSPIResult = leaderUser.semesters
          ? leaderUser.semesters.map((s) => parseFloat(s.spi))
          : [];

        setGlobalAvgSPI(avgSPIResult);
        setLeaderSPI(leaderSPIResult);
      } catch (err) {
        setGlobalAvgSPI([]);
        setLeaderSPI([]);
      }
    };

    fetchGlobalStats();
  }, [user]);

  const spiTrendData = {
    labels: semesters.map((s) => `Sem ${s.semester}`),
    datasets: [
      {
        label: "Your SPI",
        data: semesters.map((s) => parseFloat(s.spi)),
        borderColor: "#3b82f6",
        backgroundColor: "#3b82f6",
        borderWidth: 3,
        tension: 0.3,
      },
      {
        label: "Avg SPI (Global)",
        data: globalAvgSPI.slice(0, semesters.length),
        borderColor: "#fbbf24",
        backgroundColor: "#fbbf24",
        borderDash: [5, 5],
        borderWidth: 2,
        tension: 0.3,
      },
      {
        label: "Topper SPI",
        data: leaderSPI.slice(0, semesters.length),
        borderColor: "#ef4444",
        backgroundColor: "#ef4444",
        borderDash: [2, 3],
        borderWidth: 2,
        tension: 0.3,
      },
    ],
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="animate-spin rounded-full h-14 w-14 border-t-4 border-blue-500 border-solid"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="flex flex-col md:flex-row items-center justify-between bg-white rounded-3xl shadow-lg p-8 mb-8 relative overflow-hidden">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <div className="bg-blue-100 p-2 rounded-full"></div>
              <h1 className="text-3xl md:text-3xl font-bold text-gray-900">
                Greetings!
              </h1>
            </div>
            <div className="text-lg text-gray-600">
              Your current{" "}
              <span className="font-semibold text-blue-600">CPI</span> is
              <span className="text-4xl font-bold text-blue-700 ml-2">
                {gpaStats.cgpa}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              setModalScrollY(window.scrollY);
              setShowForm(true);
            }}
            className="cursor-pointer mt-6 md:mt-0 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-semibold shadow-lg transition"
          >
            + Add Semester
          </button>
          {/* Decorative background blob */}
          <div className="absolute right-0 bottom-0 w-56 h-56 bg-blue-100 rounded-full opacity-30 blur-3xl pointer-events-none"></div>
        </section>
        {/* SPI Trend Chart */}
        <section className="bg-white rounded-3xl shadow-md p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-2xl font-semibold text-gray-800">SPI Trend</h2>
          </div>
          {spiTrendData.labels.length === 0 ? (
            <div className="h-12vh flex items-center justify-center text-gray-500 italic">
              No semester data available to display SPI trend.
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center">
              <Line
                data={spiTrendData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { display: true },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => `SPI: ${ctx.raw}`,
                      },
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      suggestedMax: 10,
                      ticks: { stepSize: 1 },
                    },
                  },
                }}
              />
            </div>
          )}
        </section>
        {/* Add Semester Modal */}
        <AddSemester
          showForm={showForm}
          setShowForm={setShowForm}
          selectedSemester={selectedSemester}
          setSelectedSemester={setSelectedSemester}
          gradeInputs={gradeInputs}
          setGradeInputs={setGradeInputs}
          branchCourses={branchCourses}
          gradePoints={gradePoints}
          user={user}
          db={db}
          toast={toast}
          setSemesters={setSemesters}
          setGpaStats={setGpaStats}
          computeGPA={computeGPA}
          SemesterSubmitButton={SemesterSubmitButton}
        />
        {/* Semester Cards */}
        <section>
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            Your Semesters
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {semesters.map((sem, idx) => (
              <div
                key={idx}
                className="bg-white shadow-lg rounded-2xl p-6 hover:shadow-2xl transition-shadow group relative"
              >
                <h4 className="font-bold text-lg text-blue-700 mb-2">
                  Semester {sem.semester}
                </h4>
                <p className="text-sm text-gray-500 mb-2">
                  SPI:{" "}
                  <span className="font-semibold text-green-700 text-xl">
                    {sem.spi}
                  </span>
                </p>
                <ul className="space-y-2">
                  {sem.courses.map((course, cidx) => (
                    <li
                      key={cidx}
                      className="flex justify-between text-gray-700"
                    >
                      <span>{course.name}</span>
                      <span className="font-semibold">
                        {gradeLabels[+course.grade] || course.grade}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-end gap-3 mt-4 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => {
                      setActiveSemester(sem);
                      setShowEditModal(true);
                    }}
                    className="cursor-pointer flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setActiveSemester(sem);
                      setShowDeleteModal(true);
                    }}
                    className="cursor-pointer flex items-center gap-1 text-red-600 hover:text-red-800 font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
        {/* Modals for Edit/Delete */}
        {showEditModal && (
          <>
            {activeSemester && (
              <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-xl">
                  <EditSemester
                    semester={activeSemester}
                    onClose={() => {
                      setShowEditModal(false);
                      setActiveSemester(null);
                    }}
                    onUpdate={(updatedSemesters) => {
                      setSemesters(updatedSemesters);
                      setGpaStats(computeGPA(updatedSemesters));
                    }}
                  />
                </div>
              </div>
            )}
            {showEditModal && activeTarget && (
              <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50">
                <EditTarget
                  key={activeTarget.id}
                  target={activeTarget}
                  onClose={() => {
                    setShowEditModal(false);
                    setActiveTarget(null);
                  }}
                  onSaved={() => {
                    setShowEditModal(false);
                    setActiveTarget(null);
                  }}
                />
              </div>
            )}
          </>
        )}
        {showDeleteModal && (
          <>
            {activeSemester && (
              <div className="fixed inset-0 bg-gray bg-opacity-40 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md">
                  <DeleteSemester
                    semester={activeSemester}
                    onClose={() => {
                      setShowDeleteModal(false);
                      setActiveSemester(null);
                    }}
                    onDelete={(updatedSemesters) => {
                      setSemesters(updatedSemesters);
                      setGpaStats(computeGPA(updatedSemesters));
                    }}
                  />
                </div>
              </div>
            )}

            {activeTarget && (
              <div className="relative w-full z-40">
                <div className="max-w-md mx-auto mt-10 bg-white p-6 rounded-xl shadow-xl border border-gray-200">
                  <DeleteTarget
                    target={activeTarget}
                    onClose={() => {
                      setShowDeleteModal(false);
                      setActiveTarget(null);
                    }}
                    onDeleted={() => {
                      setShowDeleteModal(false);
                      setActiveTarget(null);
                    }}
                  />
                </div>
              </div>
            )}
          </>
        )}
        {/* Planner */}
        <section
          onClick={() => navigate("/planner")}
          className="mt-12 cursor-pointer bg-gradient-to-r from-blue-100 to-blue-200 shadow-lg rounded-2xl p-6 flex flex-col justify-center items-center hover:shadow-2xl transition-shadow border-2 border-dashed border-blue-400"
        >
          <h4 className="text-blue-600 text-xl font-semibold mb-2">
            🎯 Plan Target CPI/SPI
          </h4>
          <p className="text-sm text-gray-600 text-center">
            Calculate the SPI you need next semester to reach your goal.
          </p>
        </section>
        {/* Upcoming Targets */}
        <hr className="my-8 border-gray-200" />
        {upcomingTargets.length > 0 && (
          <section className="mt-8">
            <h3 className="text-2xl font-semibold text-blue-800 mb-4">
              📌 Upcoming Target Plan
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingTargets.map((target, idx) => (
                <div
                  key={idx}
                  className="bg-yellow-50 shadow-md rounded-2xl p-5 border border-yellow-200"
                >
                  <h4 className="font-bold text-lg text-yellow-800 mb-2">
                    Semester {target.semester}
                  </h4>
                  <p className="text-sm text-gray-700 mb-2">
                    Target SPI:{" "}
                    <span className="font-semibold text-green-700 text-lg">
                      {target.targetSPI}
                    </span>
                  </p>
                  <ul className="space-y-1">
                    {target.courses.map((course, i) => (
                      <li
                        key={i}
                        className="flex justify-between text-gray-800 text-sm"
                      >
                        <span>{course.name}</span>
                        <span className="font-semibold">{course.grade}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex justify-end gap-3 mt-4">
                    <button
                      onClick={() => {
                        setActiveTarget(target);
                        setActiveSemester(null);
                        setShowEditModal(true);
                      }}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setActiveTarget(target);
                        setActiveSemester(null);
                        setShowDeleteModal(true);
                      }}
                      className="flex items-center gap-1 text-red-600 hover:text-red-800 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default HomePage;
