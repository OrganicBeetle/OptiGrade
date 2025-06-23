import { doc, deleteDoc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../utils/firebase'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import { useState } from 'react'

const DeleteSemester = ({ semester, onDeleted, onClose }) => {
  const { user } = useAuth()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (isDeleting) return
    setIsDeleting(true)

    try {
      // Delete the semester document
      const ref = doc(db, 'semesters', user.uid, 'data', String(semester.semester))
      await deleteDoc(ref)

      // Fetch and update semesterCount in user's doc
      const userRef = doc(db, 'users', user.uid)
      const userSnap = await getDoc(userRef)
      if (userSnap.exists()) {
        const currentCount = userSnap.data().semesterCount || 0
        await updateDoc(userRef, {
          semesterCount: Math.max(0, currentCount - 1)
        })
      }

      toast.success(`Semester ${semester.semester} deleted successfully!`)

      // Optional: Refresh the full page after deletion
      setTimeout(() => window.location.reload(), 1000)
      if (onDeleted) onDeleted()
    } catch (err) {
      toast.error('Failed to delete semester')
      console.error('Delete error:', err)
      setIsDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="p-6 bg-white rounded-xl shadow-xl max-w-xl mx-auto">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Delete Semester {semester.semester}?</h2>
        <p className="text-gray-600 mb-6">
          Are you sure you want to permanently delete this semester and all its data?
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
              isDeleting ? 'bg-red-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeleteSemester
