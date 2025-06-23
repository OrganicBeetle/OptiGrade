import { useEffect, useRef } from "react";
import { RiCloseLine } from "react-icons/ri";

const AddSemester = ({
  showForm,
  setShowForm,
  selectedSemester,
  setSelectedSemester,
  gradeInputs,
  setGradeInputs,
  branchCourses,
  gradePoints,
  user,
  db,
  toast,
  setSemesters,
  setGpaStats,
  computeGPA,
  SemesterSubmitButton,
}) => {
  const modalRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    if (!showForm) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line
  }, [showForm]);

  // Reset modal state and close
  const handleClose = () => {
    setShowForm(false);
    setSelectedSemester(null);
    setGradeInputs({});
  };

  // Overlay click to close
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!showForm) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center"
      onClick={handleOverlayClick}
      tabIndex={-1}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-md"></div>
      <div
        ref={modalRef}
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-8 mt-24 z-10 overflow-y-auto max-h-[80vh]"
        tabIndex={0}
      >
        {/* Close (X) Icon */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition cursor-pointer"
          aria-label="Close"
        >
          <RiCloseLine size={28} />
        </button>
        <form
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            Add Semester Grades
          </h3>
          <label className="block text-gray-700 mb-2">
            Select Semester:
          </label>
          <select
            className="w-full border p-2 rounded mb-4"
            value={selectedSemester || ""}
            onChange={(e) => {
              const val = e.target.value;
              if (!val) {
                setSelectedSemester(null);
                setGradeInputs({});
                return;
              }
              const sem = parseInt(val);
              setSelectedSemester(sem);
              setGradeInputs(
                branchCourses[sem]?.reduce((acc, course) => {
                  acc[course.name] = "";
                  return acc;
                }, {}) || {}
              );
            }}
          >
            <option value="">-- Choose Semester --</option>
            {Object.keys(branchCourses).map((sem) => (
              <option key={sem} value={sem}>
                Semester {sem}
              </option>
            ))}
          </select>

          {/* Course Inputs */}
          {selectedSemester && branchCourses[selectedSemester] && (
            <div className="mt-6">
              <div className="grid grid-cols-3 gap-4 font-semibold text-gray-800 border-b pb-2 mb-2">
                <div>Course Name</div>
                <div className="text-center">Credits</div>
                <div className="text-center">Grade</div>
              </div>

              <div className="space-y-2">
                {branchCourses[selectedSemester].map((course, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-3 gap-4 items-center py-2 border-b"
                  >
                    <div>{course.name}</div>
                    <div className="text-center">{course.credits}</div>
                    <input
                      type="text"
                      className="w-24 border p-1 rounded text-center mx-auto"
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

              {/* Submit Button */}
              <SemesterSubmitButton
                selectedSemester={selectedSemester}
                courseMap={branchCourses}
                gradeInputs={gradeInputs}
                gradePoints={gradePoints}
                user={user}
                db={db}
                toast={toast}
                setShowForm={setShowForm}
                setSelectedSemester={setSelectedSemester}
                setGradeInputs={setGradeInputs}
                setSemesters={setSemesters}
                setGpaStats={setGpaStats}
                computeGPA={computeGPA}
              />
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default AddSemester;
