import { doc, deleteDoc } from "firebase/firestore"
import { db } from "../utils/firebase"
import { toast } from "react-toastify"
import { useAuth } from "../context/AuthContext"
import { useState } from "react"

const DeleteTarget = ({ target, onDeleted, onClose }) => {
  const { user } = useAuth()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (isDeleting) return
    setIsDeleting(true)

    try {
      const ref = doc(db, "users", user.uid, "targets", target.id)
      await deleteDoc(ref)

      toast.success(`Target for Semester ${target.semester} deleted!`)
      if (onDeleted) onDeleted()
    } catch (err) {
      toast.error("Failed to delete target")
      console.error("Delete error:", err)
      setIsDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-md"></div>
      <div className="relative p-8 m-4 bg-white rounded-2xl shadow-xl max-w-lg w-full z-10 overflow-y-auto max-h-[80vh]">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Delete Target for Semester {target.semester}?
        </h2>
        <p className="text-gray-600 mb-6">
          Are you sure you want to permanently delete this upcoming target plan?
        </p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded border border-gray-400 text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className={`px-4 py-2 rounded text-white ${
              isDeleting
                ? "bg-red-300 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeleteTarget
