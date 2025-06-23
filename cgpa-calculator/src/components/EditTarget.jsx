import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";

const EditTarget = ({ target, onClose, onSaved }) => {
  const { user } = useAuth();
  const [targetSPI, setTargetSPI] = useState(target.targetSPI);
  const [courses, setCourses] = useState([...target.courses]);
  const [saving, setSaving] = useState(false);

  const handleGradeChange = (index, value) => {
    const updated = [...courses];
    updated[index].grade = value.toUpperCase();
    setCourses(updated);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const ref = doc(db, "users", user.uid, "targets", target.id);
      await updateDoc(ref, {
        targetSPI,
        courses,
        updatedAt: new Date(),
      });
      toast.success("Target updated successfully!");
      onSaved();
    } catch (err) {
      toast.error("Error updating target");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-md"></div>
      <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full p-8 m-4 z-10 overflow-y-auto max-h-[80vh]">
        <h2 className="text-xl font-bold text-yellow-800 mb-4">
          ✏️ Edit Target for Semester {target.semester}
        </h2>

        <div className="mb-4">
          <label className="text-sm text-gray-700 font-medium">Target SPI</label>
          <input
            type="number"
            step="0.01"
            value={targetSPI}
            onChange={(e) => setTargetSPI(e.target.value)}
            className="w-full border p-2 rounded mt-1"
          />
        </div>

        <div className="space-y-2 mb-6">
          {courses.map((course, i) => (
            <div key={i} className="flex justify-between items-center">
              <span className="text-gray-800">{course.name}</span>
              <input
                type="text"
                value={course.grade}
                onChange={(e) => handleGradeChange(i, e.target.value)}
                className="w-20 border p-1 text-center rounded"
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className={`px-4 py-2 text-white rounded ${
              saving ? "bg-yellow-300" : "bg-yellow-600 hover:bg-yellow-700"
            }`}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditTarget;
